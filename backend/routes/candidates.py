"""POST /candidates — accepts PDFs, runs analysis in the background, persists state.

GET /candidates/{candidate_id} — slim per-candidate fetch for the detail page
(used to avoid redownloading the full ranked-results list just to render one).
"""
import uuid
from io import BytesIO
from typing import List, Optional

import pdfplumber
from fastapi import APIRouter, BackgroundTasks, HTTPException, UploadFile, File, Form
from pydantic import BaseModel

from backend.agents.graph import run_analyzer, run_ranker
from backend.models.job import JobProfile
from backend.utils.locale import pop_locale
from backend.utils.names import resolve_candidate_name
from backend.utils.supabase_client import get_supabase

router = APIRouter()


# Pipeline stage values written to job_results.status. Read by /status to drive
# the processing page's gradual-progress UI.
STAGE_SCREENING = "screening"           # analyzer running
STAGE_RANKING = "ranking"               # ranker running
STAGE_COMPLETE = "ranking_complete"     # done
STAGE_FAILED = "failed"


class CandidatesResponse(BaseModel):
    job_id: str
    candidates_queued: int
    status: str


class CandidateDetailResponse(BaseModel):
    candidate_id: str
    job_id: str
    name: str
    score: int
    rank: int
    summary: str


def _extract_pdf_text(data: bytes, filename: str) -> str:
    try:
        with pdfplumber.open(BytesIO(data)) as pdf:
            parts = [p.extract_text() or "" for p in pdf.pages]
        text = "\n\n".join(parts).strip()
        if not text:
            raise ValueError("Empty text extracted")
        return text
    except Exception as e:
        raise HTTPException(status_code=415, detail=f"Could not parse PDF '{filename}': {e}")


def _upsert_job_results(sb, job_id: str, payload: dict) -> None:
    """Insert-or-update a job_results row. Used to publish stage transitions."""
    existing = sb.table("job_results").select("job_id").eq("job_id", job_id).limit(1).execute()
    full_payload = {"job_id": job_id, **payload}
    if existing.data:
        sb.table("job_results").update(payload).eq("job_id", job_id).execute()
    else:
        sb.table("job_results").insert(full_payload).execute()


def _run_analysis_pipeline(
    job_id: str,
    job_profile: JobProfile,
    candidates_state: List[dict],
    locale: str,
) -> None:
    """Background worker: run analyzer → ranker, publishing stage transitions.

    Writes intermediate `status` values to job_results so the /status endpoint
    (and thus the processing page) sees real progress instead of inferring it
    from which tables happen to be populated.
    """
    sb = get_supabase()
    base_state = {
        "job_id": job_id,
        "job_profile": job_profile,
        "candidates": candidates_state,
        "locale": locale,
    }

    # Analyzer first — this is the slow step (parallel LLM scoring). Publish
    # the `ranking` stage AFTER analyzer completes but BEFORE ranker runs so
    # the processing UI sees a real stage transition (the prior single-graph
    # invoke meant `ranking` was published only after ranker had also finished,
    # making it virtually invisible to a 2-second poll).
    try:
        analyzer_out = run_analyzer(base_state)
    except Exception as e:
        print(f"[PIPELINE] analyzer failure for job {job_id}: {e}")
        try:
            sb.table("candidates").update({"status": "error"}).eq("job_id", job_id).execute()
        except Exception:
            pass
        try:
            _upsert_job_results(sb, job_id, {"status": STAGE_FAILED, "ranked_candidates": []})
        except Exception:
            pass
        return

    analyses = analyzer_out.get("all_cv_analyses") or []

    try:
        _upsert_job_results(sb, job_id, {"status": STAGE_RANKING})
    except Exception as e:
        print(f"[PIPELINE] warning: could not publish ranking stage: {e}")

    try:
        ranker_out = run_ranker({**base_state, "all_cv_analyses": analyses})
    except Exception as e:
        print(f"[PIPELINE] ranker failure for job {job_id}: {e}")
        try:
            _upsert_job_results(sb, job_id, {"status": STAGE_FAILED})
        except Exception as inner:
            print(f"[PIPELINE] also failed to publish failed-state for {job_id}: {inner}")
        return

    ranking = ranker_out.get("ranking_result")

    rank_lookup = {}
    if ranking:
        for rc in ranking.ranked_candidates:
            rank_lookup[rc.candidate_id] = {"rank": rc.rank}

    write_failures = 0
    for a in analyses:
        cid = a["candidate_id"]
        scorecard = a["analysis"]
        rank_info = rank_lookup.get(cid, {})
        try:
            sb.table("candidates").update({
                "scorecard": scorecard,
                "score": scorecard.get("score"),
                "ranking_position": rank_info.get("rank"),
                "status": "completed",
            }).eq("id", cid).execute()
        except Exception as e:
            write_failures += 1
            print(f"[PIPELINE] warning: failed to persist candidate {cid}: {e}")

    if not ranking:
        _upsert_job_results(sb, job_id, {"status": STAGE_FAILED})
        return

    ranked_payload = [rc.model_dump() for rc in ranking.ranked_candidates]
    try:
        _upsert_job_results(sb, job_id, {
            "ranked_candidates": ranked_payload,
            "status": STAGE_COMPLETE,
        })
    except Exception as e:
        print(f"[PIPELINE] failed to persist ranked_candidates for {job_id}: {e}")
        _upsert_job_results(sb, job_id, {"status": STAGE_FAILED})
        return

    if write_failures:
        # Pipeline succeeded overall, but some per-candidate writes failed —
        # surface that so the issue is visible in logs (and queryable on the
        # candidates table by status != 'completed').
        print(
            f"[PIPELINE] degraded completion for job {job_id}: "
            f"{write_failures}/{len(analyses)} candidate rows failed to persist "
            f"(ranked_candidates payload still saved)."
        )


