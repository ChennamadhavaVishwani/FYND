from pydantic import BaseModel
from typing import Optional


class ResumeUploadResponse(BaseModel):
    resume_id: str
    profile_id: str
    status: str


class ProfileResponse(BaseModel):
    id: str
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    summary: Optional[str] = None
    profile_json: dict
    skills: list = []
    projects: list = []
    experience: list = []