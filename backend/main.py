"""Tarsheeh.cv API — FastAPI entrypoint, routers wired in from backend/routes."""
import os
from pathlib import Path
from dotenv import load_dotenv

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Load env from project root then backend/.env
backend_dir = Path(__file__).parent
load_dotenv(backend_dir.parent / ".env")
load_dotenv(backend_dir / ".env")

if os.getenv("OPENAI_API_KEY") or os.getenv("SUPABASE_URL"):
    print("[SUCCESS] Environment variables loaded successfully!")
else:
    print("[WARNING] Required environment variables not found. Please check your .env file.")

from backend.routes import (
    jobs_router,
    candidates_router,
    status_router,
    results_router,
    questions_router,
    report_router,
    account_router,
)

app = FastAPI(title="Tarsheeh.cv API", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {
        "status": "healthy",
        "service": "Tarsheeh.cv Backend",
        "message": "API is running and ready to process requests.",
    }


@app.get("/health")
def health_status():
    return {"status": "active"}


app.include_router(jobs_router)
app.include_router(candidates_router)
app.include_router(status_router)
app.include_router(results_router)
app.include_router(questions_router)
app.include_router(report_router)
app.include_router(account_router)
