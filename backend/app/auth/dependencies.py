from fastapi import Header, HTTPException

from app.database.supabase import supabase


async def get_current_user(authorization: str = Header(...)) -> str:
    """
    Verifies the Supabase JWT sent in the Authorization header and
    returns the authenticated user's id (auth.uid()).

    Expects: Authorization: Bearer <access_token>
    """
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Missing or malformed Authorization header. Expected 'Bearer <token>'."
        )

    token = authorization.removeprefix("Bearer ").strip()

    if not token:
        raise HTTPException(
            status_code=401,
            detail="Missing access token."
        )

    try:
        user_response = supabase.auth.get_user(token)
    except Exception as e:
        raise HTTPException(
            status_code=401,
            detail=f"Invalid or expired token: {e}"
        )

    if not user_response or not user_response.user:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token."
        )

    return user_response.user.id