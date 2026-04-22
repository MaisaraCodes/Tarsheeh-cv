"""POST /job — runs ONLY the intake subgraph and persists the parsed profile."""
import uuid
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from backend.agents.graph import intake_graph
from backend.utils.supabase_client import get_supabase

router = APIRouter()


class JobRequest(BaseModel):
    title: str
    description: str


class JobResponse(BaseModel):
    job_id: str
    status: str


@router.post("/job", response_model=JobResponse)
def create_job(job: JobRequest):
    if not job.description or not job.description.strip():
        raise HTTPException(status_code=422, detail="description must not be empty")

    job_id = str(uuid.uuid4())

    try:
        result = intake_graph.invoke({
            "job_id": job_id,
            "job_description": job.description,
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Intake Agent failure: {e}")

    profile = result.get("job_profile")
    parsed_profile = profile.model_dump() if profile is not None else None

    try:
        get_supabase().table("jobs").insert({
            "id": job_id,
            "title": job.title,
            "description": job.description,
            "parsed_profile": parsed_profile,
            "status": "candidates_pending",
        }).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to persist job: {e}")

    return JobResponse(job_id=job_id, status="processing")
