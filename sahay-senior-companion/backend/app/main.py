import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from .config import settings
from .routes.ai_router import router as ai_router
from .routes.ocr_router import router as ocr_router
from .routes.scam_router import router as scam_router
from .routes.bank_router import router as bank_router
from .routes.transport_router import router as transport_router
from .routes.health_router import router as health_router
from .routes.family_router import router as family_router

app = FastAPI(
    title=settings.app_name,
    version=settings.version,
    description="A gentle, accessible, voice-first GenAI companion for senior citizens navigating bank visits, health, transport, and scam protection."
)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
    file_path = os.path.join(PUBLIC_DIR, filename)
    if os.path.exists(file_path) and os.path.isfile(file_path):
        return FileResponse(file_path)
    index_path = os.path.join(PUBLIC_DIR, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"error": "Not found"}
