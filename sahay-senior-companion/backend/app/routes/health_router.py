from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from ..services.data_store import data_store
from ..services.gemini_service import gemini_service
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
        data_store.add_reminder({
            "category": "health",
            "title": f"Take {med.get('name', 'Pill')}",
            "detail": f"{med.get('dosage', '1 tablet')} - {med.get('when', 'After meal')} ({med.get('purpose', 'General health')})",
            "due_time": med.get("when", "Daily"),
            "status": "pending",
            "audio_alert": True
        })

    return {
        "status": "success",
        "visit": visit,
        "spoken_summary": f"Your consultation with {req.doctor} is saved. I have created your daily medicine schedule and gentle alarms."
    }

@router.get("/hospital-guidance/{clinic_id}")
async def get_hospital_guidance(clinic_id: str):
    """In-hospital counter and token navigation in simple senior-friendly terms."""
    return {
        "clinic_name": "Apollo Clinic & Heart Center, Malleshwaram",
        "entry_guidance": "Enter via the main entrance on Sampige Road. A wheelchair ramp is on the left.",
        "reception_counter": "Counter 1 (Registration)",
        "doctor_room": "Room 104 (First Floor - Take the elevator right next to the pharmacy)",
        "token_instructions": "Hand your referral slip to Sister Mary at Counter 1. She will give you Token #14 for Dr. Sharma.",
        "amenities": "Clean drinking water and resting sofas are located directly outside Room 104."
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
