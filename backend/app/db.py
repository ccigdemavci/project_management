# backend/app/db.py
from __future__ import annotations

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# SQLAlchemy 2.0 stili Base
try:
    from sqlalchemy.orm import DeclarativeBase

    class Base(DeclarativeBase):
        pass
except Exception:
    # Eğer projende SQLAlchemy 1.4 kullanıyorsan bu kısım çalışır
    from sqlalchemy.orm import declarative_base  # type: ignore
    Base = declarative_base()  # type: ignore

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./trex.db")

# SQLite için özel argüman gerekir
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

# Havuz ayarlarını ekledim; önceki “QueuePool limit” hatalarını da azaltır
engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# FastAPI dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()