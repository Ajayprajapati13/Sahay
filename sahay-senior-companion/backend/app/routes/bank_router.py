from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from ..services.gemini_service import gemini_service
from ..services.data_store import data_store
from ..utils.security import mask_account_number, sanitize_text, submission_rate_limiter, client_key

router = APIRouter(prefix="/bank", tags=["Journey 1: Bank & Government Visit"])

class BankPrepareRequest(BaseModel):
    purpose: str # "withdraw_cash", "pension_check", "kyc_update", "form_15h"
    amount: Optional[str] = "10000"
    bank_name: Optional[str] = "State Bank of India"
    branch_name: Optional[str] = "Malleshwaram 8th Cross"
    account_number: Optional[str] = "4821"
    customer_name: Optional[str] = "Ajay Kumar Sharma"

class KioskCheckinRequest(BaseModel):
    account_masked: Optional[str] = "SBI •••• 4821"
    purpose: str
    token_code: Optional[str] = "C-42"

class BankCompleteRequest(BaseModel):
    action_type: str # "cash_withdrawal", "pension_inquiry", "kyc_update"
    amount: Optional[str] = "₹10,000"
    resolved: bool = True
    unresolved_reason: Optional[str] = ""
    bank_name: Optional[str] = "State Bank of India"
    branch: Optional[str] = "Malleshwaram 8th Cross"
    account_masked: Optional[str] = "SBI •••• 4821"

class DraftLetterRequest(BaseModel):
    senior_name: Optional[str] = "Ajay Kumar Sharma"
    bank_name: Optional[str] = "State Bank of India"
    branch: Optional[str] = "Malleshwaram 8th Cross"
    account_masked: Optional[str] = "SBI •••• 4821"
    issue_description: str
    visit_date: Optional[str] = "September 19, 2026"

@router.post("/prepare")
async def prepare_bank_visit(req: BankPrepareRequest):
    """Prepares personalized document checklist, pre-filled slips, and landmark navigation."""
    masked_acc = mask_account_number(req.account_number, prefix="SBI")
    purpose_key = req.purpose.lower()

    # Dynamic document checklists per purpose
    if "pension" in purpose_key:
        checklist = [
            "1. Original Bank Passbook (for pension credit verification)",
            "2. Life Certificate (Jeevan Pramaan) acknowledgement slip or Aadhaar card",
            "3. PPO (Pension Payment Order) copy / booklet",
            "4. Cash withdrawal slip or self cheque (if withdrawing funds)"
        ]
        prefilled_form = {
            "title": "Pension Arrears & Verification Requisition Slip",
            "fields": {
                "Account Holder": req.customer_name,
                "Account Number": masked_acc,
                "Branch": req.branch_name,
                "Request": "Verification of delayed pension credit for September 2026",
                "Senior Citizen Priority": "Yes (Category: Super Senior 70+)"
            }
        }
        spoken = "I have prepared your State Bank visit plan. Please make sure you bring your original passbook and pension order booklet. I also pre-filled your verification slip."
    elif "kyc" in purpose_key:
        checklist = [
            "1. Original Bank Passbook",
            "2. Photocopy of Aadhaar Card (self-attested with signature)",
            "3. Photocopy of PAN Card",
            "2 Two recent passport-size photographs"
        ]
        prefilled_form = {
            "title": "Customer Profile & KYC Update Slip",
            "fields": {
                "Account Holder": req.customer_name,
                "Account Number": masked_acc,
                "Branch": req.branch_name,
                "Fields to Update": "Mobile Phone Number and Address Confirmation",
                "Assistance Needed": "Wheelchair / Ground Floor Counter Support"
            }
        }
        spoken = "Your KYC checklist is ready. Carry two passport photos and your self-attested Aadhaar photocopy."
    else: # Cash withdrawal default
        checklist = [
            "1. Original Bank Passbook (Mandatory for counter cash withdrawals)",
            "2. Pre-filled Savings Bank Cash Withdrawal Slip",
            "3. Pen and reading glasses for counter signing"
        ]
        prefilled_form = {
            "title": "SBI Savings Bank Cash Withdrawal Slip",
            "fields": {
                "Account Holder": req.customer_name,
                "Account Number": masked_acc,
                "Branch": req.branch_name,
                "Amount in Figures": f"₹{req.amount}",
                "Amount in Words": "Rupees Ten Thousand Only",
                "Signature Status": "Sign on the front and twice on the back at the counter"
            }
        }
        spoken = f"I have prepared your cash withdrawal slip for ₹{req.amount}. Remember to carry your original passbook."

    route_info = {
        "landmark_directions": "From your home, take Margosa Road past the Post Office (200 meters). The SBI Branch is directly opposite the heritage Banyan tree and flower market. An elevator is available right at the entrance.",
        "distance": "2.4 km",
        "estimated_cab_time": "10-12 mins",
        "estimated_cab_fare": "₹140 - ₹155"
    }

    return {
        "status": "success",
        "purpose": req.purpose,
        "masked_account": masked_acc,
        "checklist": checklist,
        "prefilled_form": prefilled_form,
        "route_info": route_info,
        "spoken_response": spoken
    }

