import json
import time

import pytest
from httpx import ASGITransport, AsyncClient

from app.config import settings
from app.main import app
from app.routes import auth_router
from app.services import auth_service as auth
from app.services import data_store as ds

SECRET = "test-secret-key-that-is-long-enough-1234567890"
PHONE = "9876543210"


def _client():
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://test")


class _Twilio:
    """Stands in for Twilio Verify and records what we asked it."""

    def __init__(self):
        self.calls = []
        self.start_status = 201
        self.start_body = ""
        self.check_status = 200
        self.check_result = "approved"
        self.error = None

    async def __call__(self, action, data):
        self.calls.append((action, dict(data)))
        if self.error:
            raise self.error

        class Resp:
            pass

        r = Resp()
        if action == "Verifications":
            r.status_code, r.text = self.start_status, self.start_body
            r.json = lambda: {}
        else:
            r.status_code, r.text = self.check_status, ""
            r.json = lambda: {"status": self.check_result}
        return r


@pytest.fixture
def twilio(monkeypatch):
    """Sign-in fully configured, Twilio mocked, rate limiters empty."""
    monkeypatch.setattr(settings, "secret_key", SECRET)
    monkeypatch.setattr(settings, "twilio_account_sid", "ACtest")
    monkeypatch.setattr(settings, "twilio_auth_token", "token")
    monkeypatch.setattr(settings, "twilio_verify_service_sid", "VAtest")
    monkeypatch.setattr(settings, "sms_allowed_prefixes", "+91")
    fake = _Twilio()
    monkeypatch.setattr(auth, "_twilio", fake)
    for limiter in (auth_router.send_by_client, auth_router.send_by_phone, auth_router.verify_by_client):
        limiter.history.clear()
    return fake


# ---- phone numbers

@pytest.mark.parametrize("raw", ["9876543210", "098765 43210", "+91 98765-43210", "919876543210", "0091 98765 43210", "(98765) 43210"])
def test_indian_mobile_numbers_are_normalised(raw):
    assert auth.normalize_phone(raw) == "+919876543210"


@pytest.mark.parametrize("raw", ["", "abc", "98765", "1234567890", "5876543210", "+91 5876543210", "+14155552671", "+4402079460958"])
def test_invalid_or_foreign_numbers_are_rejected(raw, monkeypatch):
    monkeypatch.setattr(settings, "sms_allowed_prefixes", "+91")
    assert auth.normalize_phone(raw) is None


def test_other_countries_can_be_allowed_explicitly(monkeypatch):
    monkeypatch.setattr(settings, "sms_allowed_prefixes", "+91,+1")
    assert auth.normalize_phone("+1 415 555 2671") == "+14155552671"


def test_masked_number_hides_the_middle():
    assert auth.mask_phone("+919876543210") == "+91 •••••• 3210"


# ---- session tokens

def test_token_round_trip_and_privacy(monkeypatch):
    monkeypatch.setattr(settings, "secret_key", SECRET)
    token = auth.issue_token("+919876543210", "Priya <b>Sharma</b>")
    payload = auth.read_token(token)
    assert payload["name"] == "Priya Sharma" and payload["pm"] == "+91 •••••• 3210"
    assert "9876543210" not in token and "9876543210" not in json.dumps(payload)  # the number itself is never inside


def test_forged_tampered_wrong_key_and_expired_tokens_are_rejected(monkeypatch):
    monkeypatch.setattr(settings, "secret_key", SECRET)
    token = auth.issue_token("+919876543210", "Priya")
    body, sig = token.split(".")
    assert auth.read_token(f"{body[:-2]}xx.{sig}") is None  # payload tampered
    assert auth.read_token(f"{body}.{sig[:-2]}xx") is None  # signature tampered
    assert auth.read_token("garbage") is None and auth.read_token("") is None
    monkeypatch.setattr(settings, "secret_key", "another-secret-key-that-is-also-long-enough-99")
    assert auth.read_token(token) is None  # signed with a different key
    monkeypatch.setattr(settings, "secret_key", SECRET)
    later = time.time() + auth.TOKEN_TTL_SECONDS + 10  # read the real clock once, before patching it
    monkeypatch.setattr(auth.time, "time", lambda: later)
    assert auth.read_token(token) is None  # expired


def test_no_strong_secret_means_no_sign_in(monkeypatch):
    for key in ("", "short", "sahay-senior-guardian-secret-key-2026"[:31]):
        monkeypatch.setattr(settings, "secret_key", key)
        monkeypatch.setattr(settings, "twilio_account_sid", "ACtest")
        monkeypatch.setattr(settings, "twilio_auth_token", "token")
        monkeypatch.setattr(settings, "twilio_verify_service_sid", "VAtest")
        assert auth.sms_login_enabled() is False
        assert auth.read_token("anything.here") is None  # and no token is accepted


