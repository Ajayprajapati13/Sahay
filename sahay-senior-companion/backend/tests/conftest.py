import os
import tempfile

# Point the app's state file at a throwaway directory *before* any app module is imported,
# so running the tests never rewrites the tracked backend/data/sahay_state.json.
os.environ["DATA_DIR"] = tempfile.mkdtemp(prefix="sahay-test-data-")
# Keep tests on the deterministic offline engine even if a real key is exported locally.
os.environ.pop("GEMINI_API_KEY", None)


import pytest


@pytest.fixture(autouse=True)
def _fresh_gemini_cache():
    """Model answers are cached in memory; every test starts with an empty cache."""
    from app.services.gemini_service import gemini_service

    gemini_service.cache.clear()
    gemini_service._client = None
    yield
