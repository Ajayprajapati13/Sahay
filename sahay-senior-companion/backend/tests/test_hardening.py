import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.utils.security import RateLimiter, clean_deep, clean_text, client_key


def _client():
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://test")


@pytest.mark.asyncio
@pytest.mark.parametrize("path", [
    "/%2e%2e/%2e%2e/backend/app/config.py",
    "/..%2f..%2fbackend/data/sahay_state.json",
    "/%2e%2e/%2e%2e/%2e%2e/etc/passwd",
])
async def test_static_route_blocks_path_traversal(path):
    async with _client() as client:
        res = await client.get(path)
    body = res.text
    assert "class Settings" not in body
    assert '"profile"' not in body
    assert "root:" not in body


@pytest.mark.asyncio
async def test_public_files_still_served():
    async with _client() as client:
        for path, kind in [("/manifest.json", "json"), ("/icons/icon-192.png", "image/png"), ("/sw.js", "javascript")]:
            res = await client.get(path)
            assert res.status_code == 200
            assert kind in res.headers["content-type"]


@pytest.mark.asyncio
async def test_unknown_api_path_is_json_404_not_app_shell():
    async with _client() as client:
        res = await client.get("/api/does-not-exist")
    assert res.status_code == 404
    assert "text/html" not in res.headers["content-type"]


@pytest.mark.asyncio
async def test_security_headers_present():
    async with _client() as client:
        res = await client.get("/api/health-check")
    assert res.headers["x-content-type-options"] == "nosniff"
    assert res.headers["x-frame-options"] == "DENY"


@pytest.mark.asyncio
async def test_oversized_inputs_rejected():
    async with _client() as client:
        big_image = await client.post("/api/ocr/passbook", json={"image_b64": "A" * 6_000_001})
        big_text = await client.post("/api/scam/check", json={"text": "x" * 5001})
        big_query = await client.post("/api/ai/intent", json={"text": "x" * 2001})
    assert big_image.status_code == 422
    assert big_text.status_code == 422
    assert big_query.status_code == 422


class _Req:
    def __init__(self, headers=None, host="10.0.0.1"):
        self.headers = headers or {}
        self.client = type("C", (), {"host": host})()


def test_client_key_is_per_client_and_ignores_spoofed_prefix():
    assert client_key(_Req(host="1.1.1.1"), "s") != client_key(_Req(host="2.2.2.2"), "s")
    # a client-supplied leading entry must not change the key; the proxy-appended one wins
    spoofed = _Req({"x-forwarded-for": "9.9.9.9, 203.0.113.7"})
    honest = _Req({"x-forwarded-for": "203.0.113.7"})
    assert client_key(spoofed, "s") == client_key(honest, "s")


def test_rate_limit_is_isolated_between_clients():
    limiter = RateLimiter(max_requests=2, window_seconds=60)
    a, b = client_key(_Req(host="1.1.1.1"), "book"), client_key(_Req(host="2.2.2.2"), "book")
    assert limiter.is_allowed(a)[0] and limiter.is_allowed(a)[0]
    assert limiter.is_allowed(a)[0] is False
    assert limiter.is_allowed(b)[0] is True


# ---- stored-XSS defence: markup is stripped from anything the API stores in shared state



def test_clean_text_strips_markup_but_keeps_punctuation():
    assert clean_text('<img src=x onerror="alert(1)">Dr X') == "Dr X"
    assert clean_text("<script>alert(1)</script>Hi") == "alert(1)Hi"
    assert "<" not in clean_text("<img src=x onerror=alert(1)")  # unclosed tag
    assert clean_text("Daughter's house & \"garden\"") == "Daughter's house & \"garden\""
    assert clean_text("x" * 900) == "x" * 500


def test_clean_deep_handles_nested_structures():
    dirty = [{"name": "<svg onload=1>Aspirin", "tags": ["<b>a</b>", 3, None]}]
    assert clean_deep(dirty) == [{"name": "Aspirin", "tags": ["a", 3, None]}]


@pytest.mark.asyncio
async def test_hostile_bank_and_health_input_is_never_stored_as_markup():
    hostile = '<img src=x onerror="window.__xss=1">'
    async with _client() as client:
        bank = await client.post("/api/bank/complete", json={
            "action_type": "cash_withdrawal", "resolved": True,
            "bank_name": hostile + "SBI", "branch": "<script>alert(1)</script>Main", "amount": "1"})
        health = await client.post("/api/health/log-visit", json={
            "doctor": hostile + "Dr X", "plain_summary": "<b>hi</b> & bye",
            "medicines": [{"name": "<svg onload=1>Aspirin", "dosage": "75mg", "when": "morning", "purpose": "<i>heart</i>"}]})
        state = await client.get("/api/bank/activities")
    assert bank.status_code == 200 and health.status_code == 200
    stored = bank.text + health.text + state.text
    assert "<" not in stored.replace("\u003c", "<")
    assert "onerror" not in bank.json()["activity"]["bank_name"]
    assert health.json()["visit"]["plain_summary"] == "hi & bye"
    assert health.json()["visit"]["medicines"][0]["name"] == "Aspirin"


@pytest.mark.asyncio
async def test_transport_destination_keeps_apostrophes_and_ampersands():
    async with _client() as client:
        res = await client.post("/api/transport/estimate-fare", json={"destination": "Daughter's house & <u>garden</u>"})
    assert res.json()["destination"] == "Daughter's house & garden"
