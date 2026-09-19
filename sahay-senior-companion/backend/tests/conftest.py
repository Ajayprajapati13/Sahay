import os
import tempfile

# Point the app's state file at a throwaway directory *before* any app module is imported,
# so running the tests never rewrites the tracked backend/data/sahay_state.json.
os.environ["DATA_DIR"] = tempfile.mkdtemp(prefix="sahay-test-data-")
# Keep tests on the deterministic offline engine even if a real key is exported locally.
os.environ.pop("GEMINI_API_KEY", None)
