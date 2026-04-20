from pydantic import BaseModel, Field
from typing import List

class RankedCandidate(BaseModel):
    candidate_id: str = Field(description="Unique identifier for the candidate")
    name: str = Field(description="Name of the candidate")
    score: int = Field(description="Score given to the candidate (0-100)")
    rank: int = Field(description="Rank of the candidate (1 is the best candidate)")
    summary: str = Field(description="A brief summary explaining why this candidate received this rank")

class RankedList(BaseModel):
    ranked_candidates: List[RankedCandidate]
