from typing import TypedDict, Optional, List, Dict, Any
from langgraph.graph import StateGraph, START, END

# Import the models
from backend.models.job import JobProfile
from backend.models.cv import CVAnalysisResult
from backend.models.ranking import RankedList

# Import the agent logic
from backend.agents.intake_agent import process_job_description
from backend.agents.cv_analyzer import analyze_cv
from backend.agents.ranking_agent import rank_candidates

# 1. State Definition
class AgentState(TypedDict):
    job_description: str
    job_profile: Optional[JobProfile]
    candidates: List[Dict[str, str]] # Format: [{"id": "UUID", "cv_text": "..."}]
    all_cv_analyses: Optional[List[Dict[str, Any]]] # Accumulated analyses
    ranking_result: Optional[RankedList]

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

# 3. Graph Construction
workflow = StateGraph(AgentState)

# Add Nodes
workflow.add_node("intake", intake_node_function)
workflow.add_node("analyzer", analyzer_node_function)
workflow.add_node("ranker", ranker_node_function)

# Set Edges (Flow: START -> intake -> analyzer -> ranker -> END)
workflow.add_edge(START, "intake")
workflow.add_edge("intake", "analyzer")
workflow.add_edge("analyzer", "ranker")
workflow.add_edge("ranker", END)

# 4. Compile Graph
# The compiled graph is invoked by the FastAPI endpoints
graph = workflow.compile()
