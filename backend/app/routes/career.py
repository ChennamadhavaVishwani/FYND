from fastapi import APIRouter
from fastapi import APIRouter, Depends, HTTPException
from app.auth.dependencies import get_current_user
from app.database.supabase import supabase
from app.services.supabase_service import (
    get_user_latest_full_profile,
    create_resume_record,
    create_profile_record,
)

router = APIRouter()


@router.get("/profile")
def get_profile(user_id: str = Depends(get_current_user)):
    profile = get_user_latest_full_profile(user_id)
    
    if not profile:
        # Create a default manual profile and resume record so they have one
        try:
            resume = create_resume_record(user_id, "Manual Profile", "", "")
            profile_record = create_profile_record(
                resume["id"],
                {
                    "full_name": "",
                    "email": "",
                    "phone": "",
                    "summary": "",
                    "education": []
                },
                "manual"
            )
            profile = get_user_latest_full_profile(user_id)
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to create default profile: {e}"
            )
            
    return profile


@router.put("/profile")
async def update_profile(
    data: dict,
    user_id: str = Depends(get_current_user)
):
    profile = get_user_latest_full_profile(user_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found.")
    
    profile_id = profile["id"]
    existing_json = profile.get("profile_json") or {}
    new_json = data.get("profile_json") or {}
    
    # Merge existing profile_json with updates
    merged_json = {**existing_json, **new_json}
    
    update_data = {
        "full_name": data.get("full_name", profile.get("full_name")),
        "email": data.get("email", profile.get("email")),
        "phone": data.get("phone", profile.get("phone")),
        "summary": data.get("summary", profile.get("summary")),
        "profile_json": merged_json
    }
    
    try:
        res = supabase.table("profiles").update(update_data).eq("id", profile_id).execute()
        if not res.data:
            raise HTTPException(status_code=500, detail="Update failed.")
        return res.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database update failed: {e}")


@router.post("/profile/skills")
async def add_skill(
    data: dict,
    user_id: str = Depends(get_current_user)
):
    profile = get_user_latest_full_profile(user_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found.")
    
    try:
        res = supabase.table("skills").insert({
            "profile_id": profile["id"],
            "skill_name": data.get("skill_name"),
            "category": data.get("category", "General")
        }).execute()
        return res.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add skill: {e}")


@router.delete("/profile/skills/{skill_id}")
async def delete_skill(
    skill_id: str,
    user_id: str = Depends(get_current_user)
):
    profile = get_user_latest_full_profile(user_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found.")
    
    try:
        supabase.table("skills").delete().eq("id", skill_id).eq("profile_id", profile["id"]).execute()
        return {"status": "deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete skill: {e}")


@router.post("/profile/projects")
async def add_project(
    data: dict,
    user_id: str = Depends(get_current_user)
):
    profile = get_user_latest_full_profile(user_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found.")
    
    try:
        res = supabase.table("projects").insert({
            "profile_id": profile["id"],
            "title": data.get("title"),
            "description": data.get("description"),
            "tech_stack": data.get("tech_stack", [])
        }).execute()
        return res.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add project: {e}")


@router.delete("/profile/projects/{project_id}")
async def delete_project(
    project_id: str,
    user_id: str = Depends(get_current_user)
):
    profile = get_user_latest_full_profile(user_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found.")
    
    try:
        supabase.table("projects").delete().eq("id", project_id).eq("profile_id", profile["id"]).execute()
        return {"status": "deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete project: {e}")


@router.post("/profile/experience")
async def add_experience(
    data: dict,
    user_id: str = Depends(get_current_user)
):
    profile = get_user_latest_full_profile(user_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found.")
    
    try:
        res = supabase.table("experience").insert({
            "profile_id": profile["id"],
            "company": data.get("company"),
            "role": data.get("role"),
            "start_date": data.get("start_date"),
            "end_date": data.get("end_date"),
            "description": data.get("description")
        }).execute()
        return res.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add experience: {e}")


@router.delete("/profile/experience/{experience_id}")
async def delete_experience(
    experience_id: str,
    user_id: str = Depends(get_current_user)
):
    profile = get_user_latest_full_profile(user_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found.")
    
    try:
        supabase.table("experience").delete().eq("id", experience_id).eq("profile_id", profile["id"]).execute()
        return {"status": "deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete experience: {e}")


from pydantic import BaseModel
from app.services.llm_service import client

class CopilotChatRequest(BaseModel):
    message: str
    history: list[dict] = []


@router.post("/copilot")
async def career_copilot_chat(
    data: CopilotChatRequest,
    current_user: str = Depends(get_current_user)
):
    """
    Interact with the AI Career Copilot. Gemini uses the candidate's latest profile context.
    """
    profile = get_user_latest_full_profile(current_user)
    profile_text = "No profile uploaded yet. Guide them to upload their resume."
    if profile:
        profile_text = f"""
Name: {profile.get('full_name')}
Email: {profile.get('email')}
Phone: {profile.get('phone')}
Summary: {profile.get('summary')}
Skills: {', '.join([s.get('skill_name') for s in profile.get('skills', [])])}
Projects:
"""
        for p in profile.get('projects', []):
            profile_text += f"- {p.get('title')}: {p.get('description')} (Tech Stack: {', '.join(p.get('tech_stack', []))})\n"
            
        profile_text += "\nExperience:\n"
        for e in profile.get('experience', []):
            profile_text += f"- {e.get('company')} ({e.get('role')}): {e.get('start_date')} to {e.get('end_date')}. {e.get('description')}\n"

    system_instruction = f"""You are the FYND AI Career Copilot, an elite career mentor.
You help the user identify job matches, skill gaps, prepare for interviews, and optimize their portfolio.
You must speak in a professional, encouraging, and clear technical tone. Keep answers concise, helpful, and formatted in clean markdown.

Here is the user's career profile:
{profile_text}
"""

    prompt = f"{system_instruction}\n\nConversation history:\n"
    for msg in data.history:
        role = "User" if msg.get("role") == "user" else "Copilot"
        prompt += f"{role}: {msg.get('content')}\n"
    prompt += f"User: {data.message}\nCopilot:"

    try:
        response = await client.aio.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config={
                "temperature": 0.7
            }
        )
        return {"response": (response.text or "").strip()}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Gemini error: {str(e)}")


# ============================================================
# CAREER GOALS
# ============================================================

import json as _json

@router.get("/goals")
def list_goals(user_id: str = Depends(get_current_user)):
    """Return all career goals for the current user."""
    res = supabase.table("career_goals").select("*").eq("user_id", user_id).order("created_at").execute()
    return res.data or []


class GoalCreateRequest(BaseModel):
    role_title: str


@router.post("/goals")
async def create_goal(
    data: GoalCreateRequest,
    user_id: str = Depends(get_current_user),
):
    """
    Create a career goal. Gemini generates a skill checklist for the role title.
    """
    role = data.role_title.strip()
    if not role:
        raise HTTPException(status_code=400, detail="role_title is required.")

    # Ask Gemini to generate a skill checklist for this role
    prompt = f"""You are a technical career advisor.

List the 10 most important skills a candidate needs to become a {role} in today's job market.

For each skill include a category (e.g. Programming, ML, Cloud, DevOps, Data, General).

Return ONLY a JSON array, no explanation:
[
  {{"skill": "Python", "category": "Programming"}},
  ...
]"""

    checklist = []
    try:
        response = await client.aio.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config={"temperature": 0, "response_mime_type": "application/json"},
        )
        raw = (response.text or "").strip()
        parsed = _json.loads(raw)
        checklist = [
            {"skill": item.get("skill", ""), "category": item.get("category", "General"), "checked": False}
            for item in parsed
            if item.get("skill")
        ]
    except Exception as e:
        print(f"[career_goals] Checklist generation failed: {e}")
        # Proceed with empty checklist rather than failing the whole request

    try:
        res = supabase.table("career_goals").insert({
            "user_id": user_id,
            "role_title": role,
            "skill_checklist": checklist,
        }).execute()
        return res.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create goal: {e}")


class SkillToggleRequest(BaseModel):
    skill: str
    category: str = "General"
    checked: bool


@router.put("/goals/{goal_id}/skill")
async def toggle_goal_skill(
    goal_id: str,
    data: SkillToggleRequest,
    user_id: str = Depends(get_current_user),
):
    """
    Toggle a skill checkbox on a career goal.
    When checked=True, automatically inserts the skill into the user's profile skills table.
    When checked=False, the skill is NOT removed from the profile (already acquired).
    """
    # Fetch goal
    goal_res = supabase.table("career_goals").select("*").eq("id", goal_id).eq("user_id", user_id).limit(1).execute()
    if not goal_res.data:
        raise HTTPException(status_code=404, detail="Goal not found.")

    goal = goal_res.data[0]
    checklist = goal.get("skill_checklist") or []

    # Update the checked state for the matching skill
    updated = []
    for item in checklist:
        if item.get("skill") == data.skill:
            updated.append({**item, "checked": data.checked})
        else:
            updated.append(item)

    try:
        supabase.table("career_goals").update({"skill_checklist": updated}).eq("id", goal_id).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update checklist: {e}")

    # If checking off, add skill to user's profile
    if data.checked:
        profile = get_user_latest_full_profile(user_id)
        if profile:
            profile_id = profile["id"]
            # Only insert if not already present
            existing = {s["skill_name"].lower() for s in profile.get("skills", [])}
            if data.skill.lower() not in existing:
                try:
                    supabase.table("skills").insert({
                        "profile_id": profile_id,
                        "skill_name": data.skill,
                        "category": data.category,
                    }).execute()
                except Exception as e:
                    print(f"[career_goals] Skill insert failed: {e}")

    return {"status": "ok", "skill": data.skill, "checked": data.checked}


@router.delete("/goals/{goal_id}")
def delete_goal(goal_id: str, user_id: str = Depends(get_current_user)):
    """Delete a career goal."""
    try:
        supabase.table("career_goals").delete().eq("id", goal_id).eq("user_id", user_id).execute()
        return {"status": "deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete goal: {e}")