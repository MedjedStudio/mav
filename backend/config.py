"""Application configuration settings."""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from project root .env file
load_dotenv(Path(__file__).parent.parent / '.env')


class Settings:
    """Application settings."""
    
    def __init__(self):
        """Initialize settings and validate environment variables."""
        # Database
        self.MYSQL_USER: str = os.getenv("MYSQL_USER")
        self.MYSQL_PASSWORD: str = os.getenv("MYSQL_PASSWORD") 
        self.MYSQL_HOST: str = os.getenv("MYSQL_HOST")
        self.MYSQL_PORT: int = int(os.getenv("MYSQL_PORT") or "0")
        self.MYSQL_DATABASE: str = os.getenv("MYSQL_DATABASE")
        
        # JWT
        self.JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY")
        self.JWT_ALGORITHM: str = "HS256"
        self.JWT_EXPIRE_HOURS: int = int(os.getenv("JWT_EXPIRE_HOURS") or "0")
        
        # File Upload
        self.UPLOAD_DIR: Path = Path(os.getenv("UPLOAD_DIR"))
        self.MAX_FILE_SIZE: int = 10 * 1024 * 1024  # 10MB
        self.ALLOWED_EXTENSIONS: set = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
        
        # CORS
        self.CORS_ORIGINS: list = [
            origin.strip() 
            for origin in (os.getenv("CORS_ORIGINS") or "").split(",") 
            if origin.strip()
        ]
        
        # Debug
        self.DEBUG: bool = (os.getenv("DEBUG") or "false").lower() == "true"
        
        # Validate required settings
        self._validate()
    
    @property
    def DATABASE_URL(self) -> str:
        """Construct DATABASE_URL from individual MySQL settings."""
        return f"mysql+pymysql://{self.MYSQL_USER}:{self.MYSQL_PASSWORD}@{self.MYSQL_HOST}:{self.MYSQL_PORT}/{self.MYSQL_DATABASE}"
    
    def _validate(self):
        """Validate required settings."""
        if not self.MYSQL_USER:
            raise ValueError("MYSQL_USER environment variable is required")
        if not self.MYSQL_PASSWORD:
            raise ValueError("MYSQL_PASSWORD environment variable is required")
        if not self.MYSQL_HOST:
            raise ValueError("MYSQL_HOST environment variable is required")
        if not self.MYSQL_PORT:
            raise ValueError("MYSQL_PORT environment variable is required")
        if not self.MYSQL_DATABASE:
            raise ValueError("MYSQL_DATABASE environment variable is required")
        if not self.JWT_SECRET_KEY:
            raise ValueError("JWT_SECRET_KEY environment variable is required")
        if not self.JWT_EXPIRE_HOURS:
            raise ValueError("JWT_EXPIRE_HOURS environment variable is required")
        if not self.CORS_ORIGINS:
            raise ValueError("CORS_ORIGINS environment variable is required")
        if not os.getenv("UPLOAD_DIR"):
            raise ValueError("UPLOAD_DIR environment variable is required")


# Global settings instance
settings = Settings()

