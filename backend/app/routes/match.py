from fastapi import APIRouter, HTTPException, Query, Depends

from app.services.match_service import match_resume_to_all_jobs, match_resume_to_job
from app.auth.dependencies import get_current_user


router = APIRouter(
    prefix="/match",
    tags=["matching"]
)


@router.get("/jobs")
async def match_all_jobs(
    current_user: str = Depends(get_current_user),
    limit: int = Query(default=20, ge=1, le=100)
):

    matches = await match_resume_to_all_jobs(
        user_id=current_user,
        limit=limit
    )

    return {
        "limit": limit,
        "matches": matches
    }

@router.get("/job/{job_id}")
async def match_job(
    job_id: str,
    current_user: str = Depends(get_current_user)
):

    try:
        result = await match_resume_to_job(
            user_id=current_user,
            job_id=job_id
        )

        return result

    except ValueError as e:
        raise HTTPException(
            status_code=404,
            detail=str(e)
        )