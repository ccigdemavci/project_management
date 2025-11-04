# backend/app/routers/project_notes.py

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

# Veritabanı bağlantısı
from ..db import get_db

# JWT doğrulama için geçerli kullanıcıyı alma fonksiyonu
from ..core.auth import get_current_user

# Modeller
from ..models import Project, ProjectNote, ProjectMember, User

# Girdi/çıktı (request/response) şemaları
from ..schemas import ProjectNoteCreate, ProjectNoteOut


# ============================================================
# ROUTER TANIMI
# ============================================================
# Bu router proje notlarıyla ilgili işlemleri yönetir.
# Tüm endpoint’ler /projects/... ile başlar.
router = APIRouter(prefix="/projects", tags=["Project Notes"])


# ============================================================
# YARDIMCI FONKSİYONLAR (HELPERS)
# ============================================================

def _require_project_access(db: Session, pid: int, user: User) -> Project:
    """
    Belirli bir projeye erişim izni olup olmadığını kontrol eder.
    Admin, proje sahibi veya projeye üye olan kişiler erişebilir.
    Erişimi olmayan kullanıcılar için 403 Forbidden hatası döner.
    """
    # 1️⃣ Proje var mı kontrol et
    proj = db.query(Project).filter(Project.id == pid).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    # 2️⃣ Admin kullanıcı tüm projelere erişebilir
    if user.role == "admin":
        return proj

    # 3️⃣ Proje sahibi erişebilir
    if proj.owner_id == user.id:
        return proj

    # 4️⃣ Projeye üye mi?
    is_member = (
        db.query(ProjectMember)
        .filter(ProjectMember.project_id == pid, ProjectMember.user_id == user.id)
        .first()
        is not None
    )

    # Üye değilse → erişim reddedilir
    if not is_member:
        raise HTTPException(status_code=403, detail="No access to this project")

    return proj


def _note_to_out(db: Session, note: ProjectNote) -> ProjectNoteOut:
    """
    Veritabanındaki ProjectNote modelini,
    kullanıcı bilgileriyle zenginleştirilmiş ProjectNoteOut şemasına dönüştürür.
    """
    author = db.query(User).filter(User.id == note.author_id).first()
    return ProjectNoteOut(
        id=note.id,
        project_id=note.project_id,
        author_id=note.author_id,
        content=note.content,
        created_at=note.created_at,
        author_name=author.name if author else None,
        author_email=author.email if author else None,
    )


# ============================================================
# ENDPOINTLER
# ============================================================

@router.post("/{pid}/notes", response_model=ProjectNoteOut, status_code=status.HTTP_201_CREATED)
def add_note(
    pid: int,
    data: ProjectNoteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Yeni bir proje notu ekler.
    - Erişim: admin, proje sahibi veya projeye üye olan kullanıcılar.
    - Not içeriği boş olamaz.
    """
    # 1️⃣ Erişim yetkisini doğrula
    _require_project_access(db, pid, current_user)

    # 2️⃣ Not içeriği boşsa hata döndür
    if not data.content or not data.content.strip():
        raise HTTPException(status_code=422, detail="Content is required")

    # 3️⃣ Yeni not oluştur
    note = ProjectNote(
        project_id=pid,
        author_id=current_user.id,  # Notu ekleyen kullanıcı
        content=data.content.strip()
    )

    # 4️⃣ Veritabanına kaydet
    db.add(note)
    db.commit()
    db.refresh(note)

    # 5️⃣ Geriye kullanıcı bilgileriyle birlikte notu döndür
    return _note_to_out(db, note)


@router.get("/{pid}/notes", response_model=List[ProjectNoteOut])
def list_notes(
    pid: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Belirli bir projeye ait notları listeler.
    - Erişim: admin, proje sahibi veya projeye üye olan kullanıcılar.
    - Notlar oluşturulma tarihine göre (yeniden eskiye) sıralanır.
    """
    # 1️⃣ Erişim kontrolü
    _require_project_access(db, pid, current_user)

    # 2️⃣ İlgili projedeki notları sırala (en yeni başta)
    notes = (
        db.query(ProjectNote)
        .filter(ProjectNote.project_id == pid)
        .order_by(ProjectNote.created_at.desc())
        .all()
    )

    # 3️⃣ Her notu kullanıcı bilgileriyle dönüştür
    return [_note_to_out(db, n) for n in notes]


@router.delete("/{pid}/notes/{nid}", status_code=status.HTTP_204_NO_CONTENT)
def delete_note(
    pid: int,
    nid: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Bir proje notunu siler.
    - Erişim: notun yazarı, proje sahibi, admin veya PM.
    - Not bulunamazsa 404 döner.
    - Başarılıysa 204 (no content) döner.
    """
    # 1️⃣ Yetkili mi kontrol et (proje erişimi)
    proj = _require_project_access(db, pid, current_user)

    # 2️⃣ Silinmek istenen notu bul
    note = (
        db.query(ProjectNote)
        .filter(ProjectNote.id == nid, ProjectNote.project_id == pid)
        .first()
    )
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    # 3️⃣ Silme yetkisini kontrol et
    is_author = note.author_id == current_user.id         # Notu yazan kişi mi?
    is_owner = proj.owner_id == current_user.id           # Proje sahibi mi?
    is_admin_or_pm = current_user.role in ("admin", "pm") # Admin veya proje yöneticisi mi?

    # Hiçbiri değilse → erişim reddedilir
    if not (is_author or is_owner or is_admin_or_pm):
        raise HTTPException(status_code=403, detail="Permission denied")

    # 4️⃣ Notu sil
    db.delete(note)
    db.commit()

    # 5️⃣ Başarılı yanıt (204 No Content)
    return