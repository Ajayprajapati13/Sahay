from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from ..services.gemini_service import gemini_service

router = APIRouter(prefix="/ocr", tags=["Multimodal Document Understanding"])

class DocumentAnalyzeRequest(BaseModel):
    image_b64: Optional[str] = Field(None, max_length=6_000_000)
    doc_type: Optional[str] = "passbook"
    sample_id: Optional[str] = None

@router.post("/passbook")
async def analyze_passbook_document(req: DocumentAnalyzeRequest):
    """Analyzes a photographed bank passbook with multimodal OCR & fraud checking."""
    result = await gemini_service.analyze_passbook(image_b64=req.image_b64)
    return {
        "status": "success",
        "data": result
    }

@router.post("/prescription")
async def analyze_prescription_document(req: DocumentAnalyzeRequest):
    """Analyzes a photographed medical prescription, extracting dosage & directions."""
    result = await gemini_service.analyze_prescription(image_b64=req.image_b64)
    return {
        "status": "success",
        "data": result
    }

@router.get("/samples")
async def get_sample_documents():
    """Provides authentic pre-loaded samples for instant demo testing."""
    return {
        "passbooks": [
            {
                "id": "sample-sbi-pension",
                "title": "State Bank of India (SBI) - Pension Savings Passbook",
                "branch": "Malleshwaram 8th Cross, Bengaluru",
                "account_masked": "SBI •••• 4821",
                "holder": "Ajay Kumar Sharma",
                "description": "Clean photo of senior citizen pension account passbook."
            }
        ],
        "prescriptions": [
            {
                "id": "sample-rx-cardiology",
                "title": "Apollo Cardiology Consultation Slip",
                "doctor": "Dr. V. Sharma (M.D. Cardiology)",
                "medicines_count": 3,
                "description": "Monthly prescription for Telmisartan BP tablets and Atorvastatin."
            }
        ],
        "scam_samples": [
            {
                "id": "sample-scam-electricity",
                "title": "Fake Electricity Disconnection SMS",
                "text": "Dear Consumer, your electricity power will be disconnected tonight at 9:30 PM from power office because your previous month bill was not update. Please immediately call electricity officer at 9876543210. BESCOM/TNEB.",
                "threat": "CRITICAL"
            },
            {
                "id": "sample-scam-pension",
                "title": "Fake Pension Digital Life Certificate APK SMS",
                "text": "Dear Pensioner, your monthly pension credit is on hold due to missing Life Certificate (Jeevan Pramaan). Urgently download and install PensionUpdate.apk from http://fake-pension-gov.in/app to avoid account cancellation.",
                "threat": "CRITICAL"
            }
        ]
    }
