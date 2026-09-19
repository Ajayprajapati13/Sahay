import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.utils.security import RateLimiter, client_key


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
