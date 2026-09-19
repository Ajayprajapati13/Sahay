import re
import html
import time
from typing import Dict, Tuple

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
        return True, 0

# Global rate limiters
booking_rate_limiter = RateLimiter(max_requests=5, window_seconds=60)
submission_rate_limiter = RateLimiter(max_requests=8, window_seconds=60)
