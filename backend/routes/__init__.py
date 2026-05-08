from backend.routes.jobs import router as jobs_router
from backend.routes.candidates import router as candidates_router
from backend.routes.status import router as status_router
from backend.routes.results import router as results_router
from backend.routes.questions import router as questions_router
from backend.routes.report import router as report_router
from backend.routes.account import router as account_router

__all__ = [
    "jobs_router",
    "candidates_router",
    "status_router",
    "results_router",
    "questions_router",
    "report_router",
    "account_router",
]
