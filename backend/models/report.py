from pydantic import BaseModel, Field

class HiringReport(BaseModel):
    executive_summary: str = Field(description="An executive summary for the manager explaining the hiring process status")
    top_candidates_recommendation: str = Field(description="A recommendation of the best candidates and why")
    overall_hiring_insight: str = Field(description="General insight or advice based on the quality of the applicant pool")
