import asyncio

from fastapi import APIRouter, HTTPException, Query, Depends

from app.auth.dependencies import get_current_user
from app.services.job_fetcher import (
    fetch_and_normalize_jobs,
    JobFetchError,
)
from app.services.llm_service import extract_job_requirements
from app.services.supabase_service import (
    upsert_jobs,
    search_jobs,
    get_job_by_id,
    update_job_requirements,
    get_user_latest_full_profile,
)


router = APIRouter(
    prefix="/jobs",
    tags=["jobs"],
)


# ============================================================
# JOB SEARCH
# ============================================================

@router.get("/search")
async def search_jobs_endpoint(
    query: str | None = Query(
        default=None,
        description="Keyword to search stored jobs by title",
    ),
    limit: int = Query(
        default=20,
        ge=1,
        le=100,
    ),
    offset: int = Query(
        default=0,
        ge=0,
    ),
):
    """
    Search jobs already stored in Supabase.

    IMPORTANT:
    This endpoint does NOT use an LLM.

    Search is performed directly against the stored job data.
    """

    try:
        jobs = search_jobs(
            query=query,
            limit=limit,
            offset=offset,
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to search jobs: {str(e)}",
        )

    return {
        "count": len(jobs),
        "jobs": jobs,
        "query": query,
        "limit": limit,
        "offset": offset,
    }


# ============================================================
# JOB INGESTION
# ============================================================

@router.post("/ingest")
async def ingest_jobs(
    query: str | None = Query(
        default=None,
        description="Keyword to fetch jobs from Arbeitnow",
    ),
    page: int = Query(
        default=1,
        ge=1,
    ),
    pages: int = Query(
        default=1,
        ge=1,
        le=5,
        description="Number of Arbeitnow pages to sweep (1-5)",
    ),
    extract_requirements: bool = Query(
        default=False,
        description=(
            "If true, use Gemini to extract required and preferred "
            "skills after ingestion"
        ),
    ),
):
    """
    Fetch jobs from Arbeitnow and store them in Supabase.

    Can sweep multiple pages concurrently (pages param, max 5).
    Returns new_count vs duplicate_count in the response.
    """

    # --------------------------------------------------------
    # 1. Fetch all requested pages concurrently
    # --------------------------------------------------------

    page_range = range(page, page + pages)

    try:
        results = await asyncio.gather(
            *[
                fetch_and_normalize_jobs(search=query, page=p)
                for p in page_range
            ],
            return_exceptions=True,
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected job ingestion error: {str(e)}",
        )

    # Flatten and deduplicate by external_id
    seen_external_ids: set[str] = set()
    normalized_jobs: list[dict] = []

    for result in results:
        if isinstance(result, JobFetchError):
            raise HTTPException(status_code=502, detail=str(result))
        if isinstance(result, Exception):
            raise HTTPException(status_code=500, detail=str(result))
        for job in result:
            eid = job.get("external_id", "")
            if eid and eid not in seen_external_ids:
                seen_external_ids.add(eid)
                normalized_jobs.append(job)

    # --------------------------------------------------------
    # 2. Nothing found
    # --------------------------------------------------------

    if not normalized_jobs:
        return {
            "ingested": 0,
            "new_count": 0,
            "duplicate_count": 0,
            "requirements_extracted": 0,
            "message": "No jobs found for this query",
            "query": query,
            "pages_swept": pages,
        }

    # --------------------------------------------------------
    # 3. Store jobs
    # --------------------------------------------------------

    try:
        result = upsert_jobs(normalized_jobs)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to store jobs: {str(e)}",
        )

    new_count = result.get("inserted", len(normalized_jobs))
    duplicate_count = len(normalized_jobs) - new_count

    # --------------------------------------------------------
    # 4. Optional requirement extraction
    # --------------------------------------------------------

    requirements_extracted = 0

    if extract_requirements:
        try:
            stored_jobs = search_jobs(
                query=query,
                limit=len(normalized_jobs),
                offset=0,
            )
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=(
                    "Jobs were ingested successfully, but fetching "
                    f"them for requirement extraction failed: {str(e)}"
                ),
            )

        for job in stored_jobs:
            description = job.get("description")
            if not description:
                continue
            try:
                requirements = await extract_job_requirements(description)
                update_job_requirements(job["id"], requirements)
                requirements_extracted += 1
            except Exception as e:
                print(
                    f"[jobs] Requirement extraction failed "
                    f"for job {job.get('id')}: {e}"
                )

    # --------------------------------------------------------
    # 5. Response
    # --------------------------------------------------------

    return {
        "ingested": len(normalized_jobs),
        "new_count": new_count,
        "duplicate_count": duplicate_count,
        "requirements_extracted": requirements_extracted,
        "query": query,
        "pages_swept": pages,
    }


