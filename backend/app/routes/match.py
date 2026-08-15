from fastapi import APIRouter, HTTPException, Query

from app.services.match_service import match_resume_to_all_jobs, match_resume_to_job


router = APIRouter(
    prefix="/match",
    tags=["matching"]
)


@router.get("/jobs")
async def match_all_jobs(
    user_id: str,
    limit: int = 20
):

    print("USER ID:", user_id)

    matches = await match_resume_to_all_jobs(
        user_id=user_id,
        limit=limit
    )

    print("MATCHES:", matches)

    return {
        "limit": limit,
        "matches": matches
    }

@router.get("/job/{job_id}")
async def match_job(
    job_id: str,
    user_id: str
):

    try:
        result = await match_resume_to_job(
            user_id=user_id,
            job_id=job_id
        )

        return result

    except ValueError as e:
        raise HTTPException(
            status_code=404,
            detail=str(e)
        )