def test_there_is_no_public_default_secret():
    assert "sahay-senior-guardian" not in open(auth.__file__, encoding="utf-8").read()
    from app.config import Settings

    assert Settings.model_fields["secret_key"].default == "" or "sahay" not in str(Settings.model_fields["secret_key"].default)


# ---- endpoints

@pytest.mark.asyncio
async def test_status_reports_whether_sign_in_is_available(twilio, monkeypatch):
    async with _client() as client:
        assert (await client.get("/api/auth/status")).json() == {"sms_login": True}
        monkeypatch.setattr(settings, "twilio_verify_service_sid", "")
        assert (await client.get("/api/auth/status")).json() == {"sms_login": False}
        res = await client.post("/api/auth/start", json={"phone": PHONE})
    assert res.status_code == 503 and "not switched on" in res.json()["detail"]


@pytest.mark.asyncio
async def test_start_sends_a_code_and_never_returns_it(twilio):
    async with _client() as client:
        res = await client.post("/api/auth/start", json={"phone": "98765 43210"})
    assert res.status_code == 200
    assert res.json() == {"status": "sent", "phone_masked": "+91 •••••• 3210"}
    assert twilio.calls == [("Verifications", {"To": "+919876543210", "Channel": "sms"})]


@pytest.mark.asyncio
@pytest.mark.parametrize("phone", ["12345", "+14155552671", "abc", ""])
async def test_start_rejects_bad_or_foreign_numbers_without_calling_twilio(twilio, phone):
    async with _client() as client:
        res = await client.post("/api/auth/start", json={"phone": phone})
    assert res.status_code == 422 and twilio.calls == []


@pytest.mark.asyncio
async def test_start_is_limited_per_number_so_nobody_can_be_spammed(twilio):
    async with _client() as client:
        codes = [(await client.post("/api/auth/start", json={"phone": PHONE})).status_code for _ in range(4)]
        other = await client.post("/api/auth/start", json={"phone": "9123456780"})
    assert codes == [200, 200, 200, 429]
    assert other.status_code == 200  # a different number is unaffected
    assert len(twilio.calls) == 4  # the blocked request never reached Twilio


@pytest.mark.asyncio
async def test_twilio_problems_become_clear_errors(twilio):
    async with _client() as client:
        twilio.start_status, twilio.start_body = 429, ""
        assert (await client.post("/api/auth/start", json={"phone": PHONE})).status_code == 429
        auth_router.send_by_phone.history.clear()
        twilio.start_status, twilio.start_body = 400, '{"code": 60200, "message": "Invalid parameter"}'
        assert (await client.post("/api/auth/start", json={"phone": PHONE})).status_code == 422
        auth_router.send_by_phone.history.clear()
        twilio.start_status, twilio.start_body = 500, "boom"
        res = await client.post("/api/auth/start", json={"phone": PHONE})
        assert res.status_code == 503 and "boom" not in res.text  # provider details are never leaked
        auth_router.send_by_phone.history.clear()
        twilio.error = auth.AuthError("unavailable")
        assert (await client.post("/api/auth/start", json={"phone": PHONE})).status_code == 503


@pytest.mark.asyncio
async def test_correct_code_signs_in_and_the_session_works(twilio):
    async with _client() as client:
        res = await client.post("/api/auth/verify", json={"phone": PHONE, "code": "123456", "name": "Priya Sharma"})
        assert res.status_code == 200
        body = res.json()
        assert body["profile"] == {"name": "Priya Sharma", "phone_masked": "+91 •••••• 3210"}
        assert twilio.calls[-1] == ("VerificationCheck", {"To": "+919876543210", "Code": "123456"})
        me = await client.get("/api/auth/me", headers={"Authorization": f"Bearer {body['token']}"})
    assert me.status_code == 200 and me.json()["profile"]["name"] == "Priya Sharma"


@pytest.mark.asyncio
async def test_wrong_expired_or_malformed_codes_do_not_sign_in(twilio):
    async with _client() as client:
        twilio.check_result = "pending"  # Twilio: code did not match
        assert (await client.post("/api/auth/verify", json={"phone": PHONE, "code": "000000"})).status_code == 401
        twilio.check_status = 404  # Twilio: no pending code (expired, used, or too many tries)
        assert (await client.post("/api/auth/verify", json={"phone": PHONE, "code": "123456"})).status_code == 401
        for bad in ("abc123", "12", "123456789", ""):
            assert (await client.post("/api/auth/verify", json={"phone": PHONE, "code": bad})).status_code == 422