# ============================================================
# INGEST FOR CAREER GOALS
# ============================================================

@router.post("/ingest-for-goals")
async def ingest_for_goals(
    user_id: str = Depends(get_current_user),
    pages: int = Query(default=2, ge=1, le=5),
    extract_requirements: bool = Query(default=True),
):
    """
    Read the user's saved career goals and trigger an ingestion sweep
    for each target role title automatically.
    """
    from app.database.supabase import supabase as _sb

    goals_res = _sb.table("career_goals").select("role_title").eq("user_id", user_id).execute()
    goals = goals_res.data or []

    if not goals:
        return {"message": "No career goals set. Add target roles on your Career Profile.", "ingested_total": 0}

    total_new = 0
    total_dup = 0
    results_by_role = []

    for goal in goals:
        role = goal.get("role_title", "")
        if not role:
            continue
        try:
            page_results = await asyncio.gather(
                *[fetch_and_normalize_jobs(search=role, page=p) for p in range(1, pages + 1)],
                return_exceptions=True,
            )
            seen: set[str] = set()
            jobs: list[dict] = []
            for pr in page_results:
                if isinstance(pr, Exception):
                    continue
                for j in pr:
                    eid = j.get("external_id", "")
                    if eid and eid not in seen:
                        seen.add(eid)
                        jobs.append(j)

            if jobs:
                r = upsert_jobs(jobs)
                new = r.get("inserted", len(jobs))
                dup = len(jobs) - new
                total_new += new
                total_dup += dup
                results_by_role.append({"role": role, "new": new, "duplicates": dup})

                if extract_requirements:
                    stored = search_jobs(query=role, limit=len(jobs), offset=0)
                    for job in stored:
                        desc = job.get("description")
                        if not desc:
                            continue
                        try:
                            reqs = await extract_job_requirements(desc)
                            update_job_requirements(job["id"], reqs)
                        except Exception:
                            pass

        except Exception as e:
            results_by_role.append({"role": role, "error": str(e)})

    return {
        "ingested_total": total_new,
        "duplicate_total": total_dup,
        "pages_per_role": pages,
        "by_role": results_by_role,
    }



# ============================================================
# GET SINGLE JOB
# ============================================================

@router.get("/{job_id}")
async def get_job(job_id: str):
    """
    Return one stored job.

    No LLM is used.
    """

    job = get_job_by_id(job_id)

    if not job:
        raise HTTPException(
            status_code=404,
            detail="Job not found",
        )

    return job


# ============================================================
# EXTRACT REQUIREMENTS FOR ONE JOB
# ============================================================

@router.post("/{job_id}/extract-requirements")
async def extract_requirements_for_job(
    job_id: str,
):
    """
    Extract required/preferred skills from one job description.

    This endpoint intentionally uses Gemini because extracting
    structured requirements from free-form job descriptions is
    an appropriate LLM task.
    """

    # --------------------------------------------------------
    # 1. Get job
    # --------------------------------------------------------

    job = get_job_by_id(job_id)

    if not job:
        raise HTTPException(
            status_code=404,
            detail="Job not found",
        )

    # --------------------------------------------------------
    # 2. Check description
    # --------------------------------------------------------

    description = job.get("description")

    if not description:
        raise HTTPException(
            status_code=400,
            detail="Job has no description to extract from",
        )

    # --------------------------------------------------------
    # 3. Gemini extraction
    # --------------------------------------------------------

    try:
        requirements = await extract_job_requirements(
            description
        )

    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"LLM requirement extraction failed: {str(e)}",
        )

    # --------------------------------------------------------
    # 4. Store extracted requirements
    # --------------------------------------------------------

    try:
        update_job_requirements(
            job_id,
            requirements,
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=(
                "Requirements were extracted successfully, "
                f"but could not be saved: {str(e)}"
            ),
        )

    # --------------------------------------------------------
    # 5. Return result
    # --------------------------------------------------------

    return {
        "job_id": job_id,
        "requirements": requirements,
    }