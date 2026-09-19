import gzip
import json

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.services import data_store as ds
from app.services import gemini_service as gs
from app.services.gemini_service import TTLCache, gemini_service


def _client():
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://test")


# ---- transfer size and caching headers

@pytest.mark.asyncio
async def test_large_text_assets_are_compressed():
    async with _client() as client:
        plain = await client.get("/js/journey-bank.js", headers={"accept-encoding": "identity"})
        packed = await client.get("/js/journey-bank.js", headers={"accept-encoding": "gzip"})
    assert packed.headers["content-encoding"] == "gzip"
    assert len(gzip.compress(plain.content)) < len(plain.content) * 0.5  # text shrinks a lot


@pytest.mark.asyncio
async def test_cache_headers_by_kind_of_response():
    async with _client() as client:
        static = await client.get("/css/sahay-theme.css")
        page = await client.get("/")
        worker = await client.get("/sw.js")
        private = await client.get("/api/health/reminders")
        config = await client.get("/api/config")
    assert "max-age=300" in static.headers["cache-control"]
    assert page.headers["cache-control"] == "no-cache"  # always revalidate the app shell
    assert worker.headers["cache-control"] == "no-cache"
    assert private.headers["cache-control"] == "no-store"  # personal data is never cached
    assert "max-age=300" in config.headers["cache-control"]


# ---- security headers

@pytest.mark.asyncio
async def test_content_security_policy_and_permissions_policy():
    async with _client() as client:
        home = await client.get("/")
        docs = await client.get("/docs")
        api = await client.get("/api/health-check")
    csp = home.headers["content-security-policy"]
    assert "default-src 'self'" in csp and "frame-ancestors 'none'" in csp and "object-src 'none'" in csp
    assert "frame-src https://www.google.com" in csp  # the embedded map
    assert "connect-src 'self'" in csp  # nothing can send data to another site
    assert "content-security-policy" not in docs.headers  # Swagger UI loads assets from a CDN
    assert "camera=(self)" in api.headers["permissions-policy"] and "payment=()" in api.headers["permissions-policy"]


# ---- state: bounded, unique ids, crash-safe

@pytest.fixture
def store(tmp_path, monkeypatch):
    monkeypatch.setattr(ds, "STATE_FILE", str(tmp_path / "state.json"))
    return ds.DataStore()


def test_collections_are_bounded(store):
    for i in range(ds.MAX_ITEMS + 60):
        store.add_scam_inspection({"source": "test", "snippet": str(i)})
    assert len(store.get_scam_inspections()) == ds.MAX_ITEMS
    assert store.get_scam_inspections()[0]["snippet"] == str(ds.MAX_ITEMS + 59)  # newest first


def test_ids_are_unique_even_within_one_second(store):
    ids = {store.add_reminder({"title": f"Take {n}"})["id"] for n in range(50)}
    assert len(ids) == 50


def test_saving_is_atomic_and_readable(store, tmp_path):
    store.add_trip({"destination": "Clinic"})
    saved = json.loads((tmp_path / "state.json").read_text(encoding="utf-8"))
    assert saved["trips"][0]["destination"] == "Clinic"
    assert not (tmp_path / "state.json.tmp").exists()


def test_read_only_filesystem_keeps_working_in_memory(tmp_path, monkeypatch):
    monkeypatch.setattr(ds, "STATE_FILE", str(tmp_path / "missing-dir" / "state.json"))  # cannot be written
    store = ds.DataStore()
    assert store._persist is False  # gave up after the first failure instead of retrying on every write
    store.add_trip({"destination": "Clinic"})
    assert store.get_trips()[0]["destination"] == "Clinic"


def test_bank_activity_no_longer_forces_an_sbi_prefix(store):
    activity = store.add_bank_activity({"account_masked": "•••• 8901", "bank_name": "Punjab National Bank"})
    assert activity["account_masked"] == "•••• 8901"


