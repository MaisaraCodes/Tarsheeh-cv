"""LangGraph orchestration — split into independent subgraphs per pipeline stage.

Each subgraph owns the minimum state it needs and is invoked from the matching
FastAPI route. This avoids the original "run everything serially on first call"
bug where the analyzer ran before any candidates existed.
"""
from typing import TypedDict, Optional, List, Dict, Any
from langgraph.graph import StateGraph, START, END

from backend.models.job import JobProfile
from backend.models.cv import CVAnalysisResult
from backend.models.ranking import RankedList
from backend.agents.intake_agent import process_job_description
from backend.agents.cv_analyzer import analyze_cv
from backend.agents.ranking_agent import rank_candidates
from backend.agents.interview_agent import generate_questions
from backend.agents.report_agent import generate_report


# ---------------------------------------------------------------------------
# State definitions — one per subgraph, minimal surface area
# ---------------------------------------------------------------------------

class IntakeState(TypedDict, total=False):
    job_id: str
    job_description: str
    job_profile: Optional[JobProfile]


class AnalysisState(TypedDict, total=False):
    job_id: str
    job_profile: JobProfile
    candidates: List[Dict[str, str]]          # [{id, name, cv_text}, ...]
    all_cv_analyses: Optional[List[Dict[str, Any]]]
    ranking_result: Optional[RankedList]


class InterviewState(TypedDict, total=False):
    candidate_id: str
    candidate_name: str
    job_profile: JobProfile
    cv_analysis: CVAnalysisResult
    interview_questions: Optional[List[str]]


class ReportState(TypedDict, total=False):
    job_id: str
    job: Dict[str, Any]
    ranked_candidates: List[Dict[str, Any]]
    candidate_details: Dict[str, Dict[str, Any]]
    pdf_bytes: Optional[bytes]


# ---------------------------------------------------------------------------
# Node functions
# ---------------------------------------------------------------------------

def _intake_node(state: IntakeState) -> Dict[str, Any]:
    print("--- [INTAKE] parsing job description ---")
    profile = process_job_description(state["job_description"])
    return {"job_profile": profile}


def _analyzer_node(state: AnalysisState) -> Dict[str, Any]:
    print("--- [ANALYZER] scoring candidates ---")
    job_profile = state.get("job_profile")
    candidates = state.get("candidates", [])
    if not job_profile:
        raise ValueError("analysis_graph: missing job_profile")
    if not candidates:
        raise ValueError("analysis_graph: no candidates supplied")

    analyses: List[Dict[str, Any]] = []
    for candidate in candidates:
        cid = candidate.get("id")
        name = candidate.get("name") or "Unnamed candidate"
        cv_text = candidate.get("cv_text", "")
        print(f"   - analyzing {name} ({cid})")
        result = analyze_cv(job_profile, cv_text)
        analyses.append({
            "candidate_id": cid,
            "name": name,
            "analysis": result.model_dump(),
        })
    return {"all_cv_analyses": analyses}


def _ranker_node(state: AnalysisState) -> Dict[str, Any]:
    print("--- [RANKER] producing shortlist ---")
    analyses = state.get("all_cv_analyses") or []
    if not analyses:
        raise ValueError("analysis_graph: no analyses to rank")
    result = rank_candidates(analyses)

    # Defensive: the LLM occasionally drifts on names. Force the names we fed in.
    name_by_id = {a["candidate_id"]: a.get("name") for a in analyses if a.get("candidate_id")}
    score_by_id = {a["candidate_id"]: a["analysis"].get("score") for a in analyses if a.get("candidate_id")}
    fixed = []
    for rc in result.ranked_candidates:
        canonical_name = name_by_id.get(rc.candidate_id)
        canonical_score = score_by_id.get(rc.candidate_id)
        rc_dump = rc.model_dump()
        if canonical_name:
            rc_dump["name"] = canonical_name
        if canonical_score is not None:
            rc_dump["score"] = canonical_score
        fixed.append(rc_dump)
    # Re-pack into RankedList shape via dict (avoid re-validating pydantic name change)
    from backend.models.ranking import RankedList, RankedCandidate
    rebuilt = RankedList(ranked_candidates=[RankedCandidate(**rc) for rc in fixed])
    return {"ranking_result": rebuilt}


def _interview_node(state: InterviewState) -> Dict[str, Any]:
    print(f"--- [INTERVIEW] questions for {state.get('candidate_name')} ---")
    questions = generate_questions(
        job_profile=state["job_profile"],
        cv_analysis=state["cv_analysis"],
        candidate_name=state.get("candidate_name") or "the candidate",
    )
    return {"interview_questions": questions}


def _report_node(state: ReportState) -> Dict[str, Any]:
    print("--- [REPORT] rendering PDF ---")
    pdf_bytes = generate_report(
        job=state["job"],
        ranked_candidates=state["ranked_candidates"],
        candidate_details=state.get("candidate_details") or {},
    )
    return {"pdf_bytes": pdf_bytes}


# ---------------------------------------------------------------------------
# Subgraph builders
# ---------------------------------------------------------------------------

def _build_intake_graph():
    g = StateGraph(IntakeState)
    g.add_node("intake", _intake_node)
    g.add_edge(START, "intake")
    g.add_edge("intake", END)
    return g.compile()


def _build_analysis_graph():
    g = StateGraph(AnalysisState)
    g.add_node("analyzer", _analyzer_node)
    g.add_node("ranker", _ranker_node)
    g.add_edge(START, "analyzer")
    g.add_edge("analyzer", "ranker")
    g.add_edge("ranker", END)
    return g.compile()


def _build_interview_graph():
    g = StateGraph(InterviewState)
    g.add_node("interview", _interview_node)
    g.add_edge(START, "interview")
    g.add_edge("interview", END)
    return g.compile()


def _build_report_graph():
    g = StateGraph(ReportState)
    g.add_node("report", _report_node)
    g.add_edge(START, "report")
    g.add_edge("report", END)
    return g.compile()


intake_graph = _build_intake_graph()
analysis_graph = _build_analysis_graph()
interview_graph = _build_interview_graph()
report_graph = _build_report_graph()

# Backwards-compat export for langgraph.json (the studio expects `graph`).
graph = intake_graph
