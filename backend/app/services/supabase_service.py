"""Store profile in Supabase (Postgres)"""
from app.database.supabase import supabase
from typing import Optional

def create_resume_record(user_id: str, file_name: str, file_url: str, raw_text: str) -> dict:
    result = supabase.table("resumes").insert({
        "user_id": user_id,
        "file_name": file_name,
        "file_url": file_url,
        "raw_text": raw_text,
        "status": "extracted",
    }).execute()
    return result.data[0]

def get_user_latest_full_profile(user_id: str) -> Optional[dict]:
    """
    Find the user's most recent resume, then its profile, then attach
    skills/projects/experience — same shape as get_full_profile but
    looked up by user_id instead of profile_id.
    """
    resume = (
        supabase.table("resumes")
        .select("id")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    if not resume.data:
        return None
    resume_id = resume.data[0]["id"]

    profile = (
        supabase.table("profiles")
        .select("*")
        .eq("resume_id", resume_id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    if not profile.data:
        return None
    profile_data = profile.data[0]
    profile_id = profile_data["id"]

    skills = supabase.table("skills").select("*").eq("profile_id", profile_id).execute()
    projects = supabase.table("projects").select("*").eq("profile_id", profile_id).execute()
    experience = supabase.table("experience").select("*").eq("profile_id", profile_id).execute()

    return {
        **profile_data,
        "skills": skills.data,
        "projects": projects.data,
        "experience": experience.data,
    }

def create_profile_record(resume_id: str, profile_json: dict, model: str) -> dict:
    result = supabase.table("profiles").insert({
        "resume_id": resume_id,
        "full_name": profile_json.get("full_name"),
        "email": profile_json.get("email"),
        "phone": profile_json.get("phone"),
        "summary": profile_json.get("summary"),
        "profile_json": profile_json,
        "extraction_model": model,
    }).execute()
    return result.data[0]


def insert_skills(profile_id: str, skills: list[dict]):
    if not skills:
        return
    rows = [
        {"profile_id": profile_id, "skill_name": s["skill_name"], "category": s.get("category")}
        for s in skills
    ]
    supabase.table("skills").insert(rows).execute()


def insert_projects(profile_id: str, projects: list[dict]):
    if not projects:
        return
    rows = [
        {
            "profile_id": profile_id,
            "title": p["title"],
            "description": p.get("description"),
            "tech_stack": p.get("tech_stack", []),
        }
        for p in projects
    ]
    supabase.table("projects").insert(rows).execute()


def insert_experience(profile_id: str, experience: list[dict]):
    if not experience:
        return
    rows = [
        {
            "profile_id": profile_id,
            "company": e.get("company"),
            "role": e.get("role"),
            "start_date": e.get("start_date"),
            "end_date": e.get("end_date"),
            "description": e.get("description"),
        }
        for e in experience
    ]
    supabase.table("experience").insert(rows).execute()


def get_full_profile(profile_id: str, user_id: str) -> dict:
    profile = supabase.table("profiles").select("*").eq("id", profile_id).single().execute()

    if not profile.data:
        raise ValueError("Profile not found.")

    resume = (
        supabase.table("resumes")
        .select("user_id")
        .eq("id", profile.data["resume_id"])
        .single()
        .execute()
    )

    if not resume.data or resume.data["user_id"] != user_id:
        raise ValueError("Profile not found.")

    skills = supabase.table("skills").select("*").eq("profile_id", profile_id).execute()
    projects = supabase.table("projects").select("*").eq("profile_id", profile_id).execute()
    experience = supabase.table("experience").select("*").eq("profile_id", profile_id).execute()

    return {
        **profile.data,
        "skills": skills.data,
        "projects": projects.data,
        "experience": experience.data,
    }

from app.database.supabase import supabase  # assumes existing supabase client export


def upsert_jobs(jobs: list[dict]) -> dict:
    """
    Insert or update normalized jobs in Supabase, deduped on (source, external_id).
    """
    if not jobs:
        return {"inserted": 0}

    response = (
        supabase.table("jobs")
        .upsert(jobs, on_conflict="source,external_id")
        .execute()
    )
    return {"inserted": len(response.data) if response.data else 0}


def search_jobs(query: Optional[str] = None, limit: int = 20, offset: int = 0) -> list[dict]:
    """
    Search stored jobs by title (case-insensitive, partial match).
    """
    q = supabase.table("jobs").select("*")

    if query:
        q = q.ilike("title", f"%{query}%")

    q = q.order("created_at", desc=True).range(offset, offset + limit - 1)
    response = q.execute()
    return response.data or []


def get_job_by_id(job_id: str) -> Optional[dict]:
    response = supabase.table("jobs").select("*").eq("id", job_id).single().execute()
    return response.data


def update_job_requirements(job_id: str, requirements: dict) -> dict:
    """
    Attach extracted requirements (required_skills, preferred_skills,
    experience_years, education) to a stored job.
    """
    response = (
        supabase.table("jobs")
        .update({
            "required_skills": requirements.get("required_skills", []),
            "preferred_skills": requirements.get("preferred_skills", []),
            "experience_years": requirements.get("experience_years"),
            "education": requirements.get("education", []),
        })
        .eq("id", job_id)
        .execute()
    )
    return response.data