import uuid

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends

from app.services.resume_parser import extract_text_from_pdf
from app.services.llm_service import extract_profile_from_text

from app.services.supabase_service import (
    create_resume_record,
    create_profile_record,
    insert_skills,
    insert_projects,
    insert_experience,
    get_full_profile,
)

from app.database.supabase import supabase
from app.models.schemas import ResumeUploadResponse, ProfileResponse
from app.auth.dependencies import get_current_user


router = APIRouter(
    prefix="/resume",
    tags=["resume"]
)


BUCKET_NAME = "resumes"


@router.post("/upload", response_model=ResumeUploadResponse)
async def upload_resume(
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user)
):

    # Check file type
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are supported."
        )

    # Read PDF bytes
    file_bytes = await file.read()

    # Upload PDF to Supabase Storage, scoped to the authenticated user
    storage_path = f"{user_id}/{uuid.uuid4()}_{file.filename}"

    try:
        supabase.storage.from_(BUCKET_NAME).upload(
            storage_path,
            file_bytes,
            {
                "content-type": "application/pdf"
            }
        )

        file_url = supabase.storage.from_(BUCKET_NAME).get_public_url(
            storage_path
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Storage upload failed: {e}"
        )

    # Extract text from PDF
    try:
        raw_text = extract_text_from_pdf(file_bytes)

    except ValueError as e:
        raise HTTPException(
            status_code=422,
            detail=str(e)
        )

    # Extract structured profile using Gemini
    try:
        profile_json = extract_profile_from_text(raw_text)

    except ValueError as e:
        raise HTTPException(
            status_code=502,
            detail=str(e)
        )

    # Store resume metadata
    try:
        resume_record = create_resume_record(
            user_id,
            file.filename,
            file_url,
            raw_text
        )

        # Store extracted profile
        profile_record = create_profile_record(
            resume_record["id"],
            profile_json,
            model="gemini-2.5-flash"
        )

        # Store child tables
        insert_skills(
            profile_record["id"],
            profile_json.get("skills", [])
        )

        insert_projects(
            profile_record["id"],
            profile_json.get("projects", [])
        )

        insert_experience(
            profile_record["id"],
            profile_json.get("experience", [])
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Database insert failed: {e}"
        )

    return ResumeUploadResponse(
        resume_id=resume_record["id"],
        profile_id=profile_record["id"],
        status="completed"
    )


@router.get(
    "/profile/{profile_id}",
    response_model=ProfileResponse
)
async def get_profile(
    profile_id: str,
    user_id: str = Depends(get_current_user)
):

    try:
        return get_full_profile(profile_id, user_id)

    except Exception:
        raise HTTPException(
            status_code=404,
            detail="Profile not found."
        )