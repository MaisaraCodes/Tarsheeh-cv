"""POST /candidates — accepts PDFs, extracts text, runs analysis_graph, persists."""
import uuid
from io import BytesIO
from typing import List

import pdfplumber
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel

from backend.agents.graph import analysis_graph
from backend.models.job import JobProfile
from backend.utils.locale import pop_locale
from backend.utils.names import resolve_candidate_name
from backend.utils.supabase_client import get_supabase

router = APIRouter()


class CandidatesResponse(BaseModel):
    job_id: str
    candidates_queued: int
    status: str


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


@router.post("/candidates", response_model=CandidatesResponse)
def upload_candidates(
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

    try:
        result = analysis_graph.invoke({
            "job_id": job_id,
            "job_profile": job_profile,
            "candidates": candidates_state,
            "locale": locale,
        })
    except Exception as e:
        sb.table("candidates").update({"status": "error"}).eq("job_id", job_id).execute()
        raise HTTPException(status_code=500, detail=f"CV Analyzer Agent failure: {e}")

    analyses = result.get("all_cv_analyses") or []
    ranking = result.get("ranking_result")
    rank_lookup = {}
    if ranking:
        for rc in ranking.ranked_candidates:
            rank_lookup[rc.candidate_id] = {
                "rank": rc.rank,
                "summary": rc.summary,
                "name": rc.name,
                "score": rc.score,
            }

    for a in analyses:
        cid = a["candidate_id"]
        scorecard = a["analysis"]
        rank_info = rank_lookup.get(cid, {})
        sb.table("candidates").update({
            "scorecard": scorecard,
            "score": scorecard.get("score"),
            "ranking_position": rank_info.get("rank"),
            "status": "completed",
        }).eq("id", cid).execute()

    if ranking:
        ranked_payload = [rc.model_dump() for rc in ranking.ranked_candidates]
        existing = sb.table("job_results").select("job_id").eq("job_id", job_id).limit(1).execute()
        payload = {
            "job_id": job_id,
            "ranked_candidates": ranked_payload,
            "status": "ranking_complete",
        }
        if existing.data:
            sb.table("job_results").update(payload).eq("job_id", job_id).execute()
        else:
            sb.table("job_results").insert(payload).execute()

    return CandidatesResponse(
        job_id=job_id,
        candidates_queued=len(candidates_state),
        status="processing",
    )
