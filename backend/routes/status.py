"""GET /status/{job_id} — derive stage and progress from persisted state."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Literal

from backend.utils.supabase_client import get_supabase

router = APIRouter()


class StatusResponse(BaseModel):
    job_id: str
    stage: str
    progress: int
    status: Literal["processing", "complete", "failed"]


# Stage progression weights (sum to 100)
STAGE_PROGRESS = {
    "intake": 10,
    "cv_analyzer": 35,
    "ranking": 60,
    "interview": 80,
    "report": 95,
    "complete": 100,
}


@router.get("/status/{job_id}", response_model=StatusResponse)
def get_status(job_id: str):
    sb = get_supabase()

    job_row = sb.table("jobs").select("*").eq("id", job_id).limit(1).execute()
    if not job_row.data:
        raise HTTPException(status_code=404, detail="Job not found")
    job = job_row.data[0]

    candidates = sb.table("candidates").select("id,scorecard,interview_questions,status") \
        .eq("job_id", job_id).execute().data or []
    results_row = sb.table("job_results").select("*").eq("job_id", job_id).limit(1).execute()
    results = results_row.data[0] if results_row.data else None

    has_profile = bool(job.get("parsed_profile"))
    has_candidates = len(candidates) > 0
    has_analyses = has_candidates and any(c.get("scorecard") for c in candidates)
    has_ranking = bool(results and results.get("ranked_candidates"))
    has_questions = has_candidates and any(c.get("interview_questions") for c in candidates)
    has_report = bool(results and results.get("generated_pdf_url"))
    any_error = any(c.get("status") == "error" for c in candidates)

    if any_error:
        return StatusResponse(job_id=job_id, stage="cv_analyzer", progress=35, status="failed")

    if has_report:
        stage = "complete"
    elif has_questions:
        stage = "report"
    elif has_ranking:
        stage = "interview"
    elif has_analyses:
        stage = "ranking"
    elif has_candidates:
        stage = "cv_analyzer"
    elif has_profile:
        stage = "intake"
    else:
        stage = "intake"

    progress = STAGE_PROGRESS.get(stage, 0)
    status_value = "complete" if stage == "complete" else "processing"

    return StatusResponse(job_id=job_id, stage=stage, progress=progress, status=status_value)
