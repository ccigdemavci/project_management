# backend/app/routers/projects.py
from typing import Optional, List
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from ..db import get_db
from ..core.auth import get_current_user
from ..core.policy import (
    require_project_read,
    require_project_manage,
    is_admin,
    is_dept_head,
)

from ..models import (
    Project,
    ProjectStatus,
    User,
    ProjectMember,
    ProjectNote,
    Department,
    ProjectMemberRole,
)

from ..schemas import (
    ProjectCreate,
    ProjectUpdate,
    ProjectOut,
    ProjectDetailOut,
    ProjectMemberOut,
    ProjectNoteOut,
    ProjectSummaryOut,
)

router = APIRouter(prefix="/projects", tags=["projects"])


# ---------------- helpers ----------------
def _parse_status(value: Optional[str]) -> ProjectStatus:
    """'planning' ya da 'Planning' gibi değerleri ProjectStatus Enum’una çevirir."""
    if value is None:
        raise HTTPException(status_code=400, detail="Status is required")

    s = value.strip().lower()

    # Enum name eşleşmesi
    by_name = {name.lower(): enum for name, enum in ProjectStatus.__members__.items()}
    if s in by_name:
        return by_name[s]

    # Enum value eşleşmesi
    for enum_val in ProjectStatus:
        if enum_val.value.lower() == s:
            return enum_val

    raise HTTPException(status_code=400, detail=f"Invalid status: {value}")


def _user_is_member(db: Session, pid: int, user_id: int) -> bool:
    return (
        db.query(ProjectMember)
        .filter(ProjectMember.project_id == pid, ProjectMember.user_id == user_id)
        .first()
        is not None
    )


def _enum_to_str(e) -> str:
    return e.value if hasattr(e, "value") else str(e)


def _to_out(p: Project) -> ProjectOut:
    """ORM Project -> ProjectOut (Enum -> string)"""
    return ProjectOut(
        id=p.id,
        title=p.title,
        status=_enum_to_str(p.status),
        progress=p.progress,
        owner_id=p.owner_id,
        start_date=p.start_date,
        end_date=p.end_date,
        created_at=p.created_at,
    )


# ---------------- CRUD ----------------

