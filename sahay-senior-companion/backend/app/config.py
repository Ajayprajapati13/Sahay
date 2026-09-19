import os
from pydantic import BaseModel

class Settings(BaseModel):
    app_name: str = "Sahay - GenAI Senior Companion"
    version: str = "1.0.0"
    api_prefix: str = "/api"
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")
    gemini_model: str = os.getenv("GEMINI_MODEL", "gemini-3.6-flash")
    google_maps_api_key: str = os.getenv("GOOGLE_MAPS_API_KEY", "")  # Maps Embed key: public by design, restrict it by HTTP referrer
    host: str = os.getenv("HOST", "127.0.0.1")
    port: int = int(os.getenv("PORT", "8000"))
    secret_key: str = os.getenv("SECRET_KEY", "sahay-senior-guardian-secret-key-2026")
    allowed_origins: list[str] = ["*"]
    data_dir: str = os.getenv("DATA_DIR", os.path.join(os.path.dirname(__file__), "..", "data"))

settings = Settings()
os.makedirs(settings.data_dir, exist_ok=True)
