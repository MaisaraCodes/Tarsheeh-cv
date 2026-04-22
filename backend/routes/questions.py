"""GET /questions/{candidate_id} — generate (lazily) and return interview questions."""
from typing import List
from uuid import UUID

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from backend.agents.graph import interview_graph
from backend.models.job import JobProfile
from backend.models.cv import CVAnalysisResult
from backend.utils.locale import pop_locale
from backend.utils.names import resolve_candidate_name
from backend.utils.supabase_client import get_supabase

router = APIRouter()


class QuestionsResponse(BaseModel):
    candidate_id: str
    job_id: str
    questions: List[str]


@router.get("/questions/{candidate_id}", response_model=QuestionsResponse)
def get_questions(candidate_id: UUID):
    candidate_id = str(candidate_id)
    sb = get_supabase()

    cand_row = sb.table("candidates").select("*").eq("id", candidate_id).limit(1).execute()
    if not cand_row.data:
        raise HTTPException(status_code=404, detail="Candidate not found")
    candidate = cand_row.data[0]
    job_id = candidate.get("job_id")

    existing = candidate.get("interview_questions")
    if existing:
        questions = existing if isinstance(existing, list) else existing.get("questions", [])
        if questions:
            return QuestionsResponse(candidate_id=candidate_id, job_id=job_id, questions=questions)

    scorecard = candidate.get("scorecard")
    if not scorecard:
        raise HTTPException(status_code=409, detail="Questions not ready, pipeline still processing")

    job_row = sb.table("jobs").select("parsed_profile").eq("id", job_id).limit(1).execute()
    if not job_row.data or not job_row.data[0].get("parsed_profile"):
        raise HTTPException(status_code=409, detail="Job profile not available")

    parsed_profile, locale = pop_locale(job_row.data[0]["parsed_profile"])
    try:
        job_profile = JobProfile(**parsed_profile)
        cv_analysis = CVAnalysisResult(**scorecard)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Stored data invalid: {e}")

    candidate_name = "the candidate"
    results_row = sb.table("job_results").select("ranked_candidates").eq("job_id", job_id).limit(1).execute()
    if results_row.data and results_row.data[0].get("ranked_candidates"):
        for rc in results_row.data[0]["ranked_candidates"]:
            if rc.get("candidate_id") == candidate_id and rc.get("name"):
                candidate_name = rc["name"]
                break
    if candidate_name == "the candidate":
        resolved = resolve_candidate_name(
            candidate.get("cv_text") or "",
            candidate.get("file_name") or "",
        )
        if resolved and resolved != "Unnamed candidate":
            candidate_name = resolved

    try:
        result = interview_graph.invoke({
            "candidate_id": candidate_id,
            "candidate_name": candidate_name,
            "job_profile": job_profile,
            "cv_analysis": cv_analysis,
            "locale": locale,
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Interview Agent failure: {e}")

    questions = result.get("interview_questions") or []
    sb.table("candidates").update({
        "interview_questions": {"questions": questions},
    }).eq("id", candidate_id).execute()

    return QuestionsResponse(candidate_id=candidate_id, job_id=job_id, questions=questions)