# ---- Gemini: cache and connection reuse

def test_ttl_cache_expires_evicts_and_returns_copies(monkeypatch):
    cache = TTLCache(max_items=2, ttl_seconds=10)
    now = [1000.0]
    monkeypatch.setattr(gs.time, "monotonic", lambda: now[0])
    cache.set("a", {"v": 1})
    cache.set("b", {"v": 2})
    cache.set("c", {"v": 3})  # evicts the least recently used ("a")
    assert cache.get("a") is None and cache.get("b") == {"v": 2}
    cache.get("b")["v"] = 99  # callers get copies, so they cannot corrupt the cache
    assert cache.get("b") == {"v": 2}
    now[0] += 11
    assert cache.get("b") is None  # expired


@pytest.mark.asyncio
async def test_same_question_only_reaches_gemini_once(monkeypatch):
    calls = []

    async def fake_call(prompt, system_instruction=None, image_b64=None, json_mode=False):
        calls.append(prompt)
        return '{"category": "health", "action": "refill", "confidence": 0.9, "parameters": {}, "spoken_response": "Sure."}'

    monkeypatch.setattr(gemini_service, "api_key", "k")
    monkeypatch.setattr(gemini_service, "_call_gemini_api", fake_call)
    first = await gemini_service.route_intent("I need my tablets", "en")
    second = await gemini_service.route_intent("  i NEED my tablets ", "en")
    assert first == second and len(calls) == 1
    await gemini_service.route_intent("I need my tablets", "hi")  # a different language is a different question
    assert len(calls) == 2


@pytest.mark.asyncio
async def test_scam_verdicts_cached_but_screenshots_and_failures_are_not(monkeypatch):
    calls = []
    replies = [
        '{"is_scam": false, "threat_level": "SAFE", "plain_headline": "Fine", "reasons": [], "safe_action": "", "spoken_warning": ""}',
        None,  # a failure must not be remembered
        '{"is_scam": false, "threat_level": "SAFE", "plain_headline": "Fine", "reasons": [], "safe_action": "", "spoken_warning": ""}',
    ]

    async def fake_call(prompt, system_instruction=None, image_b64=None, json_mode=False):
        calls.append(image_b64)
        return replies.pop(0) if replies else None

    monkeypatch.setattr(gemini_service, "api_key", "k")
    monkeypatch.setattr(gemini_service, "_call_gemini_api", fake_call)
    await gemini_service.analyze_scam("Your gas cylinder is booked.")
    await gemini_service.analyze_scam("Your gas cylinder is booked.")  # served from cache
    assert len(calls) == 1
    failed = await gemini_service.analyze_scam("Milk delivery moved to 7 am.")
    assert failed["checked_by"] == "rules"
    retry = await gemini_service.analyze_scam("Milk delivery moved to 7 am.")  # not cached, so Gemini is asked again
    assert retry["checked_by"] == "gemini" and len(calls) == 3
    await gemini_service.analyze_scam("photo text", image_b64="AAAA")
    await gemini_service.analyze_scam("photo text", image_b64="AAAA")  # screenshots are never cached
    assert len(calls) == 5


@pytest.mark.asyncio
async def test_one_pooled_http_client_is_reused_across_calls(monkeypatch):
    created = []

    class FakeClient:
        def __init__(self, *a, **k):
            created.append(k)

        async def post(self, url, headers=None, json=None):
            class R:
                status_code = 200
                text = ""

                def json(self):
                    return {"candidates": [{"content": {"parts": [{"text": "{}"}]}}]}

            return R()

    monkeypatch.setattr(gs.httpx, "AsyncClient", FakeClient)
    monkeypatch.setattr(gemini_service, "api_key", "k")
    monkeypatch.setattr(gemini_service, "_client", None)
    for _ in range(4):
        await gemini_service._call_gemini_api("hi")
    assert len(created) == 1 and "limits" in created[0]
