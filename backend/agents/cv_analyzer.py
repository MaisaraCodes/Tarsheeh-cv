import os
from dotenv import load_dotenv

from langchain_core.prompts import PromptTemplate
from langchain_openai import ChatOpenAI
from langchain_core.output_parsers import PydanticOutputParser

from backend.models.cv import CVAnalysisResult
from backend.models.job import JobProfile

try:
    from backend.rag.retriever import retrieve_context, format_context_for_prompt
except ModuleNotFoundError:
    import sys
    sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
    from backend.rag.retriever import retrieve_context, format_context_for_prompt

env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
load_dotenv(env_path)


_LANG_DIRECTIVE = {
    "ar": (
        "Write the `reasoning` field in fluent Modern Standard Arabic. "
        "Keep proper-noun technical skill names (e.g. Python, FastAPI, AWS) in their original Latin form "
        "inside the matching/missing skill lists. Numeric `score` stays a plain integer."
    ),
    "en": (
        "Write the `reasoning` field in clear professional English. "
        "Keep proper-noun technical skill names in their original form."
    ),
}


def build_rag_context_for_job(job_profile: JobProfile) -> str:
    """Run the RAG retrieval once for a job and return the formatted context.

    Hoisted out of `analyze_cv` so a single retrieval can be shared across all
    candidates for the same job (was previously running once per candidate with
    the identical query — N redundant embedding + vector calls).
    """
    query = (
        f"How to evaluate a candidate for {job_profile.title}? "
        f"Key priorities: {', '.join(job_profile.priorities)}"
    )
    raw_results = retrieve_context(query_text=query, match_count=3)
    return format_context_for_prompt(raw_results)


def analyze_cv_with_context(
    job_profile: JobProfile,
    cv_text: str,
    rag_context: str,
    locale: str = "en",
) -> CVAnalysisResult:
    """Evaluate a CV against a Job Profile using a pre-built RAG context."""
    llm = ChatOpenAI(model="gpt-4o", temperature=0)
    parser = PydanticOutputParser(pydantic_object=CVAnalysisResult)

    prompt_template = """You are an expert Senior HR Recruiter.
Your task is to evaluate a Candidate's CV against a Job Profile.

1. Context: Use the "HR Hiring Best Practices" retrieved from the knowledge base (RAG) to assess the candidate. Do not rely solely on your personal opinion; you must anchor your assessment on professional standards and the provided reference.
2. Inputs:
   - Job Profile: {job_profile}
   - CV Content: {cv_text}
   - HR Best Practices (RAG): {rag_context}

3. Requirements:
   - Assign an accurate Score from 0 to 100.
   - Write a detailed Reasoning that explains the candidate's strengths and weaknesses based on the provided RAG Context.
   - Extract the Matching Skills and Missing Skills.
   - Extract the following contact information from the CV if present. Set to null if not found:
     - email: the candidate's email address
     - phone: the candidate's phone number including country code
     - linkedin: the candidate's LinkedIn profile URL

Localization directive: {lang_directive}

Your output must strictly adhere to the following data structure format:
{format_instructions}
"""

    prompt = PromptTemplate(
        template=prompt_template,
        input_variables=["job_profile", "cv_text", "rag_context", "lang_directive"],
        partial_variables={"format_instructions": parser.get_format_instructions()},
    )

    chain = prompt | llm | parser
    return chain.invoke({
        "job_profile": job_profile.model_dump_json(),
        "cv_text": cv_text,
        "rag_context": rag_context,
        "lang_directive": _LANG_DIRECTIVE.get(locale, _LANG_DIRECTIVE["en"]),
    })


def analyze_cv(job_profile: JobProfile, cv_text: str, locale: str = "en") -> CVAnalysisResult:
    """Backwards-compatible single-shot analyzer (computes its own RAG context).

    Prefer `build_rag_context_for_job` + `analyze_cv_with_context` when scoring
    multiple candidates for the same job to avoid redundant retrievals.
    """
    rag_context = build_rag_context_for_job(job_profile)
    return analyze_cv_with_context(job_profile, cv_text, rag_context, locale=locale)


if __name__ == "__main__":
    dummy_job = JobProfile(
        title="Senior Python Backend Developer",
        required_skills=["Python", "FastAPI", "PostgreSQL", "LangChain"],
        experience_years=5,
        priorities=["Build scalable APIs", "Integrate LLM models"],
    )
    print(analyze_cv(dummy_job, "Python developer with 4 years experience.", locale="ar").model_dump_json(indent=2))
