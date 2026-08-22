from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.auth.dependencies import get_current_user
from app.database.supabase import supabase

router = APIRouter(
    prefix="/applications",
    tags=["applications"]
)


class ApplicationCreate(BaseModel):
    job_id: str
    status: str = "saved"
    notes: Optional[str] = None


class ApplicationUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None
    applied_at: Optional[str] = None


@router.get("/")
def list_applications(current_user: str = Depends(get_current_user)):
    """
    Get all tracked applications for the current authenticated user,
    performing a join to pull nested details about each job.
    """
    try:
        # standard Supabase syntax for joining tables: select applications with nested jobs
        response = (
            supabase.table("applications")
            .select("*, jobs(*)")
            .eq("user_id", current_user)
            .order("created_at", desc=True)
            .execute()
        )
        return response.data or []
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch tracked applications: {str(e)}"
        )


@router.post("/")
def create_application(
    data: ApplicationCreate,
    current_user: str = Depends(get_current_user)
):
    """
    Track a new job application.
    """
    # Verify status is one of allowed values
    allowed_statuses = {"saved", "applied", "interviewing", "offered", "rejected"}
    if data.status not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Must be one of: {', '.join(allowed_statuses)}"
        )

    # Check if already tracked
    existing = (
        supabase.table("applications")
        .select("id")
        .eq("user_id", current_user)
        .eq("job_id", data.job_id)
        .execute()
    )
    if existing.data:
        raise HTTPException(
            status_code=400,
            detail="You are already tracking this job."
        )

    insert_data = {
        "user_id": current_user,
        "job_id": data.job_id,
        "status": data.status,
        "notes": data.notes
    }

    if data.status == "applied":
        insert_data["applied_at"] = datetime.now(timezone.utc).isoformat()

    try:
        response = supabase.table("applications").insert(insert_data).execute()
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to create application entry.")
        return response.data[0]
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to insert application: {str(e)}"
        )


@router.put("/{application_id}")
def update_application(
    application_id: str,
    data: ApplicationUpdate,
    current_user: str = Depends(get_current_user)
):
    """
    Update tracking status or notes for an application.
    """
    # Check if application exists and belongs to the user
    existing = (
        supabase.table("applications")
        .select("id, status")
        .eq("id", application_id)
        .eq("user_id", current_user)
        .execute()
    )
    if not existing.data:
        raise HTTPException(
            status_code=404,
            detail="Application tracking record not found."
        )

    update_payload = {}
    if data.status is not None:
        allowed_statuses = {"saved", "applied", "interviewing", "offered", "rejected"}
        if data.status not in allowed_statuses:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid status. Must be one of: {', '.join(allowed_statuses)}"
            )
        update_payload["status"] = data.status
        
        # If moving to 'applied' status from 'saved', set timestamp
        if data.status == "applied" and existing.data[0]["status"] == "saved":
            update_payload["applied_at"] = datetime.now(timezone.utc).isoformat()

    if data.notes is not None:
        update_payload["notes"] = data.notes

    if data.applied_at is not None:
        update_payload["applied_at"] = data.applied_at

    if not update_payload:
        return {"message": "No changes requested."}

    try:
        response = (
            supabase.table("applications")
            .update(update_payload)
            .eq("id", application_id)
            .eq("user_id", current_user)
            .execute()
        )
        return response.data[0]
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update application: {str(e)}"
        )


@router.delete("/{application_id}")
def delete_application(
    application_id: str,
    current_user: str = Depends(get_current_user)
):
    """
    Stop tracking an application.
    """
    try:
        response = (
            supabase.table("applications")
            .delete()
            .eq("id", application_id)
            .eq("user_id", current_user)
            .execute()
        )
        return {"status": "deleted", "message": "Successfully stopped tracking."}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete application tracking: {str(e)}"
        )
