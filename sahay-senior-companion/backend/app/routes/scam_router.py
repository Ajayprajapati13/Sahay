from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from ..services.gemini_service import gemini_service
from ..services.data_store import data_store
from ..utils.security import sanitize_text

router = APIRouter(prefix="/scam", tags=["Scam & Trust Guardian Layer"])

class ScamCheckRequest(BaseModel):
    text: Optional[str] = ""
    image_b64: Optional[str] = None
    source: Optional[str] = "forwarded_message"

@router.post("/check")
async def analyze_message_for_scam(req: ScamCheckRequest):
    """Background or user-triggered scan for fraud patterns, explaining risk in plain language."""
    content = sanitize_text(req.text or "")
    if not content and not req.image_b64:
        raise HTTPException(status_code=400, detail="Provide text or image to inspect")

    analysis = await gemini_service.analyze_scam(content_text=content, image_b64=req.image_b64)

    # Record to data store for safety statistics and family view audit
    data_store.add_scam_inspection({
        "source": req.source,
        "is_scam": analysis.get("is_scam", False),
        "threat_level": analysis.get("threat_level", "SAFE"),
        "scam_type": analysis.get("scam_type", "Unknown"),
        "headline": analysis.get("plain_headline", ""),
        "snippet": content[:100] if content else "Uploaded Screenshot"
    })

    return {
        "status": "success",
        "result": analysis
    }

@router.get("/history")
async def get_scam_history():
    """Returns list of recent safety checks and blocked threats."""
    return {
        "status": "success",
        "inspections": data_store.get_scam_inspections()
    }
