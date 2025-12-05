# backend/app/routers/project_phases.py

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

# DB oturumu ve kimlik doğrulama
from ..db import get_db
from ..core.auth import get_current_user

# Modeller ve enum
from ..models import Project, ProjectPhase, User, PhaseStatus

# İstek/yanıt şemaları
from ..schemas import (
    ProjectPhaseCreate,
    ProjectPhaseUpdate,
    ProjectPhaseOut,
    ReorderPhasesIn,
)

# Tüm endpoint’leri /projects/... altında toplar
router = APIRouter(prefix="/projects", tags=["Project Phases"])


# ============================================================
# YARDIMCI FONKSİYONLAR
# ============================================================

def _require_read(db: Session, pid: int, user: User) -> Project:
    """
    Okuma yetkisi kontrolü:
      - Admin ise her projeyi görebilir.
      - Admin değilse, proje sahibi veya projeye üye olmalı.
    Proje yoksa 404, yetki yoksa 403 döner.
    """
    # Projeyi bul
    proj = db.query(Project).filter(Project.id == pid).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    # Admin → direkt izin
    if user.role != "admin":
        # Sahip mi / Üye mi?
        is_owner = proj.owner_id == user.id
        is_member = any(m.user_id == user.id for m in proj.members)
        if not (is_owner or is_member):
            raise HTTPException(status_code=403, detail="No access to this project")

    return proj


def _require_manage(db: Session, pid: int, user: User) -> Project:
    """
    Yönetim (değiştirme/silme/oluşturma) yetkisi kontrolü:
      - Admin veya proje sahibi olmalı.
    """
    proj = _require_read(db, pid, user)
    if user.role != "admin" and proj.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Only admin/owner can modify phases")
    return proj


def _next_sort(db: Session, pid: int) -> int:
    """
    Yeni eklenecek faz için bir sonraki sıralama numarasını (sort_order) hesaplar.
    Projede mevcut en yüksek sort_order + 1 döner.
    """
    mx = db.query(func.max(ProjectPhase.sort_order)).filter(
        ProjectPhase.project_id == pid
    ).scalar()
    return (mx or 0) + 1


# ============================================================
# CRUD ENDPOINT’LERİ
# ============================================================

