"""DELETE /account?user_id=... — permanently deletes a Supabase auth user."""
from fastapi import APIRouter, HTTPException, Query

from backend.utils.supabase_client import get_supabase

router = APIRouter()


@router.delete("/account")
def delete_account(user_id: str = Query(...)):
    try:
        get_supabase().auth.admin.delete_user(user_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete account: {e}")
    return {"status": "deleted"}
