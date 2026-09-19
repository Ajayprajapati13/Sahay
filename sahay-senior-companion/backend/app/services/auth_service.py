"""Sign in with a mobile number: SMS one-time codes through Twilio Verify, and signed session tokens.

Twilio generates, sends, expires and rate-limits the codes, so this server stores no codes and no accounts.
That also means it works on serverless hosts, where memory and disk do not last between requests.
"""

import base64
import hashlib
import hmac
import json
import logging
import re
import time
from typing import Any, Dict, Optional

import httpx

from ..config import settings
from ..utils.security import clean_text

logger = logging.getLogger("sahay.auth")

TOKEN_TTL_SECONDS = 30 * 24 * 3600
MIN_SECRET_LENGTH = 32
VERIFY_API = "https://verify.twilio.com/v2/Services/{service}/{action}"


class AuthError(Exception):
    """kind is one of: invalid_phone, rate_limited, unavailable."""

    def __init__(self, kind: str):
        super().__init__(kind)
        self.kind = kind


def sms_login_enabled() -> bool:
    """Sign-in is only offered when Twilio is configured AND there is a private signing key.

    Without a strong SECRET_KEY anyone could forge a session token, so we refuse to run rather than pretend.
    """
    return bool(
        settings.twilio_account_sid
        and settings.twilio_auth_token
        and settings.twilio_verify_service_sid
        and len(settings.secret_key) >= MIN_SECRET_LENGTH
    )


def normalize_phone(raw: Any) -> Optional[str]:
    """Returns the number in E.164 form (+919876543210), or None if it is not an allowed mobile number."""
    digits = re.sub(r"[\s\-().]", "", str(raw or ""))
    if digits.startswith("00"):
        digits = "+" + digits[2:]
    if re.fullmatch(r"[6-9]\d{9}", digits):
        digits = "+91" + digits
    elif re.fullmatch(r"0[6-9]\d{9}", digits):
        digits = "+91" + digits[1:]
    elif re.fullmatch(r"91[6-9]\d{9}", digits):
        digits = "+" + digits
    if not re.fullmatch(r"\+\d{8,15}", digits):
        return None
    if digits.startswith("+91") and not re.fullmatch(r"\+91[6-9]\d{9}", digits):
        return None
    # Only listed countries can receive codes: stops "SMS pumping" fraud to premium-rate numbers.
    allowed = [p.strip() for p in settings.sms_allowed_prefixes.split(",") if p.strip()]
    if allowed and not any(digits.startswith(prefix) for prefix in allowed):
        return None
    return digits


def mask_phone(e164: str) -> str:
    return f"{e164[:3]} •••••• {e164[-4:]}"


async def _twilio(action: str, data: Dict[str, str]) -> httpx.Response:
    url = VERIFY_API.format(service=settings.twilio_verify_service_sid, action=action)
    async with httpx.AsyncClient(timeout=10.0) as client:
        return await client.post(url, data=data, auth=(settings.twilio_account_sid, settings.twilio_auth_token))


def _raise_for(status_code: int, body_text: str) -> None:
    if status_code == 429:
        raise AuthError("rate_limited")
    if status_code == 400 and "60200" in body_text:  # Twilio: invalid parameter (phone number)
        raise AuthError("invalid_phone")
    logger.warning(f"Twilio Verify returned {status_code}: {body_text[:200]}")
    raise AuthError("unavailable")


async def start_verification(phone: str) -> None:
    """Asks Twilio to text a one-time code to the phone. Raises AuthError on failure."""
    try:
        resp = await _twilio("Verifications", {"To": phone, "Channel": "sms"})
    except httpx.HTTPError as e:
        logger.warning(f"Could not reach Twilio Verify: {e}")
        raise AuthError("unavailable")
    if resp.status_code not in (200, 201):
        _raise_for(resp.status_code, resp.text)


async def check_verification(phone: str, code: str) -> bool:
    """True only if Twilio confirms the code is right and still valid."""
    try:
        resp = await _twilio("VerificationCheck", {"To": phone, "Code": code})
    except httpx.HTTPError as e:
        logger.warning(f"Could not reach Twilio Verify: {e}")
        raise AuthError("unavailable")
    if resp.status_code == 404:  # no pending code: expired, already used, or too many attempts
        return False
    if resp.status_code != 200:
        _raise_for(resp.status_code, resp.text)
    return resp.json().get("status") == "approved"


# ---- session tokens: stateless, HMAC-signed, so any server instance can verify them

def _b64(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode()


def _unb64(text: str) -> bytes:
    return base64.urlsafe_b64decode(text + "=" * (-len(text) % 4))


def _sign(message: str) -> str:
    return _b64(hmac.new(settings.secret_key.encode(), message.encode(), hashlib.sha256).digest())


def issue_token(phone: str, name: str) -> str:
    """Creates a session token. It holds a one-way id (not the phone number), the name and a masked number."""
    payload = {
        "sub": hmac.new(settings.secret_key.encode(), f"user:{phone}".encode(), hashlib.sha256).hexdigest()[:24],
        "name": clean_text(name, 60),
        "pm": mask_phone(phone),
        "exp": int(time.time()) + TOKEN_TTL_SECONDS,
    }
    body = _b64(json.dumps(payload, separators=(",", ":"), ensure_ascii=False).encode())
    return f"{body}.{_sign(body)}"


def read_token(token: str) -> Optional[Dict[str, Any]]:
    """Returns the token's contents if the signature is valid and it has not expired, otherwise None."""
    if len(settings.secret_key) < MIN_SECRET_LENGTH or not token or token.count(".") != 1:
        return None
    body, signature = token.split(".")
    if not hmac.compare_digest(signature, _sign(body)):
        return None
    try:
        payload = json.loads(_unb64(body))
    except ValueError:
        return None
    if not isinstance(payload, dict) or int(payload.get("exp", 0)) < time.time():
        return None
    return payload
