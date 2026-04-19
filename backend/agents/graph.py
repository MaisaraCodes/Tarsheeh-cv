from typing import TypedDict, Optional
from langgraph.graph import StateGraph, START, END

# Define imports from our intake_agent
from backend.agents.intake_agent import process_job_description
from backend.models.job import JobProfile

# 1. تعريف الـ State (الدفتر اللي الوكلاء هيكتبوا فيه)
class AgentState(TypedDict):
    job_title: str
    job_description: str
    status: str  # عشان نحدث الحالة حسب الـ API Contract (intake, cv_analyzer, etc)
    parsed_profile: Optional[dict]

# 2. تعريف الـ Intake Agent (الوكيل الأول)
def intake_agent(state: AgentState):
    print("--- INTAKE AGENT IS WORKING ---")
    
    # Send the job description to GPT-4o
    profile: JobProfile = process_job_description(state.get("job_description", ""))
    
    return {
        "status": "intake_completed", 
        "job_title": profile.title, # Update the title with the parsed structured title
        "parsed_profile": profile.model_dump() # Convert to dict before passing in state
    }

# 3. بناء الرسم البياني (The Graph)
workflow = StateGraph(AgentState)

# إضافة العقدة (Node)
workflow.add_node("intake", intake_agent)

# تحديد المسار (Edges)
workflow.add_edge(START, "intake")
workflow.add_edge("intake", END)

# التجميع (Compile)
graph = workflow.compile()
