from pydantic import BaseModel, Field
from typing import List

class CVAnalysisResult(BaseModel):
    score: int = Field(..., ge=0, le=100, description="Score from 0 to 100")
    reasoning: str = Field(..., description="Justification for the score based on HR best practices")
    matching_skills: List[str] = Field(..., description="List of skills present in the CV that match the Job Profile")
    missing_skills: List[str] = Field(..., description="Skills required in the Job Profile but missing in the CV")
