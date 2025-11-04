# backend/app/core/config.py
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # DB ve JWT
    DATABASE_URL: str = "mysql+pymysql://trex:trexpass@127.0.0.1:3306/trexdb"
    JWT_SECRET: str = "supersecret"
    JWT_ALG: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # Dosya yükleme dizini (backend/ altında)
    UPLOAD_DIR: str = "uploads"

    # .env yükleme
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

settings = Settings()

# Fiziksel klasörü oluştur
UPLOAD_PATH = Path(settings.UPLOAD_DIR)
UPLOAD_PATH.mkdir(parents=True, exist_ok=True)

# Geriye dönük uyumluluk: eski kodlar UPLOAD_DIR import ediyorsa kırılsın istemiyoruz
UPLOAD_DIR = settings.UPLOAD_DIR