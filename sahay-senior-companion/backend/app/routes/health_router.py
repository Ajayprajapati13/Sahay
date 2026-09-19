from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException

from ..services.data_store import data_store
from ..utils.security import CleanModel

router = APIRouter(prefix="/health", tags=["Journey 3: Health & Hospital"])

class HealthVisitLogRequest(CleanModel):
    doctor: str = "Dr. V. Sharma, M.D. (Cardiology)"
    clinic: str = "Apollo Clinic, Malleshwaram"
    date: Optional[str] = "2026-09-18"
    plain_summary: str
    next_visit: Optional[str] = "October 16, 2026"
    medicines: Optional[List[Dict[str, Any]]] = []

class MedicationToggleRequest(CleanModel):
    reminder_id: str

@router.get("/visits")
async def get_health_visits():
    """Returns the senior's Health Visit Tracker records."""
    return {
        "status": "success",
        "visits": data_store.get_health_visits()
    }

@router.post("/log-visit")
async def log_health_visit(req: HealthVisitLogRequest):
    """Logs health consultation, adds plain-language summary and schedules medication reminders."""
    visit = data_store.add_health_visit({
        "doctor": req.doctor,
        "clinic": req.clinic,
        "date": req.date,
        "plain_summary": req.plain_summary,
        "next_visit": req.next_visit,
        "medicines": req.medicines
    })

    # Schedule pill reminders automatically
    for med in req.medicines:
        # Only what was on the prescription: never invent a dose or a time.
        dose, when, purpose = med.get("dosage"), med.get("when"), med.get("purpose")
        detail = " - ".join(part for part in (dose, when) if part) or "Check your prescription"
        if purpose:
            detail += f" ({purpose})"
        data_store.add_reminder({
            "category": "health",
            "title": f"Take {med.get('name') or 'medicine'}",
            "detail": detail,
            "due_time": when or "Time not set",
            "status": "pending",
            "audio_alert": True
        })

    return {
        "status": "success",
        "visit": visit,
        "spoken_summary": f"Your consultation with {req.doctor} is saved. I have created your daily medicine schedule and gentle alarms."
    }

@router.get("/reminders")
async def get_health_reminders():
    """Returns active medication and health reminders."""
    reminders = [r for r in data_store.get_reminders() if r.get("category") == "health"]
    return {
        "status": "success",
        "reminders": reminders
    }

@router.post("/mark-reminder-done")
async def mark_reminder_done(req: MedicationToggleRequest):
    """Marks a medication or health reminder as taken/completed."""
    success = data_store.mark_reminder_done(req.reminder_id)
    if not success:
        raise HTTPException(status_code=404, detail="Reminder not found")
    return {
        "status": "success",
        "message": "Medicine marked as taken. Well done taking care of your health!"
    }
