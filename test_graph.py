import os
from dotenv import load_dotenv

from backend.agents.graph import app, AgentState

load_dotenv()

def run_test():
    # 1. Define dummy job description
    dummy_job_desc = """
    We are looking for a Backend Engineer with 3+ years of experience in Python and FastAPI.
    Candidate must know PostgreSQL and Langchain. 
    A strong understanding of RESTful APIs is required.
    """

    # 2. Define dummy candidates
    dummy_candidates = [
        {
            "id": "c1-uuid",
            "cv_text": "Osama: Software engineer with 4 years of experience. Expert in Python, Django, but lack FastAPI experience. Familiar with Langchain and Vector Databases. Knows MySQL."
        },
        {
            "id": "c2-uuid",
            "cv_text": "Ahmed: Senior Backend Developer. 5 years in Python, FastAPI, PostgreSQL. Used Langchain in previous AI wrappers. Strong REST API skills."
        }
    ]

    # 3. Create initial state
    initial_state = {
        "job_id": "test-job-uuid-1234",
        "job_description": dummy_job_desc,
        "candidates": dummy_candidates
    }

    print("=== STARTING FULL PIPELINE TEST ===")
    
    # 4. Invoke graph
    try:
        final_state = app.invoke(initial_state)
        
        print("\n=== PIPELINE FINISHED SUCCESSFULLY ===")
        print("\n--- RESULTS ---")
        
        # 5. Print the required outputs to verify API Contract alignment
        job_id = final_state.get("job_id")
        ranking = final_state.get("ranking_result")
        questions = final_state.get("interview_questions")
        report = final_state.get("final_report")
        
        print(f"\n[GET /results/{job_id}] Response Mock:")
        if ranking:
            print(f"job_id: {job_id}")
            print("ranked_candidates:")
            for rc in ranking.ranked_candidates:
                print(f"  - candidate_id: {rc.candidate_id}, score: {rc.score}, rank: {rc.rank}")
        
        print("\n[GET /questions/{candidate_id}] Response Mock:")
        if questions:
            for q in questions:
                print(f"candidate_id: {q['candidate_id']}, job_id: {q.get('job_id')}")
                print(f"Questions: {len(q['questions'])}")
                
        print("\n[GET /report/{job_id}] PDF Generation Grounding Data:")
        if report:
            print(f"Executive Summary: {report.executive_summary[:50]}...")
            
    except Exception as e:
        print("\n=== PIPELINE FAILED ===")
        print(f"Error: {e}")

if __name__ == "__main__":
    run_test()
