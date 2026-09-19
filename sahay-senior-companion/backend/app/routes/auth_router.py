import hashlib
from typing import Optional

from fastapi import APIRouter, Header, HTTPException, Request
from pydantic import Field

from ..services import auth_service
from ..utils.security import CleanModel, RateLimiter, client_key

router = APIRouter(prefix="/auth", tags=["Sign in with mobile number"])

# Best-effort limits on this server; Twilio Verify enforces its own limits too, and that is what protects the bill.
send_by_client = RateLimiter(max_requests=5, window_seconds=600)
send_by_phone = RateLimiter(max_requests=3, window_seconds=600)
verify_by_client = RateLimiter(max_requests=10, window_seconds=60)

NOT_ENABLED = "Signing in with a mobile number is not switched on yet. You can still save your name."
BAD_PHONE = "Please enter a valid 10-digit Indian mobile number."


class StartRequest(CleanModel):
    phone: str = Field(..., max_length=25)


class VerifyRequest(CleanModel):
    phone: str = Field(..., max_length=25)
    code: str = Field(..., pattern=r"^\d{4,8}$")
    name: str = Field("", max_length=60)


def _require_enabled() -> None:
    if not auth_service.sms_login_enabled():
        raise HTTPException(status_code=503, detail=NOT_ENABLED)


def _phone_or_422(raw: str) -> str:
    phone = auth_service.normalize_phone(raw)
    if not phone:
        raise HTTPException(status_code=422, detail=BAD_PHONE)
    return phone


def _too_many(retry: int) -> HTTPException:
    return HTTPException(status_code=429, detail=f"Please wait {retry} seconds and try again.")


@router.get("/status")
async def auth_status():
    """Tells the page whether sign-in by SMS code is available, so it never offers something that cannot work."""
    return {"sms_login": auth_service.sms_login_enabled()}


@router.post("/start")
async def start_sign_in(req: StartRequest, request: Request):
    """Texts a one-time code to the mobile number."""
    _require_enabled()
    phone = _phone_or_422(req.phone)
    for limiter, key in ((send_by_client, client_key(request, "otp-start")),
                         (send_by_phone, "otp-phone:" + hashlib.sha256(phone.encode()).hexdigest()[:16])):
        allowed, retry = limiter.is_allowed(key)
        if not allowed:
            raise _too_many(retry)
    try:
        await auth_service.start_verification(phone)
    except auth_service.AuthError as e:
        if e.kind == "invalid_phone":
            raise HTTPException(status_code=422, detail=BAD_PHONE)
        if e.kind == "rate_limited":
            raise HTTPException(status_code=429, detail="Too many codes were requested. Please wait a few minutes.")
        raise HTTPException(status_code=503, detail="I could not send the code right now. Please try again in a moment.")
    return {"status": "sent", "phone_masked": auth_service.mask_phone(phone)}


@router.post("/verify")
async def verify_sign_in(req: VerifyRequest, request: Request):
    """Checks the code; on success returns a session token, the name and the masked number."""
    _require_enabled()
    phone = _phone_or_422(req.phone)
    allowed, retry = verify_by_client.is_allowed(client_key(request, "otp-verify"))
    if not allowed:
        raise _too_many(retry)
    try:
        approved = await auth_service.check_verification(phone, req.code)
    except auth_service.AuthError as e:
        if e.kind == "rate_limited":
            raise HTTPException(status_code=429, detail="Too many attempts. Please wait a few minutes.")
        raise HTTPException(status_code=503, detail="I could not check the code right now. Please try again in a moment.")
    if not approved:
        raise HTTPException(status_code=401, detail="That code is not correct or has expired. Please try again.")
    return {
        "status": "success",
        "token": auth_service.issue_token(phone, req.name),
        "profile": {"name": req.name, "phone_masked": auth_service.mask_phone(phone)},
    }


@router.get("/me")
async def who_am_i(authorization: Optional[str] = Header(None)):
    """Returns the signed-in person's details, or 401 if the session is missing, forged or expired."""
    token = authorization[7:] if authorization and authorization.lower().startswith("bearer ") else ""
    payload = auth_service.read_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Please sign in again.")
    return {"status": "success", "profile": {"name": payload.get("name", ""), "phone_masked": payload.get("pm", "")}}