@pytest.mark.asyncio
async def test_verify_attempts_are_limited(twilio):
    twilio.check_result = "pending"
    async with _client() as client:
        statuses = [(await client.post("/api/auth/verify", json={"phone": PHONE, "code": "111111"})).status_code for _ in range(12)]
    assert statuses[:10] == [401] * 10 and statuses[10:] == [429, 429]


@pytest.mark.asyncio
async def test_me_rejects_missing_and_forged_sessions(twilio):
    async with _client() as client:
        assert (await client.get("/api/auth/me")).status_code == 401
        assert (await client.get("/api/auth/me", headers={"Authorization": "Bearer abc.def"})).status_code == 401
        assert (await client.get("/api/auth/me", headers={"Authorization": "Basic abc"})).status_code == 401


@pytest.mark.asyncio
async def test_twilio_request_uses_basic_auth_and_the_verify_service(monkeypatch):
    monkeypatch.setattr(settings, "twilio_account_sid", "ACtest")
    monkeypatch.setattr(settings, "twilio_auth_token", "secret-token")
    monkeypatch.setattr(settings, "twilio_verify_service_sid", "VAsvc")
    seen = {}

    class FakeClient:
        def __init__(self, *a, **k):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *a):
            return False

        async def post(self, url, data=None, auth=None):
            seen.update(url=url, data=data, auth=auth)

            class R:
                status_code = 201
                text = ""

            return R()

    monkeypatch.setattr(auth.httpx, "AsyncClient", FakeClient)
    await auth.start_verification("+919876543210")
    assert seen["url"] == "https://verify.twilio.com/v2/Services/VAsvc/Verifications"
    assert seen["auth"] == ("ACtest", "secret-token") and seen["data"]["Channel"] == "sms"


# ---- greeting, empty start and honest letters

@pytest.mark.asyncio
async def test_greeting_uses_the_name_and_only_real_reminders():
    async with _client() as client:
        empty = (await client.get("/api/ai/daily-greeting", params={"name": "Priya"})).json()
        anon = (await client.get("/api/ai/daily-greeting")).json()
        hindi = (await client.get("/api/ai/daily-greeting", params={"name": "Priya", "language": "hi"})).json()
        hostile = (await client.get("/api/ai/daily-greeting", params={"name": "<img src=x onerror=1>Ravi"})).json()
    assert empty["headline"] == "Good morning, Priya!" and "nothing planned" in empty["spoken_greeting"]
    assert anon["headline"] == "Good morning!"
    assert "Priya" in hindi["headline"] and "सुप्रभात" in hindi["headline"]
    assert hostile["headline"] == "Good morning, Ravi!"
    for text in (empty["spoken_greeting"], anon["spoken_greeting"]):
        assert "Ajay" not in text and "blood pressure" not in text.lower() and "State Bank" not in text


@pytest.mark.asyncio
async def test_greeting_lists_the_persons_own_pending_reminders():
    from app.services.data_store import data_store

    data_store.add_reminder({"category": "health", "title": "Take Zinc Greeting Test", "detail": "x", "due_time": "morning"})
    async with _client() as client:
        greeting = (await client.get("/api/ai/daily-greeting", params={"name": "Priya"})).json()
    assert "Take Zinc Greeting Test" in greeting["spoken_greeting"]


def test_a_new_person_starts_with_no_activity_and_no_invented_history(tmp_path, monkeypatch):
    monkeypatch.setattr(ds, "STATE_FILE", str(tmp_path / "state.json"))
    store = ds.DataStore()
    assert store.get_reminders() == [] and store.get_trips() == []
    assert store.get_bank_activities() == [] and store.get_health_visits() == []


@pytest.mark.asyncio
async def test_grievance_letter_uses_the_real_name_not_a_default_person():
    async with _client() as client:
        res = await client.post("/api/bank/complete", json={
            "action_type": "pension_inquiry", "resolved": False, "senior_name": "Priya Sharma",
            "bank_name": "Punjab National Bank", "branch": "Karol Bagh", "account_masked": "•••• 8901",
            "unresolved_reason": "Pension was not credited"})
    letter = res.json()["drafted_letter"]
    assert "Priya Sharma" in letter and "Punjab National Bank" in letter and "Karol Bagh" in letter
    assert "Ajay" not in letter and "Malleshwaram" not in letter
