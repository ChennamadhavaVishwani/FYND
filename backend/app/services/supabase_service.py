"""Store profile in Supabase (Postgres)"""
from app.database.supabase import supabase


def create_resume_record(user_id: str, file_name: str, file_url: str, raw_text: str) -> dict:
    result = supabase.table("resumes").insert({
        "user_id": user_id,
        "file_name": file_name,
        "file_url": file_url,
        "raw_text": raw_text,
        "status": "extracted",
    }).execute()
    return result.data[0]


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