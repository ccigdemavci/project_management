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
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

# bcrypt'i varsayılan yap; pbkdf2'yi doğrulamada kabul et
pwd_context = CryptContext(
    schemes=["bcrypt", "pbkdf2_sha256"],
    deprecated="auto",
)

print("AUTH LOADED:", __file__, "schemes=", ["bcrypt", "pbkdf2_sha256"])

# -----------------------------
# Parola yardımcıları
# -----------------------------
def verify_password(plain_password: str, hashed_password: Optional[str]) -> bool:
    """Kullanıcının girdiği parolayı, DB'deki hash ile doğrular."""
    if not hashed_password:
        return False
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        # Hash formatı bozuksa/bilinmiyorsa False dön
        return False


def hash_password(password: str) -> str:
    """Yeni kullanıcı/parola güncellemede hash üretmek için."""
    return pwd_context.hash(password)


# Bazı yerlerde get_password_hash ismi beklenebilir; uyumluluk için alias bırakıyoruz.
get_password_hash = hash_password

# -----------------------------
# Kimlik doğrulama
# -----------------------------
def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
    # DEBUG: gerekirse bırak, üretimde yorum satırı yapabilirsin
    print(f"AUTH DEBUG: lookup email -> {email}")

    user = db.query(User).filter(User.email == email).first()
    print("AUTH DEBUG: user found?", bool(user))
    if not user:
        return None

    ok = verify_password(password, user.password_hash)
    print("AUTH DEBUG: verify password =", ok, "| hash prefix =", (user.password_hash or "")[:7])
    if not ok:
        return None

    # Eski hash'leri girişte otomatik bcrypt'e yükselt (opsiyonel)
    try:
        if pwd_context.needs_update(user.password_hash):
            user.password_hash = hash_password(password)
            db.add(user)
            db.commit()
            db.refresh(user)
            print("AUTH DEBUG: password hash migrated to bcrypt")
    except Exception:
        # migrasyon başarısız olursa login'i engelleme
        pass

    # Şemanda is_active yoksa sorun değil; varsa kontrol et
    if hasattr(user, "is_active") and getattr(user, "is_active") in (0, False):
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
    payload = dict(sub_or_payload) if isinstance(sub_or_payload, dict) else {"sub": str(sub_or_payload)}

    exp_minutes = (
        expires_minutes
        if expires_minutes is not None
        else getattr(settings, "ACCESS_TOKEN_EXPIRE_MINUTES", 60 * 24)  # varsayılan 1 gün
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
        # id gibi dene
        try:
            uid = int(subject)
        except (ValueError, TypeError):
            uid = None
        if uid is not None:
            user = db.get(User, uid)

    if not user:
        raise credentials_exc

    # Eğer is_active sütunu varsa ve false ise 401 ver
    if hasattr(user, "is_active") and getattr(user, "is_active") in (0, False):
        raise credentials_exc

    return user