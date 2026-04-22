import os
from dotenv import load_dotenv

from langchain_core.prompts import PromptTemplate
from langchain_openai import ChatOpenAI
from langchain_core.output_parsers import PydanticOutputParser

from backend.models.job import JobProfile

env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
load_dotenv(env_path)


def process_job_description(job_description: str) -> JobProfile:
    """Parse a raw job description into a JobProfile.

    Note: the parsed_profile is internal — never surfaced to the user — so it
    is always extracted in English regardless of the request locale. This keeps
    downstream skill matching deterministic.
    """
    llm = ChatOpenAI(model="gpt-4o", temperature=0)
    parser = PydanticOutputParser(pydantic_object=JobProfile)

    prompt = PromptTemplate(
        template=(
            "You are an HR Assistant. Extract these fields [Title, Skills, Experience, Priorities] "
            "from the provided text. Always respond in English.\n\n"
            "{format_instructions}\n\n"
            "Job Description:\n{job_description}\n"
        ),
        input_variables=["job_description"],
        partial_variables={"format_instructions": parser.get_format_instructions()},
    )

    chain = prompt | llm | parser
    return chain.invoke({"job_description": job_description})


if __name__ == "__main__":
    dummy_job_desc = """
    We are looking for a Software Engineer with at least 3 years of experience.
    The ideal candidate should have strong skills in Python, React, and PostgreSQL.
    """
    profile = process_job_description(dummy_job_desc)
    print(profile.model_dump_json(indent=4))
