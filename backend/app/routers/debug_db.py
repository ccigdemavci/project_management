# backend/app/routers/debug_db.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.db import get_db
from app.models import User

router = APIRouter(prefix="/debug/db", tags=["debug-db"])

@router.get("/ping")
def db_ping(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB ping failed: {e}")

@router.get("/users/count")
def users_count(db: Session = Depends(get_db)):
    return {"users": db.query(User).count()}

@router.get("/user/by-email")
def user_by_email(email: str, db: Session = Depends(get_db)):
    u = db.query(User).filter(User.email == email).first()
    if not u:
        return {"found": False}
    return {
        "found": True,
        "id": u.id,
        "name": u.name,
        "email": u.email,
        "role": getattr(u, "role", None),
        "hash_prefix": (u.password_hash or "")[:4],
    }