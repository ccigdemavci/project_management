# app/routers/project_members.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

# Veritabanı bağlantısı
from ..db import get_db

# Kimlik doğrulama (token kontrolü)
from ..core.auth import get_current_user

# Veritabanı modelleri
from ..models import Project, ProjectMember, ProjectMemberRole, User

# Girdi/çıktı için Pydantic şemaları
from ..schemas import ProjectMemberIn, ProjectMemberOut


# ============================================================
# ROUTER TANIMI
# ============================================================
# Bu router, proje üyeleriyle ilgili işlemleri yönetir.
# Tüm endpoint’ler /projects/... ile başlar.
router = APIRouter(prefix="/projects", tags=["Project Members"])


# ============================================================
# YARDIMCI FONKSİYONLAR (HELPERS)
# ============================================================

def _require_project_access(db: Session, pid: int, user: User) -> Project:
    """
    Belirli bir projeye erişim yetkisini kontrol eder.
    - Admin tüm projelere erişebilir.
    - Diğer kullanıcılar sadece owner (sahip) veya üye oldukları projelere erişebilir.
    """
    # 1️⃣ Proje var mı kontrol et
    proj = db.query(Project).filter(Project.id == pid).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    # 2️⃣ Admin dışındakiler için erişim kontrolü
    if user.role != "admin":
        # Kullanıcı proje sahibi mi?
        is_owner = proj.owner_id == user.id

        # Kullanıcı proje üyesi mi?
        is_member = (
            db.query(ProjectMember)
            .filter(ProjectMember.project_id == pid, ProjectMember.user_id == user.id)
            .first()
            is not None
        )

        # Ne sahibi ne de üye ise → erişim reddedilir
        if not (is_owner or is_member):
            raise HTTPException(status_code=403, detail="No access to this project")

    # 3️⃣ Yetkiliyse proje nesnesini döndür
    return proj


def _to_member_out(db: Session, m: ProjectMember) -> ProjectMemberOut:
    """
    ProjectMember modelinden, kullanıcı bilgileriyle birlikte
    ProjectMemberOut Pydantic modeline dönüştürür.
    (user_name ve user_email alanları da doldurulur)
    """
    u = db.query(User).get(m.user_id)
    return ProjectMemberOut(
        id=m.id,
        project_id=m.project_id,
        user_id=m.user_id,
        role_in_project=m.role.value if hasattr(m.role, "value") else str(m.role),
        joined_at=m.created_at,
        user_name=u.name if u else None,
        user_email=u.email if u else None,
    )


# ============================================================
# ENDPOINTLER
# ============================================================

@router.post("/{pid}/members", response_model=ProjectMemberOut, status_code=201)
def add_member(
    pid: int,
    data: ProjectMemberIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Yeni bir kullanıcıyı belirli bir projeye üye olarak ekler.
    - Sadece admin, owner veya projeye erişimi olan kullanıcı çağırabilir.
    """
    # 1️⃣ Yetki kontrolü
    _require_project_access(db, pid, current_user)

    # 2️⃣ Kullanıcı zaten üye mi?
    exists = (
        db.query(ProjectMember)
        .filter(ProjectMember.project_id == pid, ProjectMember.user_id == data.user_id)
        .first()
    )
    if exists:
        raise HTTPException(status_code=409, detail="User already a member")

    # role map: UI'dan gelen "member" → contributor, diğerleri enum'a uyduruluyor
    incoming_role = (data.role_in_project or "member").lower()
    role_map = {
        "member": ProjectMemberRole.contributor,
        "contributor": ProjectMemberRole.contributor,
        "viewer": ProjectMemberRole.viewer,
        "manager": ProjectMemberRole.manager,
        "owner": ProjectMemberRole.owner,
    }
    role_value = role_map.get(incoming_role, ProjectMemberRole.contributor)

    # 3️⃣ Yeni üye oluştur
    member = ProjectMember(
        project_id=pid,
        user_id=data.user_id,
        role=role_value,  # Varsayılan: contributor
    )

    # 4️⃣ Veritabanına ekle
    db.add(member)
    db.commit()
    db.refresh(member)

    # 5️⃣ Üye bilgilerini (user_name, email dahil) döndür
    return _to_member_out(db, member)


@router.get("/{pid}/members", response_model=list[ProjectMemberOut])
def list_members(
    pid: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Belirli bir projenin tüm üyelerini listeler.
    - Sadece admin, owner veya o projenin üyesi erişebilir.
    """
    # 1️⃣ Yetki kontrolü
    _require_project_access(db, pid, current_user)

    # 2️⃣ Üyeleri veritabanından çek
    members = db.query(ProjectMember).filter(ProjectMember.project_id == pid).all()

    # 3️⃣ Kullanıcı bilgilerini dahil ederek döndür
    return [_to_member_out(db, m) for m in members]


@router.delete("/{pid}/members/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_member(
    pid: int,
    member_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Belirli bir projeden bir üyeyi kaldırır (silme işlemi).
    - Sadece admin veya proje sahibi çağırabilir.
    """
    # 1️⃣ Yetki kontrolü
    _require_project_access(db, pid, current_user)

    # 2️⃣ Üye kaydı var mı kontrol et
    m = (
        db.query(ProjectMember)
        .filter(ProjectMember.id == member_id, ProjectMember.project_id == pid)
        .first()
    )
    if not m:
        raise HTTPException(status_code=404, detail="Member not found")

    # 3️⃣ Üyeyi sil
    db.delete(m)
    db.commit()

    # 4️⃣ HTTP 204 → içeriksiz başarı yanıtı
    return
