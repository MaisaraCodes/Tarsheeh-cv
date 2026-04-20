import os
import json
from typing import List, Dict, Any
from dotenv import load_dotenv

from langchain_core.prompts import PromptTemplate
from langchain_openai import ChatOpenAI
from langchain_core.output_parsers import PydanticOutputParser

from backend.models.ranking import RankedList

# Load environment variables
env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
load_dotenv(env_path)

def rank_candidates(analyses: List[Dict[str, Any]]) -> RankedList:
    """
    Takes a list of CV analysis results and asks the LLM to rank them
    objectively to produce a shortlist.
    
    :param analyses: A list of dicts. Example: [{"candidate_id": "1", "analysis": {...}}, ...]
    """
    llm = ChatOpenAI(model="gpt-4o", temperature=0)
    parser = PydanticOutputParser(pydantic_object=RankedList)
    
    prompt_template = """You are a Senior Strategic Recruitment Consultant.
Your task is to take a list of candidate CV analysis results and rank them to create a shortlist for the Hiring Manager.

Requirements:
1. Compare candidates based on their Score, Reasoning, Matching Skills, and Missing Skills.
2. Do not just rely on the numerical score; look into the job fit and essential skills.
3. Rank them from highest (best fit, rank 1) to lowest. Write a summary for each candidate outlining why they deserve this rank.
4. The ranking must be completely objective and fair based strictly on the provided analysis.

Candidate Analyses:
{analyses_data}

{format_instructions}
"""
    
    prompt = PromptTemplate(
        template=prompt_template,
        input_variables=["analyses_data"],
        partial_variables={"format_instructions": parser.get_format_instructions()}
    )
    
    chain = prompt | llm | parser
    
    # Execute the Chain
    result = chain.invoke({
        "analyses_data": json.dumps(analyses, indent=2)
    })
    
    return result

if __name__ == "__main__":
    # --- Test Script ---
    dummy_analyses = [
        {
            "candidate_id": "123",
            "name": "Osama",
            "analysis": {
                "score": 60,
                "reasoning": "Has 4 years backend experience but lacks FastAPI.",
                "matching_skills": ["Python"],
                "missing_skills": ["FastAPI", "LangChain"]
            }
        },
        {
            "candidate_id": "456",
            "name": "Ahmed",
            "analysis": {
                "score": 90,
                "reasoning": "Excellent fit with 5 years experience in Python and FastAPI.",
                "matching_skills": ["Python", "FastAPI", "PostgreSQL", "LangChain"],
                "missing_skills": []
            }
        }
    ]
    
    print("--- Testing Ranking Agent ---")
    print("Ranking candidates...")
    
    try:
        ranked_list = rank_candidates(dummy_analyses)
        print("\nSuccess! Structured Ranking Output:")
        print(ranked_list.model_dump_json(indent=4))
    except Exception as e:
        print("\nError occurred:", e)
