from fastapi import FastAPI
from dotenv import load_dotenv
import os

# Load environment variables from .env file as early as possible,
# before any other part of the app tries to read them
load_dotenv()

# Create the FastAPI application instance. The title and version
# will appear in the auto-generated API documentation at /docs
app = FastAPI(
    title="Tarsheeh.cv API",
    version="0.1.0"
)

# A minimal root endpoint just to confirm the server is alive.
# Osama will replace this with a proper health check in the next task.
@app.get("/")
def root():
    return {"message": "Tarsheeh.cv backend is running"}