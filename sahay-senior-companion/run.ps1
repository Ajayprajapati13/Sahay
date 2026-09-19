# Sahay - One-Click PowerShell Startup Script
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "  Starting Sahay - GenAI Senior Citizen Companion    " -ForegroundColor Green
Write-Host "======================================================" -ForegroundColor Cyan

$uvPath = "$HOME\.local\bin\uv.exe"
if (-not (Test-Path $uvPath)) {
    $uvPath = "uv"
}

Write-Host "Starting FastAPI Backend & PWA Server on http://127.0.0.1:8000 ..." -ForegroundColor Yellow
& $uvPath run --with fastapi --with uvicorn --with pydantic --with httpx --with python-multipart python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