@router.post("", response_model=ProjectOut)
def create_project(
    data: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    dept_id = getattr(data, "department_id", None) or getattr(current_user, "department_id", None)

    proj = Project(
        title=data.title,
        status=_parse_status(data.status) if data.status else ProjectStatus.planning,
        progress=data.progress or 0,
        start_date=data.start_date,
        end_date=data.end_date,
        department_id=dept_id,
        owner_id=current_user.id,
    )
    db.add(proj)
    db.commit()
    db.refresh(proj)

    # oluşturan kişiyi owner olarak ekle
    db.add(
        ProjectMember(
            project_id=proj.id,
            user_id=current_user.id,
            role=ProjectMemberRole.owner,
        )
    )
    db.commit()

    return _to_out(proj)


@router.get("/overview", response_model=List[ProjectSummaryOut])
def projects_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Dashboard özet listesi.
    """
    q = db.query(Project)

    if is_admin(current_user):
        pass
    elif is_dept_head(current_user) and current_user.department_id:
        q = q.filter(Project.department_id == current_user.department_id)
    else:
        q = (
            q.join(ProjectMember, ProjectMember.project_id == Project.id)
             .filter(ProjectMember.user_id == current_user.id)
        )

    projects = q.all()
    now = datetime.utcnow()

    summaries: List[ProjectSummaryOut] = []
    for p in projects:
        # owner adı
        owner_name = None
        if p.owner_id:
            owner = db.query(User).get(p.owner_id)
            owner_name = owner.name if owner else None

        # member sayısı
        member_count = (
            db.query(func.count(ProjectMember.id))
            .filter(ProjectMember.project_id == p.id)
            .scalar()
            or 0
        )

        # departman adı
        dept_name = None
        if p.department_id:
            d = db.query(Department).get(p.department_id)
            dept_name = d.name if d else None

        # gecikmiş mi?
        is_overdue = bool(p.end_date and p.status != ProjectStatus.closed and p.end_date < now)

        summaries.append(
            ProjectSummaryOut(
                id=p.id,
                title=p.title,
                status=_enum_to_str(p.status),   # <- burada string veriyoruz
                progress=p.progress,
                start_date=p.start_date,
                end_date=p.end_date,
                department_name=dept_name,
                owner_name=owner_name,
                member_count=member_count,
                is_overdue=is_overdue,
            )
        )
    return summaries


@router.get("", response_model=List[ProjectOut])
def list_my_projects(
    status: Optional[str] = Query(None, description="Filter by status: Planning, Executing, ..."),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Project)

    if current_user.role != "admin":
        q = q.filter(Project.owner_id == current_user.id)

    if status:
        st = _parse_status(status)
        q = q.filter(Project.status == st)

    projects = q.all()
    return [_to_out(p) for p in projects]


@router.get("/{pid}", response_model=ProjectOut)
def get_project(
    pid: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    proj = require_project_read(db, pid, current_user)
    return _to_out(proj)


@router.patch("/{pid}", response_model=ProjectOut)
def update_project(
    pid: int,
    data: ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    proj = require_project_manage(db, pid, current_user)

    if data.title is not None:
        proj.title = data.title
    if data.status is not None:
        proj.status = _parse_status(data.status)
    if data.progress is not None:
        proj.progress = data.progress
    if data.start_date is not None:
        proj.start_date = data.start_date
    if data.end_date is not None:
        proj.end_date = data.end_date

    db.commit()
    db.refresh(proj)
    return _to_out(proj)


@router.delete("/{pid}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    pid: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    proj = require_project_read(db, pid, current_user)

    allowed = False
    if is_admin(current_user):
        allowed = True
    elif is_dept_head(current_user) and current_user.department_id and proj.department_id == current_user.department_id:
        allowed = True
    else:
        m = (
            db.query(ProjectMember)
            .filter_by(project_id=pid, user_id=current_user.id)
            .first()
        )
        allowed = bool(m and m.role == ProjectMemberRole.owner)

    if not allowed:
        raise HTTPException(status_code=403, detail="Only admin/dept head/owner can delete")

    db.delete(proj)
    db.commit()
    return


# ---------------- detail (project + members + notes) ----------------
@router.get("/{pid}/detail", response_model=ProjectDetailOut)
def project_detail(
    pid: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    proj = db.query(Project).filter(Project.id == pid).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    if current_user.role != "admin":
        is_owner = (
            db.query(ProjectMember)
            .filter_by(project_id=pid, user_id=current_user.id, role=ProjectMemberRole.owner)
            .first()
            is not None
        )
        is_member = _user_is_member(db, pid, current_user.id)
        if not (is_owner or is_member):
            raise HTTPException(status_code=403, detail="No access to this project")

    member_rows = (
        db.query(ProjectMember, User)
        .join(User, User.id == ProjectMember.user_id)
        .filter(ProjectMember.project_id == pid)
        .all()
    )
    # Şemanın alan adlarına mapliyoruz
    members = [
        ProjectMemberOut(
            id=m.id,
            project_id=m.project_id,
            user_id=m.user_id,
            role_in_project=getattr(m, "role", None),
            joined_at=getattr(m, "created_at", None),
            user_name=u.name,
            user_email=u.email,
        )
        for (m, u) in member_rows
    ]

    note_rows = (
        db.query(ProjectNote, User)
        .join(User, User.id == ProjectNote.author_id)
        .filter(ProjectNote.project_id == pid)
        .order_by(ProjectNote.created_at.desc())
        .all()
    )
    notes = [
        ProjectNoteOut(
            id=n.id,
            project_id=n.project_id,
            author_id=n.author_id,
            content=n.content,
            created_at=n.created_at,
            author_name=au.name,
            author_email=au.email,
        )
        for (n, au) in note_rows
    ]

    return ProjectDetailOut(
        id=proj.id,
        title=proj.title,
        status=_enum_to_str(proj.status),
        progress=proj.progress,
        owner_id=proj.owner_id,
        start_date=proj.start_date,
        end_date=proj.end_date,
        created_at=proj.created_at,
        members=members,
        notes=notes,
    )