@router.post("/candidates", response_model=CandidatesResponse)
def upload_candidates(
    background_tasks: BackgroundTasks,
    job_id: str = Form(...),
    files: List[UploadFile] = File(...),
):
    if not files:
        raise HTTPException(status_code=400, detail="At least one CV file is required")

    sb = get_supabase()

    job_row = sb.table("jobs").select("*").eq("id", job_id).limit(1).execute()
    if not job_row.data:
        raise HTTPException(status_code=400, detail="Invalid or unrecognised job_id")
    job = job_row.data[0]
    parsed_profile_raw = job.get("parsed_profile")
    if not parsed_profile_raw:
        raise HTTPException(status_code=409, detail="Job has no parsed profile yet")

    parsed_profile, locale = pop_locale(parsed_profile_raw)
    try:
        job_profile = JobProfile(**parsed_profile)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Stored job profile is invalid: {e}")

    candidates_state: List[dict] = []
    inserted_rows: List[dict] = []
    for upload in files:
        if not (upload.content_type or "").lower().startswith("application/pdf") \
                and not upload.filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=415, detail=f"Unsupported file type: {upload.filename}")
        raw = upload.file.read()
        cv_text = _extract_pdf_text(raw, upload.filename)
        cid = str(uuid.uuid4())
        name = resolve_candidate_name(cv_text, upload.filename)
        candidates_state.append({"id": cid, "name": name, "cv_text": cv_text})
        inserted_rows.append({
            "id": cid,
            "job_id": job_id,
            "file_name": upload.filename,
            "cv_text": cv_text,
            "status": "pending_analysis",
        })

    try:
        sb.table("candidates").insert(inserted_rows).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to persist candidates: {e}")

    # Publish "screening" stage *before* returning so the very first poll from
    # the frontend sees real pipeline state instead of falling through to the
    # default intake stage.
    try:
        _upsert_job_results(sb, job_id, {"status": STAGE_SCREENING, "ranked_candidates": []})
    except Exception as e:
        print(f"[CANDIDATES] warning: failed to publish screening stage: {e}")

    background_tasks.add_task(
        _run_analysis_pipeline, job_id, job_profile, candidates_state, locale,
    )

    return CandidatesResponse(
        job_id=job_id,
        candidates_queued=len(candidates_state),
        status="processing",
    )


@router.get("/candidates/{candidate_id}", response_model=CandidateDetailResponse)
def get_candidate(candidate_id: str, job_id: Optional[str] = None):
    """Return one candidate's ranked entry. Slim alternative to /results.

    The candidate detail page used to fetch the entire job's ranked list just
    to find one row. This endpoint reads the same job_results row but returns
    only the matching entry, keeping the wire payload small.
    """
    sb = get_supabase()

    if not job_id:
        cand_row = sb.table("candidates").select("job_id").eq("id", candidate_id).limit(1).execute()
        if not cand_row.data:
            raise HTTPException(status_code=404, detail="Candidate not found")
        job_id = cand_row.data[0]["job_id"]

    results_row = sb.table("job_results").select("ranked_candidates") \
        .eq("job_id", job_id).limit(1).execute()
    if not results_row.data or not results_row.data[0].get("ranked_candidates"):
        raise HTTPException(status_code=409, detail="Candidate not ready, pipeline still processing")

    for rc in results_row.data[0]["ranked_candidates"]:
        if rc.get("candidate_id") == candidate_id:
            return CandidateDetailResponse(
                candidate_id=candidate_id,
                job_id=job_id,
                name=rc.get("name") or "Unnamed candidate",
                score=int(rc.get("score") or 0),
                rank=int(rc.get("rank") or 0),
                summary=rc.get("summary") or "",
            )
    raise HTTPException(status_code=404, detail="Candidate not in ranked results")
