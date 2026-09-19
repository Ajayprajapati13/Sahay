from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from ..services.gemini_service import gemini_service
from ..services.data_store import data_store
from ..utils.security import sanitize_text

router = APIRouter(prefix="/ai", tags=["Conversational AI & Intent Routing"])

class VoiceIntentRequest(BaseModel):
    text: str = Field(..., max_length=2000)
    language: Optional[str] = "en"

class PlainLanguageRequest(BaseModel):
    text: str = Field(..., max_length=2000)
    target_audience: Optional[str] = "senior_citizen"

@router.post("/intent")
async def parse_voice_intent(req: VoiceIntentRequest):
    """Parses senior citizen speech or typed query and maps it to a journey."""
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")

    res = await gemini_service.route_intent(req.text, req.language)
    return {
        "status": "success",
        "intent": res
    }

@router.get("/daily-greeting")
async def get_daily_greeting(language: str = "en"):
    """Generates a warm, gentle morning check-in voice greeting based on pending items."""
    summary = data_store.get_tracking_summary()
    pending = summary.get("pending_reminders", [])
    senior_name = summary.get("senior_name", "Ajay uncle")

    if language == "hi":
        spoken = f"नमस्ते {senior_name} जी! आज आपके पास {len(pending)} ज़रूरी काम हैं। सुबह की बीपी की गोली ले लें, और बैंक जाने की तैयारी पूरी है।"
        headline = "सुप्रभात! आज का दिन शांत और सुरक्षित रहे।"
    else:
        spoken = f"Good morning {senior_name}! You have {len(pending)} items to look at today: your morning blood pressure medicine, and your State Bank visit planned for 11:00 AM. I am here with you every step of the way."
        headline = f"Good morning, {senior_name}! Here is your peaceful day ahead."

    return {
        "headline": headline,
        "spoken_greeting": spoken,
        "summary": summary
    }
