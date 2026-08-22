from fastapi import APIRouter, Depends, HTTPException, Query

from app.auth.dependencies import get_current_user
from app.services.skill_gap_service import get_skill_gap_for_job, get_aggregate_skill_gap

router = APIRouter(prefix="/skill-gap", tags=["skill-gap"])


def _user_id(current_user):
    if hasattr(current_user, "id"):
        return current_user.id

    if isinstance(current_user, dict):
        return current_user["id"]

    if isinstance(current_user, str):
        return current_user

    raise ValueError("Unable to determine user ID")


@router.get("/job/{job_id}")
async def skill_gap_for_job(job_id: str, current_user=Depends(get_current_user)):
    try:
        result = await get_skill_gap_for_job(_user_id(current_user), job_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return result


@router.get("/overview")
async def skill_gap_overview(
    limit: int = Query(20, ge=1, le=100),
    current_user=Depends(get_current_user),
):
    try:
        result = await get_aggregate_skill_gap(_user_id(current_user), limit=limit)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return result