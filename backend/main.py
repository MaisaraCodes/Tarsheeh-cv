from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import uuid
from dotenv import load_dotenv, find_dotenv

# Load environment variables from .env file as early as possible
# find_dotenv() automatically finds the .env file in parent directories if not in current
load_dotenv(find_dotenv())

# Confirm loading to Terminal (without exposing the keys)
if os.getenv("OPENAI_API_KEY") or os.getenv("SUPABASE_URL"):
    print("✅ Environment variables loaded successfully!")
else:
    print("⚠️ Warning: Required environment variables not found. Please check your .env file.")

# Import the LangGraph graph
from agents.graph import graph
from utils.supabase_client import supabase

# Create the FastAPI application instance
app = FastAPI(
    title="Tarsheeh.cv API",
    version="0.1.0"
)

# Add CORS middleware to allow requests from the Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods (GET, POST, etc.)
    allow_headers=["*"],  # Allows all headers
)

# -----------------
# Pydantic Models
# -----------------

class JobRequest(BaseModel):
    title: str
    description: str

class JobResponse(BaseModel):
    job_id: str
    status: str

# -----------------
# API Endpoints
# -----------------

@app.get("/health")
def health_status():
    return {"status": "active"}

# 1. Health Check Endpoint
@app.get("/")
def health_check():
    return {
        "status": "healthy", 
        "service": "Tarsheeh.cv Backend",
        "message": "API is running and ready to process requests."
    }

# 2. POST /job Endpoint to trigger Intake Agent
@app.post("/job", response_model=JobResponse)
def create_job(job: JobRequest):
    try:
        # Generate a new unique ID for the job
        job_id = str(uuid.uuid4())

        # The initial state matching AgentState we defined in graph.py
        initial_state = {
            "job_title": job.title,
            "job_description": job.description,
            "status": "processing"
        }
        
        # Invoke the LangGraph Intake Agent
        result = graph.invoke(initial_state)

        # Update Supabase 'jobs' table
        final_status = result.get("status", "processing")
        
        supabase.table("jobs").insert({
            "id": job_id,
            "title": result.get("job_title", job.title),
            "description": job.description,
            "status": final_status
        }).execute()
        
        return JobResponse(
            job_id=job_id,
            status=final_status
        )

    except Exception as e:
        # For simplicity return 500 on all internal errors
        raise HTTPException(status_code=500, detail=f"Intake Agent or DB failure: {str(e)}")