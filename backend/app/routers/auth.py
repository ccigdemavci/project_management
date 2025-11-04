# backend/app/routers/auth.py

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

# Veritabanı bağlantısı ve modeller
from ..db import get_db
from ..models import User, UserRole

# Pydantic şemaları (istek ve yanıt modelleri)
from ..schemas import UserCreate, UserOut, Token

# Parola hashleme, doğrulama ve JWT token oluşturma işlemleri
from ..core.auth import hash_password, verify_password, create_access_token


# ============================================================
# ROUTER TANIMI
# ============================================================
# APIRouter, bu dosyadaki endpoint’leri /auth altında gruplar.
# Örn: /auth/register, /auth/login
router = APIRouter(prefix="/auth", tags=["auth"])


# ============================================================
# KULLANICI KAYIT (REGISTER)
# ============================================================
@router.post("/register", response_model=UserOut)
def register(data: UserCreate, db: Session = Depends(get_db)):
    """
    Yeni kullanıcı kaydı oluşturur.
    Girdi: name, email, password, role
    Dönen: Kullanıcı bilgileri (şifresiz)
    """

    # 1️⃣ E-posta zaten kayıtlı mı kontrol et
    exists = db.query(User).filter(User.email == data.email).first()
    if exists:
        raise HTTPException(status_code=400, detail="Email already exists")

    # 2️⃣ Yeni kullanıcı nesnesi oluştur
    # Parola hash’lenerek güvenli şekilde kaydedilir.
    user = User(
        name=data.name,
        email=data.email,
        password_hash=hash_password(data.password),
        role=UserRole(data.role),  # Enum tipine dönüştürülür
    )

    # 3️⃣ Kullanıcıyı veritabanına ekle
    db.add(user)
    db.commit()        # Değişiklikleri kaydet
    db.refresh(user)   # Yeni kullanıcı objesini güncelle (ör. id alanı)

    # 4️⃣ Kayıtlı kullanıcıyı geri döndür
    return user


# ============================================================
# KULLANICI GİRİŞ (LOGIN)
# ============================================================
@router.post("/login", response_model=Token)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """
    Kullanıcı giriş endpoint’i.
    Swagger veya frontend'den form-data olarak 'username' ve 'password' gelir.
    NOT: OAuth2PasswordRequestForm yapısında 'username' alanı email olarak kullanılır.
    """

    # 1️⃣ Kullanıcıyı e-postaya göre bul
    user = db.query(User).filter(User.email == form.username).first()

    # 2️⃣ Parola doğrulama
    # Kullanıcı yoksa veya parola yanlışsa → 401 Unauthorized hatası
    if not user or not verify_password(form.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )

    # 3️⃣ Giriş başarılı → JWT access token oluştur
    # Token’ın içeriğinde kullanıcı ID’si (sub) yer alır.
    access_token = create_access_token(str(user.id))

    # 4️⃣ Token’ı döndür (Swagger'da otomatik Authorize olur)
    return Token(access_token=access_token)