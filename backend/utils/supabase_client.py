import os
from supabase import create_client, Client
from dotenv import load_dotenv
from pathlib import Path

# Load env from project root then backend/.env
backend_dir = Path(__file__).parent.parent
load_dotenv(backend_dir.parent / ".env")
load_dotenv(backend_dir / ".env")

_supabase_client = None

def get_supabase_client() -> Client:
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_ANON_KEY")

    if not url or not key:
        raise ValueError("Missing Supabase environment variables. Please check your .env file.")

    return create_client(url, key)

def get_supabase() -> Client:
    global _supabase_client
    if _supabase_client is None:
        _supabase_client = get_supabase_client()
    return _supabase_client

supabase = get_supabase
