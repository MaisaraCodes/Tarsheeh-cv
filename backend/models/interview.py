from pydantic import BaseModel, Field
from typing import List


class InterviewQuestions(BaseModel):
    questions: List[str] = Field(
        description="A list of exactly 5 tailored interview questions for the candidate.",
        min_length=5,
        max_length=5,
    )
