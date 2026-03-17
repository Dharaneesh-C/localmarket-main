from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # MongoDB
    MONGODB_URL: str = "mongodb://localhost:27017"
    DB_NAME: str = "localmart"

    # JWT
    SECRET_KEY: str = "your-super-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # Firebase (FCM)
    FIREBASE_CREDENTIALS_PATH: Optional[str] = "firebase-credentials.json"

    # Google Maps
    GOOGLE_MAPS_API_KEY: str = ""

    class Config:
        env_file = ".env"


settings = Settings()
