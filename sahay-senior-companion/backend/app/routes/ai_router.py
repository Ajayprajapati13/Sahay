from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from ..services.data_store import data_store
from ..services.gemini_service import gemini_service
from ..utils.security import clean_text

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
async def get_daily_greeting(language: str = "en", name: str = Query("", max_length=60)):
    """A warm greeting for the person by name, listing only the things they really have pending."""
    summary = data_store.get_tracking_summary()
    pending = summary.get("pending_reminders", [])
    who = clean_text(name, 60)
    titles = [clean_text(r.get("title", ""), 80) for r in pending[:3] if r.get("title")]

    if language == "hi":
        headline = f"सुप्रभात, {who}!" if who else "सुप्रभात!"
        plan = f"आज आपके काम: {', '.join(titles)}।" if titles else "आज आपके लिए कोई काम तय नहीं है।"
        spoken = f"नमस्ते {who} जी! {plan}" if who else f"नमस्ते! {plan}"
    else:
        headline = f"Good morning, {who}!" if who else "Good morning!"
        plan = f"Today you have: {', '.join(titles)}." if titles else "You have nothing planned today."
        spoken = f"Good morning {who}! {plan}" if who else f"Good morning! {plan}"

    return {
        "headline": headline,
        "spoken_greeting": spoken,
        "summary": summary
    }
