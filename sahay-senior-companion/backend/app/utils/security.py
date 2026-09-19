import re
import html
import time
from typing import Dict, Tuple
from pydantic import BaseModel, field_validator

def mask_account_number(acc: str, prefix: str = "") -> str:
    """Masks financial account numbers showing only the last 4 digits."""
    if not acc:
        return "•••• 0000"
    cleaned = re.sub(r'[\s\-]', '', str(acc))
    if len(cleaned) <= 4:
        if prefix:
            return f"{prefix} •••• {cleaned}"
        return f"•••• {cleaned}"
    last4 = cleaned[-4:]
    if prefix:
        return f"{prefix} •••• {last4}"
    return f"•••• {last4}"

def mask_identifier(ident: str) -> str:
    """Masks general personal identifiers (like Aadhaar, PAN) showing only minimal suffix."""
    if not ident:
        return "••••"
    cleaned = re.sub(r'[\s\-]', '', str(ident))
    if len(cleaned) <= 4:
        return f"•••• {cleaned}"
    return f"•••• •••• {cleaned[-4:]}"

def sanitize_text(text: str) -> str:
    """Sanitizes user input and OCR extractions against XSS and unwanted control characters."""
    if not text:
        return ""
    # Strip HTML tags
    cleaned = re.sub(r'<[^>]*?>', '', str(text))
    # Escape dangerous entities
    escaped = html.escape(cleaned, quote=True)
    # Normalize whitespace
    normalized = re.sub(r'\s+', ' ', escaped).strip()
    return normalized

def clean_text(text, max_len: int = 500) -> str:
    """Strips markup and control characters from free text that will be stored and shown later.

    Deliberately does NOT entity-escape: the frontend encodes at output (esc() in safe-html.js),
    and escaping in both places would show literal "&amp;". Tags are removed and any stray
    angle brackets dropped, so nothing that looks like markup ever reaches shared state.
    """
    cleaned = re.sub(r'<[^>]*>', '', str(text))
    cleaned = cleaned.replace('<', '').replace('>', '')
    cleaned = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', cleaned)
    return cleaned.strip()[:max_len]

def clean_deep(value, max_len: int = 500):
    """Applies clean_text to every string inside nested dicts and lists (bounded in size)."""
    if isinstance(value, str):
        return clean_text(value, max_len)
    if isinstance(value, dict):
        return {clean_text(k, 100): clean_deep(v, max_len) for k, v in list(value.items())[:50]}
    if isinstance(value, list):
        return [clean_deep(v, max_len) for v in value[:50]]
    return value

class CleanModel(BaseModel):
    """Request-model base class: every string field is markup-stripped before it can be stored."""

    @field_validator("*", mode="before")
    @classmethod
    def _strip_markup(cls, value):
        return clean_deep(value)

def client_key(request, scope: str) -> str:
    """Builds a per-client rate-limit key so one user's activity never throttles another's.

    Uses the last X-Forwarded-For entry (the address our own proxy saw, so a client
    can't spoof it by sending its own header), falling back to the socket address.
    """
    forwarded = request.headers.get("x-forwarded-for", "")
    ip = forwarded.split(",")[-1].strip() if forwarded else ""
    if not ip and request.client:
        ip = request.client.host
    return f"{scope}:{ip or 'unknown'}"

class RateLimiter:
    """In-memory rate limiter for sensitive actions like cab bookings, money confirmations, and submissions."""
    def __init__(self, max_requests: int = 10, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.history: Dict[str, list[float]] = {}

    def is_allowed(self, client_id: str) -> Tuple[bool, int]:
        now = time.time()
        timestamps = self.history.get(client_id, [])
        # Filter out timestamps outside the window
        valid_timestamps = [t for t in timestamps if now - t < self.window_seconds]
        if len(valid_timestamps) >= self.max_requests:
            retry_after = int(self.window_seconds - (now - valid_timestamps[0]))
            self.history[client_id] = valid_timestamps
            return False, max(1, retry_after)
        valid_timestamps.append(now)
        self.history[client_id] = valid_timestamps
        # Drop clients whose windows have fully expired so the dict can't grow without bound.
        if len(self.history) > 1000:
            self.history = {k: v for k, v in self.history.items() if v and now - v[-1] < self.window_seconds}
        return True, 0

# Global rate limiters
booking_rate_limiter = RateLimiter(max_requests=5, window_seconds=60)
submission_rate_limiter = RateLimiter(max_requests=8, window_seconds=60)
