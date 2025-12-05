# backend/app/main.py
from pathlib import Path
from dotenv import load_dotenv
import os

# backend/.env dosyasını yükle
load_dotenv(dotenv_path=Path(__file__).resolve().parents[1] / ".env")
print("APP DEBUG: DATABASE_URL =", os.getenv("DATABASE_URL"))




from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

# Router modülleri (her biri .router nesnesi içerir)
from .routers import (
    auth,
    projects,
    project_members,
    project_notes,
    project_phases,
    phase_details,
    project_tasks,
    project_files,
    project_budget,
    debug_db,   # <— debug DB uçları
)

# SQLAlchemy Base ve engine
from .db import Base, engine

# FastAPI uygulaması
app = FastAPI(title="TrexProject API", version="0.1")

# Router'ları tek seferde ekle
app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(project_members.router)
app.include_router(project_notes.router)
app.include_router(project_phases.router)
app.include_router(phase_details.router)
app.include_router(project_tasks.router)
app.include_router(project_files.router)
app.include_router(project_budget.router)
app.include_router(debug_db.router)  # <— eklendi

# CORS (frontend için gerekli)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],        # ihtiyaca göre domain kısıtlayabilirsin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Uygulama başlatıldığında tablo oluştur (opsiyonel; Alembic kullanıyorsan kaldır)
@app.on_event("startup")
def on_startup():
    # Hangi DB'ye bağlandığını logla (teşhis için)
    print("APP DEBUG: DATABASE_URL =", os.getenv("DATABASE_URL"))
    Base.metadata.create_all(bind=engine)

# Basit sağlık kontrolü
@app.get("/health")
def health_check():
    return {"status": "ok"}