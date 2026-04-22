"""GET /results/{job_id} — return the stored ranked candidate list."""
from typing import List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from backend.utils.supabase_client import get_supabase

router = APIRouter()


class RankedCandidateOut(BaseModel):
    candidate_id: str
    name: str
    score: int
    rank: int
    summary: str


class ResultsResponse(BaseModel):
    job_id: str
    ranked_candidates: List[RankedCandidateOut]


@router.get("/results/{job_id}", response_model=ResultsResponse)
def get_results(job_id: str):
    sb = get_supabase()

    job_row = sb.table("jobs").select("id").eq("id", job_id).limit(1).execute()
    if not job_row.data:
        raise HTTPException(status_code=404, detail="Job not found")

    results_row = sb.table("job_results").select("*").eq("job_id", job_id).limit(1).execute()
    if not results_row.data or not results_row.data[0].get("ranked_candidates"):
        raise HTTPException(status_code=409, detail="Results not ready, pipeline still processing")

    ranked = results_row.data[0]["ranked_candidates"]
    return ResultsResponse(
        job_id=job_id,
        ranked_candidates=[RankedCandidateOut(**rc) for rc in ranked],
    )
