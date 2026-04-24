from typing import TypedDict, Optional, List, Dict, Any
from langgraph.graph import StateGraph, START, END

# Import the models
from backend.models.job import JobProfile
from backend.models.cv import CVAnalysisResult
from backend.models.ranking import RankedList
from backend.models.questions import InterviewQuestions
from backend.models.report import HiringReport

# Import the agent logic
from backend.agents.intake_agent import process_job_description
from backend.agents.cv_analyzer import analyze_cv
from backend.agents.ranking_agent import rank_candidates
from backend.agents.question_generator_agent import generate_interview_questions
from backend.agents.report_agent import compile_hiring_report

# 1. State Definition
class AgentState(TypedDict):
    job_id: str
    job_description: str
    job_profile: Optional[JobProfile]
    candidates: List[Dict[str, str]] # Format: [{"id": "UUID", "cv_text": "..."}]
    all_cv_analyses: Optional[List[Dict[str, Any]]] # Accumulated analyses
    ranking_result: Optional[RankedList]
    interview_questions: Optional[List[Dict[str, Any]]] # Accumulated questions per candidate
    final_report: Optional[HiringReport]

# 2. Node Functions
def intake_node_function(state: AgentState):
    print("--- [NODE] INTAKE AGENT IS WORKING ---")
    # Extract Job Description and pass to the Intake Agent
    profile = process_job_description(state["job_description"])
    
    # Update state with the extracted Job Profile
    return {"job_profile": profile}

def analyzer_node_function(state: AgentState):
    print("--- [NODE] CV ANALYZER IS WORKING ---")
    # Ensure data exists and pass to CV Analyzer Agent
    job_profile = state.get("job_profile")
    candidates = state.get("candidates", [])
    
    if not job_profile or not candidates:
        raise ValueError("Missing job_profile or candidates in state")
        
    analyses = []
    # In a real distributed system this could run asynchronously.
    # We iterate sequentially for simplicity.
    for candidate in candidates:
        print(f"-> Analyzing Candidate: {candidate.get('id', 'Unknown')}")
        cv_text = candidate.get("cv_text", "")
        # Notice we are passing the extracted text string, not the dict
        result = analyze_cv(job_profile, cv_text)
        
        analyses.append({
            "candidate_id": candidate.get("id"),
            "analysis": result.model_dump()
        })
    
    # Update state with all accumulated Analysis Results
    return {"all_cv_analyses": analyses}

def ranker_node_function(state: AgentState):
    print("--- [NODE] RANKER AGENT IS WORKING ---")
    analyses = state.get("all_cv_analyses", [])
    
    if not analyses:
        raise ValueError("No analyses to rank")
        
    result = rank_candidates(analyses)
    
    # Update state with Ranking Result
    return {"ranking_result": result}

def interview_node_function(state: AgentState):
    print("--- [NODE] INTERVIEW QUESTION GENERATOR IS WORKING ---")
    job_profile = state.get("job_profile")
    analyses = state.get("all_cv_analyses", [])
    job_id = state.get("job_id", "unknown_job_id")
    
    if not job_profile or not analyses:
        raise ValueError("Missing job_profile or analyses in state for questions generation")
    
    questions_list = []
    # Convert JobProfile model to dict for the agent
    job_profile_dict = job_profile.model_dump()
    
    for item in analyses:
        candidate_id = item.get("candidate_id")
        analysis_data = item.get("analysis")
        
        print(f"-> Generating Questions for Candidate: {candidate_id}")
        result = generate_interview_questions(job_profile_dict, candidate_id, job_id, analysis_data)
        
        questions_list.append(result.model_dump())
        
    return {"interview_questions": questions_list}

def report_node_function(state: AgentState):
    print("--- [NODE] REPORT COMPILER IS WORKING ---")
    job_profile = state.get("job_profile")
    ranking_result = state.get("ranking_result")
    
    if not job_profile or not ranking_result:
        raise ValueError("Missing job_profile or ranking_result in state for report compiler")
        
    job_profile_dict = job_profile.model_dump()
    ranked_list_dict = ranking_result.model_dump()
    
    report = compile_hiring_report(ranked_list_dict, job_profile_dict)
    
    return {"final_report": report}

# 3. Graph Construction
workflow = StateGraph(AgentState)

# Add Nodes
workflow.add_node("intake", intake_node_function)
workflow.add_node("cv_analyzer", analyzer_node_function)
workflow.add_node("ranking", ranker_node_function)
workflow.add_node("interview", interview_node_function)
workflow.add_node("report", report_node_function)

# Set Edges (Flow: START -> intake -> cv_analyzer -> ranking -> interview -> report -> END)
workflow.add_edge(START, "intake")
workflow.add_edge("intake", "cv_analyzer")
workflow.add_edge("cv_analyzer", "ranking")
workflow.add_edge("ranking", "interview")
workflow.add_edge("interview", "report")
workflow.add_edge("report", END)

# 4. Compile Graph
# The compiled 'app' is the core Director called by the FastAPI Endpoint
app = workflow.compile()
