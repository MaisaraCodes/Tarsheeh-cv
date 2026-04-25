import os
import json
from typing import Dict, Any
from dotenv import load_dotenv

from langchain_core.prompts import PromptTemplate
from langchain_openai import ChatOpenAI
from langchain_core.output_parsers import PydanticOutputParser

from backend.models.questions import InterviewQuestions
from backend.models.job import JobProfile

# Load environment variables
env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
load_dotenv(env_path)

def generate_interview_questions(job_profile: Dict[str, Any], candidate_id: str, job_id: str, analysis: Dict[str, Any]) -> InterviewQuestions:
    """
    Generates tailored interview questions based on candidate's missing and matching skills.
    
    :param job_profile: The job profile dict.
    :param candidate_id: The ID of the candidate.
    :param job_id: The ID of the job.
    :param analysis: The candidate's CV analysis result dict (containing matching/missing skills).
    """
    llm = ChatOpenAI(model="gpt-4o", temperature=0.7)
    parser = PydanticOutputParser(pydantic_object=InterviewQuestions)
    
    prompt_template = """You are a Senior Technical Interviewer.
Your task is to craft highly customized interview questions for a candidate based on their CV analysis and the job profile.

1. Inputs:
   - Job Profile: {job_profile}
   - Candidate's Missing Skills: {missing_skills}
   - Candidate's Matching Skills: {matching_skills}

2. Instructions:
   - Formulate technical questions targeting the "Missing Skills" to determine if the candidate has the aptitude to learn them or any foundational background.
   - Formulate deep-dive questions targeting the "Matching Skills" to verify the candidate's true level of expertise.
   - Ensure the questions are professional, clear, and directly relevant to the role.
   - Number of questions: Provide exactly 3 to 5 questions in total.

Format your response strictly as a JSON object matching the following structure: {format_instructions}
"""
    
    prompt = PromptTemplate(
        template=prompt_template,
        input_variables=["job_profile", "missing_skills", "matching_skills"],
        partial_variables={"format_instructions": parser.get_format_instructions()}
    )
    
    chain = prompt | llm | parser
    
    result = chain.invoke({
        "job_profile": json.dumps(job_profile, ensure_ascii=False),
        "missing_skills": json.dumps(analysis.get("missing_skills", []), ensure_ascii=False),
        "matching_skills": json.dumps(analysis.get("matching_skills", []), ensure_ascii=False)
    })
    
    # Overwrite to ensure IDs match
    result.candidate_id = candidate_id
    result.job_id = job_id
    
    return result
