import os
from pathlib import Path
from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).resolve().parent.parent.parent

class Settings(BaseSettings):
    PROJECT_NAME: str = "CivicGrid"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "civicgrid-super-secret-production-key-change-in-env-2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # Dual database fallback: Use DATABASE_URL if set (e.g. Postgres in docker), else local SQLite
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR}/civicgrid.db")
    
    # CSRF and Cookie security
    COOKIE_NAME: str = "civicgrid_access_token"
    CSRF_COOKIE_NAME: str = "civicgrid_csrf_token"
    COOKIE_SAMESITE: str = "lax"
    COOKIE_SECURE: bool = os.getenv("ENV", "development") == "production"
    
    # Uploads outside web root
    UPLOAD_DIR: Path = BASE_DIR / "uploads"
    MAX_UPLOAD_SIZE_BYTES: int = 5 * 1024 * 1024  # 5MB
    ALLOWED_IMAGE_EXTENSIONS: set[str] = {".jpg", ".jpeg", ".png", ".webp"}
    ALLOWED_IMAGE_MIME: set[str] = {"image/jpeg", "image/png", "image/webp"}

    # Grid restoration default cost weights
    GRID_ALPHA_RESISTANCE: float = 0.4
    GRID_BETA_LOAD_RATIO: float = 0.4
    GRID_GAMMA_DISTANCE: float = 0.2

    class Config:
        case_sensitive = True

settings = Settings()
settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
