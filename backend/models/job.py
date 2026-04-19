from pydantic import BaseModel, Field
from typing import List

class JobProfile(BaseModel):
    title: str = Field(description="The job title")
    required_skills: List[str] = Field(description="List of required skills for the job")
    experience_years: int = Field(description="Minimum number of years of experience required (default to 0 if not specified)", default=0)
    priorities: List[str] = Field(description="Key priorities, responsibilities, or focus areas for the role")