# Vercel entrypoint: Vercel only auto-detects a FastAPI app at the project root
# (or in app/, src/, api/), so re-export the real app from backend/app/main.py.
from backend.app.main import app  # noqa: F401
