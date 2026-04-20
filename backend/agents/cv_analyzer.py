import os
import json
from dotenv import load_dotenv

from langchain_core.prompts import PromptTemplate
from langchain_openai import ChatOpenAI
from langchain_core.output_parsers import PydanticOutputParser

from backend.models.cv import CVAnalysisResult
from backend.models.job import JobProfile

# Try to import retriever, handle path dynamically for script execution
try:
    from backend.rag.retriever import retrieve_context, format_context_for_prompt
except ModuleNotFoundError:
    import sys
    sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
    from backend.rag.retriever import retrieve_context, format_context_for_prompt

# Load environment variables
env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
load_dotenv(env_path)

def analyze_cv(job_profile: JobProfile, cv_text: str) -> CVAnalysisResult:
    """
    Analyzes a CV against a Job Profile using RAG for HR best practices
    and GPT-4o for evaluation.
    """
    # 1. Retrieve RAG Context
    # Formulate a query using the job title and priorities
    query = f"How to evaluate a candidate for {job_profile.title}? Key priorities: {', '.join(job_profile.priorities)}"
    
    # Retrieve top 3 relevant chunks from the database
    raw_results = retrieve_context(query_text=query, match_count=3)
    rag_context = format_context_for_prompt(raw_results)
    
    # 2. Setup the LLM and the Output Parser
    llm = ChatOpenAI(model="gpt-4o", temperature=0)
    parser = PydanticOutputParser(pydantic_object=CVAnalysisResult)
    
    # 3. Create the Prompt Template
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

Your output must strictly adhere to the following data structure format:
{format_instructions}
"""
    
    prompt = PromptTemplate(
        template=prompt_template,
        input_variables=["job_profile", "cv_text", "rag_context"],
        partial_variables={"format_instructions": parser.get_format_instructions()}
    )
    
    # 4. Execute the Chain
    chain = prompt | llm | parser
    
    result = chain.invoke({
        "job_profile": job_profile.model_dump_json(),
        "cv_text": cv_text,
        "rag_context": rag_context
    })
    
    return result

if __name__ == "__main__":
    # --- Test Script ---
    dummy_job = JobProfile(
        title="Senior Python Backend Developer",
        required_skills=["Python", "FastAPI", "PostgreSQL", "LangChain"],
        experience_years=5,
        priorities=["Build scalable APIs", "Integrate LLM models", "Optimize database queries"]
    )
    
    dummy_cv = """
    Osama - Software Engineer
    Experience: 4 years working with Python backend systems.
    Tech Stack: Python, Django, MySQL.
    Recent Projects: 
    - Built a monolithic API for an e-commerce store using Django.
    - Optimized MySQL database queries dropping response times by 30%.
    - Started learning FastAPI but haven't used it in production yet.
    - No direct experience with LangChain, but I understand basic AI concepts.
    """
    
    print("--- Testing CV Analyzer Agent ---")
    print(f"Target Role: {dummy_job.title}")
    print("Retrieving RAG Context & Evaluating CV (Calling GPT-4o)...")
    
    try:
        result = analyze_cv(dummy_job, dummy_cv)
        print("\nSuccess! Structured Analysis Output:")
        print(result.model_dump_json(indent=4))
    except Exception as e:
        print("\nError occurred:", e)
