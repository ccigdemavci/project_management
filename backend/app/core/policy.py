# app/core/policy.py
from fastapi import HTTPException
from sqlalchemy.orm import Session
from ..models import (
    Project, ProjectMember, ProjectMemberRole,
    User, UserRole
)

def is_admin(u: User) -> bool:
    return u.role == UserRole.admin

def is_dept_head(u: User) -> bool:
    return u.role == UserRole.dept_head

def is_member(db: Session, pid: int, uid: int) -> bool:
    return db.query(ProjectMember).filter_by(project_id=pid, user_id=uid).first() is not None

def is_owner(db: Session, pid: int, uid: int) -> bool:
    return db.query(ProjectMember).filter_by(project_id=pid, user_id=uid, role=ProjectMemberRole.owner).first() is not None

def require_project_read(db: Session, pid: int, user: User) -> Project:
    proj = db.query(Project).filter(Project.id == pid).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    if is_admin(user):
        return proj
    if is_dept_head(user) and user.department_id and proj.department_id == user.department_id:
        return proj
    if is_member(db, pid, user.id):
        return proj
    raise HTTPException(status_code=403, detail="No access to this project")

def require_project_manage(db: Session, pid: int, user: User) -> Project:
    proj = require_project_read(db, pid, user)
    # Yönetim izni: admin, aynı departmanın dept_head’i, projede owner/pm
    if is_admin(user):
        return proj
    if is_dept_head(user) and user.department_id and proj.department_id == user.department_id:
        return proj
    m = db.query(ProjectMember).filter_by(project_id=pid, user_id=user.id).first()
    if m and m.role in (ProjectMemberRole.owner, ProjectMemberRole.pm, ProjectMemberRole.member):
        # İstediğin sertliğe göre burada member'ı da ekledim (değişiklik yapabilsin demiştin)
        return proj
    raise HTTPException(status_code=403, detail="Not allowed to manage this project")