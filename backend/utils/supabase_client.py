import os
from supabase import create_client, Client
from dotenv import load_dotenv

env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
load_dotenv(env_path)

def get_supabase_client() -> Client:
    url = os.getenv("SUPABASE_URL")
    # For backend operations, it is better to use the service role key if available,
    # but we will default to anon key if it's what we have setup.
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")
    
    if not url or not key:
        raise ValueError("Missing Supabase environment variables. Please check your .env file.")
        
    return create_client(url, key)

# Create a singleton client instance to be used across the app
supabase = get_supabase_client()
