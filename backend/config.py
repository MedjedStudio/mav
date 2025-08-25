"""Application configuration settings."""
import os
from pathlib import Path


class Settings:
    """Application settings."""
    
    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "mysql+pymysql://mav_user:mav_password@mysql:3306/mav_db"
    )
    
    # JWT
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-this-in-production")
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_HOURS: int = int(os.getenv("JWT_EXPIRE_HOURS", "24"))
    
    # File Upload
    UPLOAD_DIR: Path = Path("/app/uploads")
    MAX_FILE_SIZE: int = 10 * 1024 * 1024  # 10MB
    ALLOWED_EXTENSIONS: set = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
    
    # CORS
    CORS_ORIGINS: list = [
        "http://localhost:3000",
        "http://localhost:5173", 
        "http://localhost:8000",
        "http://192.168.1.6:3000",
        "http://192.168.1.6:5173",
        "http://192.168.1.6:8000"
    ]
    
    # Debug
    DEBUG: bool = os.getenv("DEBUG", "true").lower() == "true"


# Global settings instance
settings = Settings()

# Ensure upload directory exists
settings.UPLOAD_DIR.mkdir(exist_ok=True)