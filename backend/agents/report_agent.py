import os
import json
from typing import Dict, Any
from dotenv import load_dotenv

from langchain_core.prompts import PromptTemplate
from langchain_openai import ChatOpenAI
from langchain_core.output_parsers import PydanticOutputParser

from backend.models.report import HiringReport

# Load environment variables
env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
load_dotenv(env_path)

def compile_hiring_report(ranked_list: Dict[str, Any], job_profile: Dict[str, Any]) -> HiringReport:
    """
    Generates an executive hiring report based on the ranked candidates and job profile.
    
    :param ranked_list: The ranked candidates result dict.
    :param job_profile: The job profile dict.
    """
    llm = ChatOpenAI(model="gpt-4o", temperature=0.7)
    parser = PydanticOutputParser(pydantic_object=HiringReport)
    
    prompt_template = """You are an HR Consultant.
Your task is to write a comprehensive final hiring report summarizing the recruitment process for this role.

1. Inputs:
   - Ranked Candidates Summary: {ranked_list}
   - Job Profile: {job_profile}

2. Instructions:
   - Write an "Executive Summary" explaining how the hiring process went.
   - Provide a "Clear Recommendation" on who should be hired based on their ranking and skills, and explain why.
   - Add "Overall Hiring Insight" about the quality of the applicant pool (e.g., did the applicants possess the required skills, or does the job description need adjustments?).
   - Ensure the tone is formal, professional, and convincing.

Format your response strictly as a JSON object matching the following structure: {format_instructions}
"""
    
    prompt = PromptTemplate(
        template=prompt_template,
        input_variables=["ranked_list", "job_profile"],
        partial_variables={"format_instructions": parser.get_format_instructions()}
    )
    
    chain = prompt | llm | parser
    
    result = chain.invoke({
        "ranked_list": json.dumps(ranked_list, ensure_ascii=False),
        "job_profile": json.dumps(job_profile, ensure_ascii=False)
    })
    
    return result