@router.get("/{pid}/phases", response_model=List[ProjectPhaseOut])
def list_phases(
    pid: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Projeye ait fazları sırasına göre listeler.
    Okuma yetkisi gerektirir.
    """
    _require_read(db, pid, current_user)

    # sort_order artan, eşitlikte id artan → stabil sıralama
    phases = (
        db.query(ProjectPhase)
        .filter(ProjectPhase.project_id == pid)
        .order_by(ProjectPhase.sort_order.asc(), ProjectPhase.id.asc())
        .all()
    )
    return [_to_out(p) for p in phases]


@router.post("/{pid}/phases", response_model=ProjectPhaseOut, status_code=status.HTTP_201_CREATED)
def create_phase(
    pid: int,
    data: ProjectPhaseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Yeni bir faz oluşturur.
    Yönetim yetkisi (admin/owner) gerektirir.
    sort_order verilmezse en sona eklenir; verilirse çakışma varsa yine en sona atar.
    """
    _require_manage(db, pid, current_user)

    # İstenen sort_order varsa ve o sırayı biri kullanıyorsa, en sona ekle
    desired = data.sort_order
    if desired is None:
        sort_order = _next_sort(db, pid)
    else:
        exists = (
            db.query(ProjectPhase)
              .filter(ProjectPhase.project_id == pid,
                      ProjectPhase.sort_order == desired)
              .first()
        )
        sort_order = _next_sort(db, pid) if exists else desired

    # status alanı Literal veya PhaseStatus enum gelebilir → PhaseStatus'e normalize et
    status_value = (
        PhaseStatus(data.status)
        if isinstance(data.status, str)
        else (data.status or PhaseStatus.not_started)
    )

    # Fazı oluştur
    phase = ProjectPhase(
        project_id=pid,
        name=data.name,
        sort_order=sort_order,
        status=status_value,
        start_date=data.start_date,
        end_date=data.end_date,
    )
    db.add(phase)
    db.commit()
    db.refresh(phase)
    return _to_out(phase)


@router.patch("/{pid}/phases/{phase_id}", response_model=ProjectPhaseOut)
def update_phase(
    pid: int,
    phase_id: int,
    data: ProjectPhaseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Var olan bir fazı günceller (ad, sıra, durum, tarihler).
    Yönetim yetkisi (admin/owner) gerektirir.
    """
    _require_manage(db, pid, current_user)

    # Güncellenecek fazı bul
    phase = (
        db.query(ProjectPhase)
        .filter(ProjectPhase.id == phase_id, ProjectPhase.project_id == pid)
        .first()
    )
    if not phase:
        raise HTTPException(status_code=404, detail="Phase not found")

    # Kısmi güncelleme (yalnızca gönderilen alanlar)
    if data.name is not None:
        phase.name = data.name
    if data.sort_order is not None:
        phase.sort_order = data.sort_order
    if data.status is not None:
        phase.status = (
            PhaseStatus(data.status) if isinstance(data.status, str) else data.status
        )
    if data.start_date is not None:
        phase.start_date = data.start_date
    if data.end_date is not None:
        phase.end_date = data.end_date

    db.commit()
    db.refresh(phase)
    return _to_out(phase)


@router.post("/{pid}/phases/reorder", status_code=status.HTTP_204_NO_CONTENT)
def reorder_phases(
    pid: int,
    body: ReorderPhasesIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Fazların sıralamasını toplu olarak değiştirir.
    Yönetim yetkisi (admin/owner) gerektirir.
    ordered_ids → bu projeye ait tüm faz ID’lerini içermeli ve birebir aynı küme olmalı.
    """
    _require_manage(db, pid, current_user)

    # Mevcut faz ID kümesi ile gelen küme birebir aynı olmalı (eksik/fazla ID kabul edilmez)
    phases = db.query(ProjectPhase).filter(ProjectPhase.project_id == pid).all()
    existing_ids = {p.id for p in phases}
    new_ids = body.ordered_ids

    if set(new_ids) != existing_ids:
        raise HTTPException(
            status_code=400,
            detail="ordered_ids must contain exactly this project's phase IDs",
        )

    # Yeni sıraya göre sort_order’ları 1’den başlayarak güncelle
    for idx, phase_id in enumerate(new_ids, start=1):
        db.query(ProjectPhase).filter(ProjectPhase.id == phase_id).update(
            {"sort_order": idx}
        )
    db.commit()
    return  # 204 No Content


@router.delete("/{pid}/phases/{phase_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_phase(
    pid: int,
    phase_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Bir fazı siler.
    Yönetim yetkisi (admin/owner) gerektirir.
    """
    _require_manage(db, pid, current_user)

    # Silinecek fazı bul
    phase = (
        db.query(ProjectPhase)
        .filter(ProjectPhase.id == phase_id, ProjectPhase.project_id == pid)
        .first()
    )
    if not phase:
        raise HTTPException(status_code=404, detail="Phase not found")

    # Sil ve kaydet
    db.delete(phase)
    db.commit()
    return  # 204 No Content


# ============================================================
# DÖNÜŞÜM (MODEL → ŞEMA)
# ============================================================

def _to_out(p: ProjectPhase) -> ProjectPhaseOut:
    """
    SQLAlchemy ProjectPhase modelini, API yanıt şeması olan
    ProjectPhaseOut'a dönüştürür. Enum status → string değer.
    """
    return ProjectPhaseOut(
        id=p.id,
        project_id=p.project_id,
        name=p.name,
        sort_order=p.sort_order,
        status=p.status.value if hasattr(p.status, "value") else str(p.status),
        start_date=p.start_date,
        end_date=p.end_date,
        created_at=p.created_at,
    )
