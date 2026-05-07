"""POST /job — runs the intake subgraph and persists the parsed profile.
   GET  /jobs/by-user/{user_id} — returns all jobs owned by a given user."""
import uuid
from typing import Any, Dict, List, Literal, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from backend.agents.graph import intake_graph
from backend.utils.locale import normalize_locale, stash_locale
from backend.utils.supabase_client import get_supabase

router = APIRouter()


# ── Request / response models ────────────────────────────────────────────────

class JobRequest(BaseModel):
    title: str
    description: str
    locale: Optional[Literal["en", "ar"]] = Field(
        default="en",
        description="Output language for downstream LLM agents and PDF report. 'en' or 'ar'.",
    )
    user_id: Optional[str] = None


class JobResponse(BaseModel):
    job_id: str
    status: str


class UserJobItem(BaseModel):
    job_id: str
    title: str
    status: str
    created_at: str
    parsed_profile: Optional[Dict[str, Any]] = None


class UserJobsResponse(BaseModel):
    jobs: List[UserJobItem]


# ── POST /job ────────────────────────────────────────────────────────────────

@router.post("/job", response_model=JobResponse)
def create_job(job: JobRequest):
    if not job.title or not job.title.strip():
        raise HTTPException(status_code=422, detail="title must not be empty")
    if not job.description or not job.description.strip():
        raise HTTPException(status_code=422, detail="description must not be empty")

    job_id = str(uuid.uuid4())
    locale = normalize_locale(job.locale)

    try:
        result = intake_graph.invoke({
            "job_id": job_id,
            "job_description": job.description,
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Intake Agent failure: {e}")

    profile = result.get("job_profile")
    profile_dict = profile.model_dump() if profile is not None else {}
    parsed_profile = stash_locale(profile_dict, locale)

    insert_payload: Dict[str, Any] = {
        "id": job_id,
        "title": job.title,
        "description": job.description,
        "parsed_profile": parsed_profile,
        "status": "candidates_pending",
    }
    if job.user_id is not None:
        insert_payload["user_id"] = job.user_id

    try:
        get_supabase().table("jobs").insert(insert_payload).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to persist job: {e}")

    return JobResponse(job_id=job_id, status="processing")


# ── GET /jobs/by-user/{user_id} ──────────────────────────────────────────────

@router.get("/jobs/by-user/{user_id}", response_model=UserJobsResponse)
def get_jobs_by_user(user_id: str):
    try:
        response = (
            get_supabase()
            .table("jobs")
            .select("id, title, status, created_at, parsed_profile")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .execute()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch jobs: {e}")

    rows = response.data or []
    jobs = [
        UserJobItem(
            job_id=row["id"],
            title=row["title"],
            status=row["status"],
            created_at=row["created_at"],
            parsed_profile=row.get("parsed_profile"),
        )
        for row in rows
    ]

    return UserJobsResponse(jobs=jobs)
