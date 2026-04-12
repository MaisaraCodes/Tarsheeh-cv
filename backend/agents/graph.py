from typing import TypedDict, Annotated
from langgraph.graph import StateGraph, START, END

# 1. تعريف الـ State (الدفتر اللي الوكلاء هيكتبوا فيه)
class AgentState(TypedDict):
    job_title: str
    job_description: str
    status: str  # عشان نحدث الحالة حسب الـ API Contract (intake, cv_analyzer, etc)

# 2. تعريف الـ Intake Agent (الوكيل الأول)
def intake_agent(state: AgentState):
    print("--- INTAKE AGENT IS WORKING ---")
    # هنا مستقبلاً هننادي GPT-4o عشان يحلل الوصف
    return {
        "status": "intake_completed", 
        "job_title": state.get("job_title", "").upper() # مثال بسيط لمعالجة البيانات
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
