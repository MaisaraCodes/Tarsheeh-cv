from pydantic import BaseModel, Field
from typing import List

class InterviewQuestions(BaseModel):
    candidate_id: str
    job_id: str
    questions: List[str] = Field(description="A list of 3 to 5 tailored technical and behavioral questions")
