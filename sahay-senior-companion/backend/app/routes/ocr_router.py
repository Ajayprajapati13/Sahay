from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
from ..services.gemini_service import gemini_service, DocumentReadError

router = APIRouter(prefix="/ocr", tags=["Multimodal Document Understanding"])

UNREADABLE_PHOTO = "I could not read this photo right now. Please try again with a clear, well-lit picture."
NO_PHOTO = "Please take a photo of the document first."

class DocumentAnalyzeRequest(BaseModel):
    image_b64: Optional[str] = Field(None, max_length=6_000_000)

@router.post("/passbook")
async def analyze_passbook_document(req: DocumentAnalyzeRequest):
    """Reads a photographed bank passbook with Gemini. Returns an error, never sample data, if it cannot be read."""
    if not req.image_b64:
        raise HTTPException(status_code=422, detail=NO_PHOTO)
    try:
        result = await gemini_service.analyze_passbook(image_b64=req.image_b64)
    except DocumentReadError:
        raise HTTPException(status_code=503, detail=UNREADABLE_PHOTO)
    return {
        "status": "success",
        "data": result
    }

@router.post("/prescription")
async def analyze_prescription_document(req: DocumentAnalyzeRequest):
    """Reads a photographed prescription with Gemini. Returns an error, never sample data, if it cannot be read."""
    if not req.image_b64:
        raise HTTPException(status_code=422, detail=NO_PHOTO)
    try:
        result = await gemini_service.analyze_prescription(image_b64=req.image_b64)
    except DocumentReadError:
        raise HTTPException(status_code=503, detail=UNREADABLE_PHOTO)
    return {
        "status": "success",
        "data": result
    }