@router.post("/kiosk-checkin")
async def kiosk_checkin(req: KioskCheckinRequest):
    """Simulates branch arrival check-in at the branch kiosk/companion screen."""
    return {
        "status": "success",
        "checked_in": True,
        "token_number": req.token_code,
        "current_token_serving": "C-38",
        "people_ahead": 4,
        "estimated_wait_minutes": 10,
        "assigned_counter": "Counter 3 (Senior Citizen Priority Counter)",
        "officer_name": "Mr. Satish Narayanan (Customer Service Associate)",
        "plain_guidance": "Please relax on the cushioned green chairs right in front of Counter 3. You have 4 people ahead of you, so you will be called in about 10 minutes.",
        "spoken_guidance": "Welcome to State Bank Malleshwaram. Your token is C-42. 4 people are ahead of you. Please sit comfortably near Counter 3."
    }

@router.post("/complete")
async def complete_bank_action(req: BankCompleteRequest, request: Request):
    """Logs the completed or unresolved transaction to Bank Account Activity Tracker."""
    allowed, retry = submission_rate_limiter.is_allowed(client_key(request, "bank_complete"))
    if not allowed:
        raise HTTPException(status_code=429, detail=f"Please wait {retry} seconds before logging again.")

    if req.resolved:
        plain_text = f"On September 19, 2026, you successfully completed your {req.action_type.replace('_', ' ')} of {req.amount} at {req.bank_name}, {req.branch}. Your transaction slip is safely recorded."
        activity = data_store.add_bank_activity({
            "action_type": req.action_type,
            "bank_name": req.bank_name,
            "branch": req.branch,
            "account_masked": req.account_masked,
            "amount": req.amount,
            "plain_text": plain_text,
            "status": "completed"
        })
        return {
            "status": "success",
            "resolved": True,
            "activity": activity,
            "spoken_summary": plain_text
        }
    else:
        # Unresolved: generate formal letter and set reminder
        reason = req.unresolved_reason or "Pension not credited for September 2026 due to backend verification delay"
        drafted_letter = await gemini_service.draft_bank_letter(
            senior_name="Ajay Kumar Sharma",
            bank_name=req.bank_name or "State Bank of India",
            branch=req.branch or "Malleshwaram 8th Cross",
            account_masked=req.account_masked or "SBI •••• 4821",
            issue_description=reason
        )

        reminder = data_store.add_reminder({
            "category": "bank",
            "title": "Follow up with SBI Branch Manager",
            "detail": f"Check status of pension credit enquiry (Letter ref: {reason[:40]}).",
            "due_time": "In 3 Days (Tuesday, Sept 22, 11:00 AM)",
            "status": "pending",
            "audio_alert": True
        })

        plain_text = f"Your branch visit on September 19 is recorded as unresolved: '{reason}'. A formal follow-up letter to the Branch Manager has been drafted, and a reminder is set for Tuesday morning."
        activity = data_store.add_bank_activity({
            "action_type": req.action_type,
            "bank_name": req.bank_name,
            "branch": req.branch,
            "account_masked": req.account_masked,
            "amount": req.amount,
            "plain_text": plain_text,
            "status": "follow_up_scheduled",
            "drafted_letter": drafted_letter,
            "reminder_id": reminder.get("id")
        })

        return {
            "status": "success",
            "resolved": False,
            "activity": activity,
            "drafted_letter": drafted_letter,
            "reminder": reminder,
            "spoken_summary": "I have logged this visit. Because your pension is still pending, I have drafted a formal follow-up letter to the Branch Manager and scheduled a reminder for Tuesday."
        }

@router.post("/draft-letter")
async def draft_letter(req: DraftLetterRequest):
    """Generates formal letter on demand for any bank dispute or grievance."""
    letter = await gemini_service.draft_bank_letter(
        senior_name=req.senior_name or "Ajay Kumar Sharma",
        bank_name=req.bank_name or "State Bank of India",
        branch=req.branch or "Malleshwaram 8th Cross",
        account_masked=req.account_masked or "SBI •••• 4821",
        issue_description=req.issue_description,
        visit_date=req.visit_date or "September 19, 2026"
    )
    return {
        "status": "success",
        "letter": letter
    }

@router.get("/activities")
async def get_bank_activities():
    """Returns the plain-language Bank Account Activity Tracker items."""
    return {
        "status": "success",
        "activities": data_store.get_bank_activities()
    }
