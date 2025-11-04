# backend/app/auth.py

import os, datetime
from jose import jwt, JWTError                # JWT (JSON Web Token) işlemleri için
from passlib.hash import pbkdf2_sha256 as hasher  # Parola hash’leme algoritması (PBKDF2-SHA256)
from dotenv import load_dotenv                # .env dosyasındaki değişkenleri yükler
from fastapi import HTTPException, status, Depends
from fastapi.security import OAuth2PasswordBearer  # OAuth2 Bearer token doğrulaması için
from sqlalchemy.orm import Session
from ..db import get_db
from ..models import User
from app.core.config import settings          # Uygulama yapılandırma ayarları (örneğin JWT_SECRET, JWT_ALGO)
from ..db import SessionLocal
# ============================================================
# ORTAM DEĞİŞKENLERİNİ YÜKLE
# ============================================================
load_dotenv()  # .env dosyasındaki değerleri sistem ortamına yükler

# Ortam değişkenlerinden JWT yapılandırması okunur.
# Eğer .env içinde yoksa, varsayılan değerler kullanılır.
SECRET = os.getenv("JWT_SECRET", "change_me")
ALGO = os.getenv("JWT_ALGO", "HS256")
ACCESS_MIN = int(os.getenv("ACCESS_TOKEN_EXPIRE_MIN", "30"))  # Token geçerlilik süresi (dakika)

# OAuth2 standardı gereği token’ın alınacağı endpoint belirtilir
# /auth/login → login endpoint’inden token alınır
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


# ============================================================
# PAROLA İŞLEMLERİ
# ============================================================

def hash_password(p: str) -> str:
    """
    Kullanıcının parolasını güvenli şekilde hash'ler.
    PBKDF2-SHA256 algoritmasını kullanır.
    """
    return hasher.hash(p)


def verify_password(p: str, h: str) -> bool:
    """
    Kullanıcının girdiği parola ile veritabanında saklanan hash’i karşılaştırır.
    Eşleşirse True, aksi halde False döner.
    """
    return hasher.verify(p, h)


# ============================================================
# TOKEN OLUŞTURMA
# ============================================================

def create_access_token(sub: str) -> str:
    """
    Kullanıcı kimliğini (sub) içeren JWT access token oluşturur.
    Token süresi ACCESS_MIN dakika ile sınırlıdır.
    """
    # Token’ın geçerlilik bitiş zamanı
    exp = datetime.datetime.utcnow() + datetime.timedelta(minutes=ACCESS_MIN)

    # JWT payload (sub: kullanıcı id, exp: son kullanma zamanı)
    payload = {"sub": sub, "exp": exp}

    # Token oluşturulup geri döndürülür
    return jwt.encode(payload, SECRET, algorithm=ALGO)


# ============================================================
# KİMLİK DOĞRULAMA (CURRENT USER ALMA)
# ============================================================

def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    """
    Geçerli token’ı doğrular ve token’daki kullanıcı id’sine (sub) göre kullanıcıyı döndürür.
    Endpoint’lerde Depends(get_current_user) ile kullanılır.
    
    FastAPI, Authorization: Bearer <token> header’ını otomatik olarak bu fonksiyona geçirir.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid token",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        # Token çözülür (decode)
        # settings.JWT_SECRET → gizli anahtar
        # settings.JWT_ALGO → algoritma (örn. HS256)
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGO])
        
        # "sub" claim → kullanıcı id’sini taşır
        uid = payload.get("sub")
        if uid is None:
            # Token'da kullanıcı id’si yoksa yetkisiz
            raise credentials_exception
    except JWTError:
        # Token geçersiz veya süresi dolmuşsa
        raise credentials_exception

    # Yeni bir DB oturumu oluştur
    db = next(get_db())

    # Token’daki kullanıcı id’sine göre kullanıcıyı sorgula
    user = db.query(User).get(int(uid))

    # Kullanıcı bulunmazsa yetkisiz hatası döndür
    if not user:
        raise credentials_exception

    # Başarılıysa kullanıcı nesnesini döndür
    return user