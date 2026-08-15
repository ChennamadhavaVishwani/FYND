import httpx
from typing import Optional
from datetime import datetime, timezone

ARBEITNOW_BASE_URL = "https://www.arbeitnow.com/api/job-board-api"


class JobFetchError(Exception):
    """Raised when the job API cannot be reached or returns an error."""
    pass


async def fetch_jobs_from_arbeitnow(
    search: Optional[str] = None,
    page: int = 1,
) -> list[dict]:
    """
    Fetch raw job listings from the Arbeitnow Job Board API.
    No API key required.
    """
    params = {"page": page}
    if search:
        params["search"] = search

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(ARBEITNOW_BASE_URL, params=params)
            response.raise_for_status()
            data = response.json()
    except httpx.HTTPStatusError as e:
        raise JobFetchError(f"Arbeitnow API returned {e.response.status_code}") from e
    except httpx.RequestError as e:
        raise JobFetchError(f"Failed to reach Arbeitnow API: {e}") from e

    return data.get("data", [])


def normalize_job(raw_job: dict) -> dict:
    """
    Convert a raw Arbeitnow job dict into FYND's internal job schema.
    """
    external_id = str(raw_job.get("slug") or raw_job.get("id") or "")

    posted_at = None
    created_at_ts = raw_job.get("created_at")
    if created_at_ts:
        try:
            posted_at = datetime.fromtimestamp(
                int(created_at_ts), tz=timezone.utc
            ).isoformat()
        except (ValueError, TypeError):
            posted_at = None

    return {
        "external_id": external_id,
        "source": "arbeitnow",
        "title": raw_job.get("title", "").strip(),
        "company": raw_job.get("company_name", "").strip(),
        "location": raw_job.get("location", "").strip(),
        "description": raw_job.get("description", ""),
        "url": raw_job.get("url", ""),
        "apply_url": raw_job.get("url", ""),
        "job_types": raw_job.get("job_types", []) or [],
        "tags": raw_job.get("tags", []) or [],
        "remote": bool(raw_job.get("remote", False)),
        "posted_at": posted_at,
        "raw_data": raw_job,
    }


async def fetch_and_normalize_jobs(
    search: Optional[str] = None,
    page: int = 1,
) -> list[dict]:
    """
    Fetch jobs from Arbeitnow and return them in FYND's normalized format.
    """
    raw_jobs = await fetch_jobs_from_arbeitnow(search=search, page=page)
    return [normalize_job(job) for job in raw_jobs if job.get("title")]