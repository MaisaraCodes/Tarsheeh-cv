"""GET /status/{job_id} — derive stage and progress from job_results.status.

Pipeline state is now published to a single column (`job_results.status`) by
the upload route's background worker, so this endpoint is one query — no more
joining candidates + jobs + job_results just to infer where we are.
"""
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


# Maps the value persisted in `job_results.status` to (UI-stage, progress%).
# `complete` is also accepted as an alias of `ranking_complete` because the
# report route flips status to "complete" once the PDF has been generated.
_STAGE_FROM_DB = {
    "screening":         ("cv_analyzer", 35,  "processing"),
    "ranking":           ("ranking",     60,  "processing"),
    "ranking_complete":  ("complete",    100, "complete"),
    "complete":          ("complete",    100, "complete"),
    "failed":            ("cv_analyzer", 35,  "failed"),
}


@router.get("/status/{job_id}", response_model=StatusResponse)
def get_status(job_id: str):
    sb = get_supabase()

    row = sb.table("job_results").select("status").eq("job_id", job_id).limit(1).execute()

    if not row.data:
        # No job_results row yet — could be a brand-new job (upload hasn't
        # finished writing the screening marker) or a bogus job_id. Hit the
        # `jobs` table to disambiguate so unknown ids 404 instead of looking
        # like an eternally-stuck pipeline.
        job_row = sb.table("jobs").select("id").eq("id", job_id).limit(1).execute()
        if not job_row.data:
            raise HTTPException(status_code=404, detail="Job not found")
        return StatusResponse(
            job_id=job_id, stage="intake", progress=10, status="processing",
        )

    db_status = (row.data[0].get("status") or "").lower()
    stage, progress, status_value = _STAGE_FROM_DB.get(
        db_status, ("cv_analyzer", 35, "processing"),
    )
    return StatusResponse(
        job_id=job_id, stage=stage, progress=progress, status=status_value,
    )
