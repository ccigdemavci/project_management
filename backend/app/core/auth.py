# backend/app/core/auth.py

from datetime import datetime, timedelta, timezone
from typing import Optional, Union

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db import get_db
from app.models import User

# Swagger "Authorize" butonu bu endpointten token alacak
# NOT: router'da /auth altında login varsa bu doğru: "/auth/login"
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

# Hem pbkdf2_sha256 hem bcrypt hash'lerini destekle
pwd_context = CryptContext(
    schemes=["pbkdf2_sha256", "bcrypt"],
    deprecated="auto",
)

# -----------------------------
# Parola yardımcıları
# -----------------------------
def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Kullanıcının girdiği parolayı, DB'deki hash ile doğrular."""
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        # Hash formatı bozuksa/bilinmiyorsa False dön
        return False

def hash_password(password: str) -> str:
    """
    Yeni kullanıcı/parola güncellemede hash üretmek için.
    (routers/auth.py bu ismi bekliyor)
    """
    return pwd_context.hash(password)

def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
    """E-posta + parola ile kullanıcı doğrulama."""
    user = db.query(User).filter(User.email == email).first()
    if not user:
        return None
    if not verify_password(password, user.password_hash):
        return None
    # Eğer şemada is_active yoksa sorun çıkarmaz; varsa ve 0 ise engelle:
    if hasattr(user, "is_active") and user.is_active == 0:
        return None
    return user

# -----------------------------
# JWT üretimi
# -----------------------------
def create_access_token(
    sub_or_payload: Union[str, dict],
    expires_minutes: Optional[int] = None,
) -> str:
    """
    Hem create_access_token({"sub": ...}) hem create_access_token("...") formatını destekler.
    """
    if isinstance(sub_or_payload, dict):
        payload = dict(sub_or_payload)  # kopya
    else:
        payload = {"sub": str(sub_or_payload)}

    # settings'ten oku; yoksa default 1440 dk (1 gün)
    exp_minutes = (
        expires_minutes
        if expires_minutes is not None
        else getattr(settings, "ACCESS_TOKEN_EXPIRE_MINUTES", 60 * 24)
    )
    expire = datetime.now(timezone.utc) + timedelta(minutes=exp_minutes)
    payload["exp"] = expire

    secret = getattr(settings, "JWT_SECRET", "CHANGE_ME_IN_ENV")
    alg = getattr(settings, "JWT_ALG", "HS256")

    return jwt.encode(payload, secret, algorithm=alg)

# -----------------------------
# Protected endpoint'lerde current user
# -----------------------------
def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    """
    Authorization: Bearer <token> header'ındaki JWT'yi çözer.
    'sub' e-posta ya da kullanıcı id olabilir.
    """
    credentials_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        secret = getattr(settings, "JWT_SECRET", "CHANGE_ME_IN_ENV")
        alg = getattr(settings, "JWT_ALG", "HS256")
        payload = jwt.decode(token, secret, algorithms=[alg])
        subject = payload.get("sub")
        if subject is None:
            raise credentials_exc
    except JWTError:
        raise credentials_exc

    # Önce e-posta gibi dene
    user = db.query(User).filter(User.email == subject).first()
    if not user:
        # id gibi dene (SQLAlchemy 2.0: db.get(Model, pk))
        try:
            uid = int(subject)
        except (ValueError, TypeError):
            uid = None
        if uid is not None:
            user = db.get(User, uid)  # .query(...).get() yerine

    if not user:
        raise credentials_exc

    # Eğer is_active sütunu varsa ve false ise 401 ver
    if hasattr(user, "is_active") and user.is_active == 0:
        raise credentials_exc

    return user