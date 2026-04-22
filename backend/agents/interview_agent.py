"""Interview Agent — generates 5 tailored interview questions for a candidate."""
import os
from pathlib import Path
from typing import List, Dict, Any
from dotenv import load_dotenv

from langchain_core.prompts import PromptTemplate
from langchain_openai import ChatOpenAI
from langchain_core.output_parsers import PydanticOutputParser

from backend.models.job import JobProfile
from backend.models.cv import CVAnalysisResult
from backend.models.interview import InterviewQuestions

backend_dir = Path(__file__).parent.parent
load_dotenv(backend_dir.parent / ".env")
load_dotenv(backend_dir / ".env")


def generate_questions(
    job_profile: JobProfile,
    cv_analysis: CVAnalysisResult,
    candidate_name: str = "the candidate",
) -> List[str]:
    """
    Generate exactly 5 tailored interview questions that probe judgment,
    character, and competence based on the candidate's scorecard and the job.
    """
    llm = ChatOpenAI(model="gpt-4o", temperature=0)
    parser = PydanticOutputParser(pydantic_object=InterviewQuestions)

    prompt_template = """You are a Senior Interview Strategist designing a structured interview.

Your task is to write exactly 5 sharp interview questions for {candidate_name},
tailored to the role and to what the CV analysis revealed about them.

Design principles:
- Questions must probe judgment, character, and competence (in that priority).
- At least one question should explore a missing skill — frame it to assess
  learning ability and self-awareness, never to embarrass.
- At least one question should pressure-test a matching skill with a real,
  scenario-based prompt (not a textbook definition).
- Questions should be open-ended, behavioral or scenario-based, never trivia.
- Avoid leading questions and avoid yes/no questions.
- Reference the candidate's specific strengths or gaps where relevant.

Inputs:
- Job Profile (JSON): {job_profile}
- Candidate scorecard (JSON): {cv_analysis}

{format_instructions}
"""

    prompt = PromptTemplate(
        template=prompt_template,
        input_variables=["candidate_name", "job_profile", "cv_analysis"],
        partial_variables={"format_instructions": parser.get_format_instructions()},
    )

    chain = prompt | llm | parser

    result: InterviewQuestions = chain.invoke({
        "candidate_name": candidate_name,
        "job_profile": job_profile.model_dump_json(),
        "cv_analysis": cv_analysis.model_dump_json(),
    })

    return result.questions


if __name__ == "__main__":
    dummy_job = JobProfile(
        title="Senior Python Backend Developer",
        required_skills=["Python", "FastAPI", "PostgreSQL", "LangChain"],
        experience_years=5,
        priorities=["Build scalable APIs", "Integrate LLM models"],
    )
    dummy_analysis = CVAnalysisResult(
        score=72,
        reasoning="Strong Python and PostgreSQL background; limited FastAPI exposure; no LangChain.",
        matching_skills=["Python", "PostgreSQL"],
        missing_skills=["FastAPI", "LangChain"],
    )
    qs = generate_questions(dummy_job, dummy_analysis, candidate_name="Osama")
    for i, q in enumerate(qs, 1):
        print(f"{i}. {q}")
