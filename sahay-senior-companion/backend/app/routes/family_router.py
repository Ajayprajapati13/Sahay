from fastapi import APIRouter
from pydantic import BaseModel

from ..services.data_store import data_store

router = APIRouter(prefix="/family", tags=["Opt-In Family Visibility & Tracking"])

class PermissionUpdateRequest(BaseModel):
    share_trips: bool
    share_health: bool
    share_bank: bool

@router.get("/permissions")
async def get_permissions():
    """Returns current opt-in granular sharing preferences."""
    perms = data_store.get_family_permissions()
    profile = data_store.get_profile()
    return {
        "status": "success",
        "emergency_contact": profile.get("emergency_contact"),
        "permissions": perms,
        "privacy_note": "You have complete control over what your family sees. You can turn any category on or off at any moment."
    }

@router.post("/permissions")
async def update_permissions(req: PermissionUpdateRequest):
    """Updates revocable sharing permissions for family visibility."""
    updated = data_store.update_family_permissions(
        share_trips=req.share_trips,
        share_health=req.share_health,
        share_bank=req.share_bank
    )
    return {
        "status": "success",
        "message": "Your privacy settings have been updated.",
        "permissions": updated,
        "spoken_response": "I have saved your sharing preferences. Your bank transactions remain private." if not req.share_bank else "Sharing preferences updated."
    }

@router.get("/view")
async def get_family_portal_view():
    """Endpoint for the dedicated family member view (filtered by senior's permissions)."""
    portal_data = data_store.get_family_view()
    return {
        "status": "success",
        "portal": portal_data
    }

@router.get("/tracking/summary")
async def get_unified_tracking_summary():
    """Unified 'Things I'm tracking for you' dashboard across bank, health, transport, and scam defense."""
    summary = data_store.get_tracking_summary()
    return {
        "status": "success",
        "summary": summary
    }
