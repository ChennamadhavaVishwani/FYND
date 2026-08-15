from fastapi import APIRouter, HTTPException, Query

from app.services.job_fetcher import fetch_and_normalize_jobs, JobFetchError
from app.services.llm_service import extract_job_requirements
from app.services.supabase_service import (
    upsert_jobs,
    search_jobs,
    get_job_by_id,
    update_job_requirements,
)

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.get("/search")
async def search_jobs_endpoint(
    query: str = Query(None, description="Keyword to search stored jobs by title"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    jobs = search_jobs(query=query, limit=limit, offset=offset)
    return {"count": len(jobs), "jobs": jobs}

@router.post("/ingest")
async def ingest_jobs(
    query: str = Query(None, description="Keyword to fetch jobs for from Arbeitnow"),
    page: int = Query(1, ge=1),
    extract_requirements: bool = Query(
        False, description="Run LLM requirement extraction on ingested jobs"
    ),
):
    try:
        normalized_jobs = await fetch_and_normalize_jobs(search=query, page=page)
    except JobFetchError as e:
        raise HTTPException(status_code=502, detail=str(e))

    if not normalized_jobs:
        return {"ingested": 0, "message": "No jobs found for this query"}

    result = upsert_jobs(normalized_jobs)

    if extract_requirements:
        stored_jobs = search_jobs(query=query, limit=len(normalized_jobs))
        for job in stored_jobs:
            if job.get("description"):
                requirements = await extract_job_requirements(job["description"])
                update_job_requirements(job["id"], requirements)

    return {"ingested": result["inserted"], "query": query, "page": page}


@router.get("/{job_id}")
async def get_job(job_id: str):
    job = get_job_by_id(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.post("/{job_id}/extract-requirements")
async def extract_requirements_for_job(job_id: str):
    job = get_job_by_id(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if not job.get("description"):
        raise HTTPException(status_code=400, detail="Job has no description to extract from")

    requirements = await extract_job_requirements(job["description"])
    update_job_requirements(job_id, requirements)
    return {"job_id": job_id, "requirements": requirements}