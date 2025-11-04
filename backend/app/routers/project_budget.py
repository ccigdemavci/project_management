# backend/app/routers/project_budget.py
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from ..db import get_db
from ..core.auth import get_current_user
from ..core.policy import require_project_manage, require_project_read
from ..models import Project, ProjectExpense, User
from ..schemas import BudgetSetIn, ExpenseCreate, ExpenseOut, BudgetSummaryOut

router = APIRouter(prefix="/projects", tags=["Budget"])

@router.get("/{pid}/budget", response_model=BudgetSummaryOut)
def get_budget(
    pid: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    proj = require_project_read(db, pid, current_user)
    remaining = (proj.total_budget or Decimal("0")) - (proj.spent_amount or Decimal("0"))
    total = Decimal(proj.total_budget or 0)
    spent = Decimal(proj.spent_amount or 0)
    percent = float((spent / total * 100) if total > 0 else 0)
    return BudgetSummaryOut(
        project_id=proj.id,
        total_budget=total,
        spent_amount=spent,
        remaining=remaining,
        percent_used=round(percent, 2),
    )

@router.put("/{pid}/budget", response_model=BudgetSummaryOut, status_code=status.HTTP_200_OK)
def set_budget(
    pid: int,
    body: BudgetSetIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    proj = require_project_manage(db, pid, current_user)
    if body.total_budget < 0:
        raise HTTPException(400, "Budget must be >= 0")
    proj.total_budget = body.total_budget

    # spent_amount korunur; backend harcamalarla güncelliyor
    db.commit()
    db.refresh(proj)
    remaining = (proj.total_budget or Decimal("0")) - (proj.spent_amount or Decimal("0"))
    percent = float((proj.spent_amount / proj.total_budget * 100) if proj.total_budget > 0 else 0)
    return BudgetSummaryOut(
        project_id=proj.id,
        total_budget=proj.total_budget,
        spent_amount=proj.spent_amount,
        remaining=remaining,
        percent_used=round(percent, 2),
    )

@router.post("/{pid}/expenses", response_model=ExpenseOut, status_code=status.HTTP_201_CREATED)
def add_expense(
    pid: int,
    body: ExpenseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    proj = require_project_manage(db, pid, current_user)
    exp = ProjectExpense(
        project_id=pid,
        amount=body.amount,
        note=body.note,
        created_by=current_user.id,
    )
    db.add(exp)

    # anlık toplamı projeye yaz: spent_amount = sum(expenses)
    db.flush()
    spent = db.query(func.coalesce(func.sum(ProjectExpense.amount), 0)).filter(ProjectExpense.project_id == pid).scalar()
    proj.spent_amount = spent
    db.commit()
    db.refresh(exp)
    return exp

@router.get("/{pid}/expenses", response_model=list[ExpenseOut])
def list_expenses(
    pid: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_project_read(db, pid, current_user)
    return db.query(ProjectExpense).filter(ProjectExpense.project_id == pid).order_by(ProjectExpense.created_at.desc()).all()

@router.delete("/{pid}/expenses/{eid}", status_code=status.HTTP_204_NO_CONTENT)
def delete_expense(
    pid: int,
    eid: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    proj = require_project_manage(db, pid, current_user)
    exp = db.query(ProjectExpense).filter(
        ProjectExpense.id == eid,
        ProjectExpense.project_id == pid
    ).first()
    if not exp:
        raise HTTPException(404, "Expense not found")
    db.delete(exp)
    db.flush()
    spent = db.query(func.coalesce(func.sum(ProjectExpense.amount), 0)).filter(ProjectExpense.project_id == pid).scalar()
    proj.spent_amount = spent
    db.commit()
    return