# app/main.py

# FastAPI ana framework ve CORS (Cross-Origin Resource Sharing) middleware'i import edilir
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Projeye ait router (yani endpoint grupları) modülleri import edilir
from .routers import auth, projects, project_members, project_notes, project_phases, project_files, project_budget

# Veritabanı modelleri ve bağlantı motoru içe aktarılır
from .db import Base, engine
from .routers import auth, projects, project_members, project_notes, project_phases, project_tasks
# FastAPI uygulaması başlatılır
# title: API’nin ismi, version: sürüm numarası
app = FastAPI(title="TrexProject API", version="0.1")

# -----------------------------
# ROUTER EKLEME
# -----------------------------
# Router'lar, farklı API uç noktalarını (örneğin /auth, /projects, /notes vb.) modüler halde yönetir.
# Her router sadece bir kez eklenmelidir. Bu sayede modüler, temiz bir yapı elde edilir.
app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(project_members.router)
app.include_router(project_notes.router)
app.include_router(project_phases.router)
app.include_router(project_tasks.router)
app.include_router(project_files.router)
app.include_router(project_budget.router)
# -----------------------------
# CORS (Cross-Origin Resource Sharing) AYARLARI
# -----------------------------
# API'nin başka domainlerden (örneğin frontend'in localhost:3000'den) erişilebilmesini sağlar.
# allow_origins=["*"] → Tüm kaynaklardan gelen isteklere izin verir.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],         # Herhangi bir kaynaktan erişime izin ver
    allow_credentials=True,      # Kimlik doğrulama bilgilerini (cookies, auth headers) destekler
    allow_methods=["*"],         # Tüm HTTP metodlarına (GET, POST, PUT, DELETE vb.) izin ver
    allow_headers=["*"],         # Tüm header’lara izin ver
)

# -----------------------------
# UYGULAMA BAŞLATILDIĞINDA ÇALIŞAN FONKSİYON
# -----------------------------
# Bu event uygulama ayağa kalktığında (startup) tetiklenir.
# Base.metadata.create_all() → SQLAlchemy kullanılarak veritabanındaki tablolar oluşturulur.
@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)

# -----------------------------
# SAĞLIK KONTROLÜ (HEALTH CHECK)
# -----------------------------
# API’nin çalışır durumda olup olmadığını test etmek için basit bir endpoint.
# Tarayıcıdan /health adresine gidildiğinde {"status": "ok"} döner.
@app.get("/health")
def health_check():
    return {"status": "ok"}