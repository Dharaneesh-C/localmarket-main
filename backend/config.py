from typing import Optional

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # JWT
    SECRET_KEY: str = "your-super-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # Firebase
    FIREBASE_CREDENTIALS: Optional[str] = None
    FIREBASE_CREDENTIALS_PATH: Optional[str] = "firebase-credentials.json"

    # Frontend / CORS
    CORS_ORIGINS: str = "*"

    class Config:
        env_file = ".env"


settings = Settings()
