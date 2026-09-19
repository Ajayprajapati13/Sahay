import os

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .config import settings
from .routes.ai_router import router as ai_router
from .routes.bank_router import router as bank_router
from .routes.family_router import router as family_router
from .routes.health_router import router as health_router
from .routes.ocr_router import router as ocr_router
from .routes.scam_router import router as scam_router
from .routes.transport_router import router as transport_router

app = FastAPI(
    title=settings.app_name,
    version=settings.version,
    description="A gentle, accessible, voice-first GenAI companion for senior citizens navigating bank visits, health, transport, and scam protection."
)

# CORS setup (the app uses no cookies, so credentials stay off alongside a wildcard origin)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Scripts and styles are served from this origin only; Google Maps is the one allowed frame.
# (Inline handlers still need 'unsafe-inline' for scripts, but nothing can load or send data elsewhere.)
CONTENT_SECURITY_POLICY = (
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; "
    "img-src 'self' data: blob:; connect-src 'self'; frame-src https://www.google.com; worker-src 'self'; "
    "manifest-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'"
)
DOCS_PATHS = ("/docs", "/redoc", "/openapi.json")  # Swagger UI loads its assets from a CDN, so no CSP there
STATIC_PREFIXES = ("/css/", "/js/", "/icons/")

@app.middleware("http")
async def add_security_and_cache_headers(request: Request, call_next):
    response = await call_next(request)
    path, headers = request.url.path, response.headers
    headers.setdefault("X-Content-Type-Options", "nosniff")
    headers.setdefault("X-Frame-Options", "DENY")
    headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    headers.setdefault("Permissions-Policy", "camera=(self), microphone=(self), geolocation=(self), payment=(), usb=()")
    if not path.startswith(DOCS_PATHS):
        headers.setdefault("Content-Security-Policy", CONTENT_SECURITY_POLICY)
    if path.startswith(STATIC_PREFIXES):
        headers.setdefault("Cache-Control", "public, max-age=300, stale-while-revalidate=86400")
    elif path == "/api/config":
        headers.setdefault("Cache-Control", "public, max-age=300")
    elif path.startswith("/api/"):
        headers.setdefault("Cache-Control", "no-store")  # personal data: never cached
    elif "cache-control" not in headers:
        headers["Cache-Control"] = "no-cache"  # pages, manifest, service worker: always revalidate
    return response

# Added last so it wraps everything and compresses the final response.
app.add_middleware(GZipMiddleware, minimum_size=800)

# API Routers
app.include_router(ai_router, prefix=settings.api_prefix)
app.include_router(ocr_router, prefix=settings.api_prefix)
app.include_router(scam_router, prefix=settings.api_prefix)
app.include_router(bank_router, prefix=settings.api_prefix)
app.include_router(transport_router, prefix=settings.api_prefix)
app.include_router(health_router, prefix=settings.api_prefix)
app.include_router(family_router, prefix=settings.api_prefix)

# Frontend directories
FRONTEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend"))
PUBLIC_DIR = os.path.join(FRONTEND_DIR, "web")  # not "public": Vercel excludes public/ from the function bundle

if os.path.exists(FRONTEND_DIR):
    app.mount("/css", StaticFiles(directory=os.path.join(FRONTEND_DIR, "css")), name="css")
    app.mount("/js", StaticFiles(directory=os.path.join(FRONTEND_DIR, "js")), name="js")
    if os.path.exists(os.path.join(PUBLIC_DIR, "icons")):
        app.mount("/icons", StaticFiles(directory=os.path.join(PUBLIC_DIR, "icons")), name="icons")

@app.get("/api/health-check")
async def health_check():
    return {
        "status": "healthy",
        "app": settings.app_name,
        "version": settings.version,
        "gemini_live": bool(settings.gemini_api_key)
    }

@app.get("/api/config")
async def public_config():
    """Non-secret settings the browser needs. The Maps Embed key is public by design; restrict it by HTTP referrer in Google Cloud."""
    return {"maps_embed_key": settings.google_maps_api_key, "gemini_live": bool(settings.gemini_api_key)}

@app.get("/kiosk")
async def serve_kiosk():
    kiosk_path = os.path.join(FRONTEND_DIR, "kiosk.html")
    if os.path.exists(kiosk_path):
        return FileResponse(kiosk_path)
    return {"message": "Kiosk page under development"}

@app.get("/")
async def serve_index():
    index_path = os.path.join(PUBLIC_DIR, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"message": f"{settings.app_name} is running. Frontend initializing..."}

@app.get("/{filename:path}")
async def serve_public_files(filename: str):
    # Unknown API paths must 404 as JSON, not fall through to the HTML app shell.
    if filename == "api" or filename.startswith("api/"):
        raise HTTPException(status_code=404, detail="Not found")
    # Resolve symlinks and ".." so requests can never escape the web directory.
    root = os.path.realpath(PUBLIC_DIR)
    file_path = os.path.realpath(os.path.join(root, filename))
    if file_path.startswith(root + os.sep) and os.path.isfile(file_path):
        return FileResponse(file_path)
    index_path = os.path.join(PUBLIC_DIR, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"error": "Not found"}
