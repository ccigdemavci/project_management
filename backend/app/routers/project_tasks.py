# backend/app/routers/project_tasks.py
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from ..db import get_db
from ..core.auth import get_current_user
from ..models import Project, ProjectPhase, PhaseTask, TaskStatus, User
from ..schemas import TaskCreate, TaskUpdate, TaskOut, ReorderTasksIn

router = APIRouter(prefix="/projects", tags=["Phase Tasks"])

def _require_read(db: Session, pid: int, user: User) -> Project:
    proj = db.query(Project).filter(Project.id == pid).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    if user.role != "admin":
        is_owner = proj.owner_id == user.id
        is_member = any(m.user_id == user.id for m in proj.members)
        if not (is_owner or is_member):
            raise HTTPException(status_code=403, detail="No access to this project")
    return proj

def _require_manage(db: Session, pid: int, user: User) -> Project:
    proj = _require_read(db, pid, user)
    if user.role != "admin" and proj.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Only admin/owner can modify tasks")
    return proj

def _next_order(db: Session, phase_id: int) -> int:
    mx = db.query(func.max(PhaseTask.sort_order)).filter(PhaseTask.phase_id == phase_id).scalar()
    return (mx or 0) + 1

def _to_out(t: PhaseTask) -> TaskOut:
    return TaskOut(
        id=t.id,
        project_id=t.project_id,
        phase_id=t.phase_id,
        title=t.title,
        description=t.description,
        order=t.sort_order,
        status=(t.status.value if hasattr(t.status, "value") else str(t.status)),
        assignee_id=t.assignee_id,
        start_date=t.start_date,
        due_date=t.due_date,
        completed_at=t.completed_at,
        created_at=t.created_at,
        updated_at=t.updated_at,
    )

@router.get("/{pid}/phases/{phase_id}/tasks", response_model=List[TaskOut])
def list_tasks(
    pid: int,
    phase_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_read(db, pid, current_user)
    phase = db.query(ProjectPhase).filter_by(id=phase_id, project_id=pid).first()
    if not phase:
        raise HTTPException(status_code=404, detail="Phase not found")

    tasks = (
        db.query(PhaseTask)
          .filter(PhaseTask.phase_id == phase_id)
          .order_by(PhaseTask.sort_order.asc(), PhaseTask.id.asc())
          .all()
    )
    return [_to_out(t) for t in tasks]

@router.post("/{pid}/phases/{phase_id}/tasks", response_model=TaskOut, status_code=status.HTTP_201_CREATED)
def create_task(
    pid: int,
    phase_id: int,
    data: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_manage(db, pid, current_user)

    phase = db.query(ProjectPhase).filter_by(id=phase_id, project_id=pid).first()
    if not phase:
        raise HTTPException(status_code=404, detail="Phase not found")

    sort_order = data.order if data.order is not None else _next_order(db, phase_id)
    status_val = TaskStatus(data.status) if isinstance(data.status, str) else (data.status or TaskStatus.todo)

    t = PhaseTask(
        project_id=pid,
        phase_id=phase_id,
        title=data.title,
        description=data.description,
        sort_order=sort_order,
        status=status_val,
        assignee_id=data.assignee_id,
        start_date=data.start_date,
        due_date=data.due_date,
    )
    db.add(t)
    db.commit()
    db.refresh(t)
    return _to_out(t)

@router.patch("/{pid}/tasks/{task_id}", response_model=TaskOut)
def update_task(
    pid: int,
    task_id: int,
    data: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_manage(db, pid, current_user)
    t = db.query(PhaseTask).filter(PhaseTask.id == task_id, PhaseTask.project_id == pid).first()
    if not t:
        raise HTTPException(status_code=404, detail="Task not found")

    # faz değiştirme istenirse
    if data.phase_id is not None and data.phase_id != t.phase_id:
        target_phase = db.query(ProjectPhase).filter_by(id=data.phase_id, project_id=pid).first()
        if not target_phase:
            raise HTTPException(status_code=404, detail="Target phase not found")
        t.phase_id = data.phase_id
        t.sort_order = _next_order(db, data.phase_id)

    if data.title is not None:
        t.title = data.title
    if data.description is not None:
        t.description = data.description
    if data.order is not None:
        t.sort_order = data.order
    if data.status is not None:
        t.status = TaskStatus(data.status) if isinstance(data.status, str) else data.status
        if str(t.status) in ("done", TaskStatus.done.value):
            from datetime import datetime as _dt
            t.completed_at = _dt.utcnow()
        else:
            t.completed_at = None
    if data.assignee_id is not None:
        t.assignee_id = data.assignee_id
    if data.start_date is not None:
        t.start_date = data.start_date
    if data.due_date is not None:
        t.due_date = data.due_date

    db.commit()
    db.refresh(t)
    return _to_out(t)

@router.delete("/{pid}/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    pid: int,
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_manage(db, pid, current_user)
    t = db.query(PhaseTask).filter(PhaseTask.id == task_id, PhaseTask.project_id == pid).first()
    if not t:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(t)
    db.commit()
    return

@router.post("/{pid}/phases/{phase_id}/tasks/reorder", status_code=status.HTTP_204_NO_CONTENT)
def reorder_tasks(
    pid: int,
    phase_id: int,
    body: ReorderTasksIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_manage(db, pid, current_user)
    tasks = db.query(PhaseTask).filter(PhaseTask.phase_id == phase_id, PhaseTask.project_id == pid).all()
    exists = {t.id for t in tasks}
    incoming = set(body.ordered_ids)
    if exists != incoming:
        raise HTTPException(status_code=400, detail="ordered_ids must match exactly the tasks of this phase")

    for idx, tid in enumerate(body.ordered_ids, start=1):
        db.query(PhaseTask).filter(PhaseTask.id == tid).update({"sort_order": idx})
    db.commit()
    return