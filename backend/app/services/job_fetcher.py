import httpx
from typing import Optional, Any
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
            response = await client.get(
                ARBEITNOW_BASE_URL,
                params=params,
            )

            response.raise_for_status()
            data = response.json()

    except httpx.HTTPStatusError as e:
        raise JobFetchError(
            f"Arbeitnow API returned {e.response.status_code}"
        ) from e

    except httpx.RequestError as e:
        raise JobFetchError(
            f"Failed to reach Arbeitnow API: {e}"
        ) from e

    except ValueError as e:
        raise JobFetchError(
            "Arbeitnow returned invalid JSON"
        ) from e

    jobs = data.get("data", [])

    if not isinstance(jobs, list):
        raise JobFetchError(
            "Unexpected response format from Arbeitnow: "
            "'data' is not an array"
        )

    return jobs


# ============================================================
# HELPERS
# ============================================================

def normalize_string_list(value: Any) -> list[str]:
    """
    Convert a value into a clean list of strings.

    Examples:

        ["Full-time", "Remote"]
            -> ["Full-time", "Remote"]

        "Full-time"
            -> ["Full-time"]

        "Full-time, Remote"
            -> ["Full-time", "Remote"]

        None
            -> []

        []
            -> []

    This is important because Supabase JSON/array columns expect
    a consistent array representation.
    """

    if value is None:
        return []

    # Already a list
    if isinstance(value, list):

        result = []

        for item in value:

            if item is None:
                continue

            # Convert values such as integers safely to strings
            item_string = str(item).strip()

            if item_string:
                result.append(item_string)

        return result

    # Tuple/set support
    if isinstance(value, (tuple, set)):

        result = []

        for item in value:

            if item is None:
                continue

            item_string = str(item).strip()

            if item_string:
                result.append(item_string)

        return result

    # String support
    if isinstance(value, str):

        value = value.strip()

        if not value:
            return []

        # Some APIs return comma-separated strings
        if "," in value:

            parts = [
                part.strip()
                for part in value.split(",")
                if part.strip()
            ]

            return parts

        return [value]

    # Anything else
    return [str(value).strip()]


def normalize_tags(value: Any) -> list[str]:
    """
    Normalize job tags into a list of strings.
    """

    return normalize_string_list(value)


def normalize_job_types(value: Any) -> list[str]:
    """
    Normalize job_types into a list of strings.

    This guarantees that Supabase receives:

        []

    or:

        ["Full-time"]

    rather than a raw string/object.
    """

    return normalize_string_list(value)


def normalize_raw_data(raw_job: dict) -> dict:
    """
    Ensure raw_data is always JSON-serializable.

    Arbeitnow data should already be JSON-compatible, so this
    mainly exists as a defensive boundary.
    """

    if not isinstance(raw_job, dict):
        return {}

    return raw_job


# ============================================================
# JOB NORMALIZATION
# ============================================================

def normalize_job(raw_job: dict) -> dict:
    """
    Convert a raw Arbeitnow job into FYND's internal job schema.

    The output is guaranteed to have consistent types for fields
    that are stored as arrays/JSON.
    """

    if not isinstance(raw_job, dict):
        raise ValueError("Invalid job object received from Arbeitnow")

    # --------------------------------------------------------
    # External ID
    # --------------------------------------------------------

    external_id = str(
        raw_job.get("slug")
        or raw_job.get("id")
        or ""
    ).strip()

    # --------------------------------------------------------
    # Posted date
    # --------------------------------------------------------

    posted_at = None

    created_at_ts = raw_job.get("created_at")

    if created_at_ts:

        try:

            posted_at = datetime.fromtimestamp(
                int(created_at_ts),
                tz=timezone.utc,
            ).isoformat()

        except (ValueError, TypeError, OverflowError):

            posted_at = None

    # --------------------------------------------------------
    # Basic fields
    # --------------------------------------------------------

    title = str(
        raw_job.get("title") or ""
    ).strip()

    company = str(
        raw_job.get("company_name") or ""
    ).strip()

    location = str(
        raw_job.get("location") or ""
    ).strip()

    description = raw_job.get("description") or ""

    if not isinstance(description, str):
        description = str(description)

    url = str(
        raw_job.get("url") or ""
    ).strip()

    # --------------------------------------------------------
    # Array fields
    # --------------------------------------------------------

    job_types = normalize_job_types(
        raw_job.get("job_types")
    )

    tags = normalize_tags(
        raw_job.get("tags")
    )

    # --------------------------------------------------------
    # Remote
    # --------------------------------------------------------

    remote_value = raw_job.get("remote", False)

    if isinstance(remote_value, str):

        remote = remote_value.lower() in {
            "true",
            "1",
            "yes",
            "remote",
        }

    else:

        remote = bool(remote_value)

    # --------------------------------------------------------
    # Final normalized object
    # --------------------------------------------------------

    return {
        "external_id": external_id,
        "source": "arbeitnow",
        "title": title,
        "company": company,
        "location": location,
        "description": description,
        "url": url,
        "apply_url": url,

        # ALWAYS arrays
        "job_types": job_types,
        "tags": tags,

        "remote": remote,
        "posted_at": posted_at,

        # Keep original API response
        "raw_data": normalize_raw_data(raw_job),
    }


# ============================================================
# FETCH + NORMALIZE
# ============================================================

async def fetch_and_normalize_jobs(
    search: Optional[str] = None,
    page: int = 1,
) -> list[dict]:
    """
    Fetch jobs from Arbeitnow and convert them into FYND's
    normalized job format.
    """

    raw_jobs = await fetch_jobs_from_arbeitnow(
        search=search,
        page=page,
    )

    normalized_jobs = []

    for raw_job in raw_jobs:

        # Ignore malformed jobs
        if not isinstance(raw_job, dict):
            continue

        # Ignore jobs without a title
        title = raw_job.get("title")

        if not title:
            continue

        try:

            normalized = normalize_job(raw_job)

            normalized_jobs.append(normalized)

        except Exception as e:

            # Don't let one malformed job destroy the entire
            # ingestion process.
            print(
                "[job_fetcher] Skipping malformed job:",
                e,
            )

            continue

    return normalized_jobs