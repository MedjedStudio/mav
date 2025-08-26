"""Application configuration settings."""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


class Settings:
    """Application settings."""
    
    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "mysql+pymysql://mav_user:mav_password@mysql:3306/mav_db"
    )
    
    # JWT
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY")
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_HOURS: int = int(os.getenv("JWT_EXPIRE_HOURS", "24"))
    
    # File Upload
    UPLOAD_DIR: Path = Path("uploads")
    MAX_FILE_SIZE: int = 10 * 1024 * 1024  # 10MB
    ALLOWED_EXTENSIONS: set = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
    
    # CORS
    CORS_ORIGINS: list = [
        origin.strip() 
        for origin in os.getenv("CORS_ORIGINS", 
            "http://localhost:3000,http://localhost:5173,http://localhost:8000"
        ).split(",") 
        if origin.strip()
    ]
    
    # Base URL for file serving (本番環境用)
    BASE_URL: str = os.getenv("BASE_URL", "")
    
    # Debug
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"
    
    def __post_init__(self):
        """Validate required settings."""
        if not self.JWT_SECRET_KEY:
            raise ValueError("JWT_SECRET_KEY environment variable is required")


# Global settings instance
settings = Settings()

# Ensure upload directory exists
settings.UPLOAD_DIR.mkdir(exist_ok=True)