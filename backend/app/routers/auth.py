# backend/app/routers/auth.py

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import User, UserRole
from app.schemas import UserCreate, UserOut, Token
from app.core.auth import hash_password, verify_password, create_access_token

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=UserOut)
def register(data: UserCreate, db: Session = Depends(get_db)):
    exists = db.query(User).filter(User.email == data.email).first()
    if exists:
        raise HTTPException(status_code=400, detail="Email already exists")

    user = User(
        name=data.name,
        email=data.email,
        password_hash=hash_password(data.password),
        role=UserRole(data.role),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.post("/login", response_model=Token)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # DEBUG: hangi kullanıcı ile denendiğini görmek için
    print("ROUTER DEBUG: /auth/login username =", form.username)

    user = db.query(User).filter(User.email == form.username).first()
    print("ROUTER DEBUG: user exists?", bool(user))
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    ok = verify_password(form.password, user.password_hash)
    print("ROUTER DEBUG: verify_password =", ok, "| hash_prefix =", (user.password_hash or "")[:4])
    if not ok:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    # sub olarak email koyuyoruz
    access_token = create_access_token({"sub": user.email})

    # ÖNEMLİ: response_model=Token olduğu için birebir Token dön
    return Token(access_token=access_token, token_type="bearer")