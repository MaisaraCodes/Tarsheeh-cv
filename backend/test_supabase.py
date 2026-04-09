import os
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables from .env file
load_dotenv()

def init_supabase() -> Client:
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_ANON_KEY")
    
    if not url or not key:
        raise ValueError("Missing Supabase environment variables")
        
    client = create_client(url, key)
    return client

if __name__ == "__main__":
    print("Testing Python connection to Supabase...")
    try:
        supabase = init_supabase()
        response = supabase.table("jobs").select("*").limit(1).execute()
        print("✅ Connection successful!")
        print(f"Data received: {response.data}")
    except Exception as e:
        print(f"❌ Connection failed: {e}")
