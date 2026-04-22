"""GET /report/{job_id} — generate and stream the PDF hiring report."""
from uuid import UUID

from fastapi import APIRouter, HTTPException, Response

from backend.agents.graph import report_graph
from backend.utils.locale import pop_locale
from backend.utils.supabase_client import get_supabase

router = APIRouter()

# Marker stored in job_results.generated_pdf_url to signal the report has been
# successfully produced at least once. The column is VARCHAR(512), so we cannot
# stash the PDF bytes themselves — we regenerate on demand (fast, ~few hundred ms).
GENERATED_MARKER = "generated"


def _pdf_response(pdf_bytes: bytes, job_id: str) -> Response:
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="tarsheeh-report-{job_id}.pdf"',
        },
    )


@router.get("/report/{job_id}")
def get_report(job_id: UUID):
    job_id = str(job_id)
    sb = get_supabase()

    job_row = sb.table("jobs").select("*").eq("id", job_id).limit(1).execute()
    if not job_row.data:
        raise HTTPException(status_code=404, detail="Job not found")
    job = job_row.data[0]

    results_row = sb.table("job_results").select("*").eq("job_id", job_id).limit(1).execute()
    if not results_row.data or not results_row.data[0].get("ranked_candidates"):
        raise HTTPException(status_code=409, detail="Report not ready, pipeline still processing")

    results = results_row.data[0]
    ranked = results["ranked_candidates"]

    candidates = sb.table("candidates").select("id,scorecard,interview_questions") \
        .eq("job_id", job_id).execute().data or []
    candidate_details = {
        c["id"]: {
            "scorecard": c.get("scorecard"),
            "interview_questions": (c.get("interview_questions") or {}).get("questions")
                if isinstance(c.get("interview_questions"), dict) else c.get("interview_questions"),
        }
        for c in candidates
    }

    parsed_profile, locale = pop_locale(job.get("parsed_profile"))

    try:
        result = report_graph.invoke({
            "job_id": job_id,
            "job": {
                "title": job.get("title"),
                "description": job.get("description"),
                "parsed_profile": parsed_profile,
            },
            "ranked_candidates": ranked,
            "candidate_details": candidate_details,
            "locale": locale,
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Report Agent failure: {e}")

    pdf_bytes = result.get("pdf_bytes")
    if not pdf_bytes:
        raise HTTPException(status_code=500, detail="Report Agent produced no PDF bytes")

    try:
        sb.table("job_results").update({
            "generated_pdf_url": GENERATED_MARKER,
            "status": "complete",
        }).eq("job_id", job_id).execute()
    except Exception as e:
        print(f"[REPORT] warning: failed to update job_results marker: {e}")

    return _pdf_response(pdf_bytes, job_id)
