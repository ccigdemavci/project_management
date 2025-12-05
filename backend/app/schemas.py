# backend/app/schemas.py
from typing import Optional, Literal, List
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field

# ======================
# AUTH / USER
# ======================
class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: Literal["admin", "pm", "member"] = "member"

class UserOut(BaseModel):
    id: int
    name: str
    email: EmailStr
    role: str
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ======================
# PROJECT
#   Not: API dışına hep string status veriyoruz.
# ======================
class ProjectCreate(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    status: Optional[str] = "Planning"      # "Idea" | "Planning" | "Executing" | "Monitoring" | "Closed"
    priority: Optional[str] = "Normal"      # "High" | "Medium" | "Normal"
    progress: Optional[int] = Field(default=0, ge=0, le=100)
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    department_id: Optional[int] = None

class ProjectUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=3, max_length=200)
    status: Optional[str] = None
    priority: Optional[str] = None
    progress: Optional[int] = Field(default=None, ge=0, le=100)
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None

class ProjectOut(BaseModel):
    id: int
    title: str
    status: str
    priority: str
    progress: int
    owner_id: Optional[int]
    start_date: Optional[datetime]
    end_date: Optional[datetime]
    created_at: datetime
    team_size: int = 0
    class Config:
        from_attributes = True


# ======================
# PROJECT MEMBERS
# ======================
class ProjectMemberIn(BaseModel):
    user_id: int
    # models.ProjectMemberRole ile uyumlu değerler: owner | manager | contributor | viewer | member
    role_in_project: Optional[str] = "member"

class ProjectMemberOut(BaseModel):
    id: int
    project_id: int
    user_id: int
    role_in_project: str          # dışa açık alan adı
    joined_at: datetime           # created_at yerine dışarıda joined_at
    # vitrin bilgileri (join ile dolduruyoruz)
    user_name: Optional[str] = None
    user_email: Optional[str] = None

    class Config:
        from_attributes = True


# ======================
# PROJECT NOTES
# ======================
class ProjectNoteCreate(BaseModel):
    content: str

class ProjectNoteOut(BaseModel):
    id: int
    project_id: int
    author_id: int
    content: str
    created_at: datetime
    author_name: Optional[str] = None
    author_email: Optional[str] = None
    class Config:
        from_attributes = True


# ======================
# PROJECT DETAIL (project + members + notes)
# ======================
class ProjectDetailOut(BaseModel):
    id: int
    title: str
    status: str
    progress: int
    owner_id: Optional[int]
    start_date: Optional[datetime]
    end_date: Optional[datetime]
    created_at: datetime
    members: List[ProjectMemberOut]
    notes: List[ProjectNoteOut]
    class Config:
        from_attributes = True


# ======================
# PROJECT SUMMARY (dashboard list)
# ======================
class ProjectSummaryOut(BaseModel):
    id: int
    title: str
    status: str                 # string (Enum değil)
    progress: int
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    department_name: Optional[str] = None
    owner_name: Optional[str] = None
    member_count: int = 0
    is_overdue: bool = False
    class Config:
        from_attributes = True


# ======================
# PROJECT PHASES
#   Not: DB kolonu sort_order ama API'de 'order' ismiyle gider-gelir.
# ======================
class ProjectPhaseCreate(BaseModel):
    name: str
    sort_order: Optional[int] = None
    status: Optional[Literal["not_started", "in_progress", "blocked", "done"]] = "not_started"
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None

class ProjectPhaseUpdate(BaseModel):
    name: Optional[str] = None
    sort_order: Optional[int] = None
    status: Optional[Literal["not_started", "in_progress", "blocked", "done"]] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None

class ProjectPhaseOut(BaseModel):
    id: int
    project_id: int
    name: str
    sort_order: int
    status: Literal["not_started", "in_progress", "blocked", "done"]
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    created_at: datetime
    class Config:
        from_attributes = True

class ReorderPhasesIn(BaseModel):
    ordered_ids: List[int]


# ======================
# PHASE DETAILS (phase altındaki detaylar)
# ======================
class PhaseDetailBase(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: Optional[str] = None
    is_completed: bool = False
    sort_order: Optional[int] = 0
    parent_id: Optional[int] = None
    item_type: Optional[str] = "task"
    
    # New detailed fields
    scope: Optional[str] = None
    reference: Optional[str] = None
    responsible: Optional[str] = None
    effort: Optional[float] = None
    unit: Optional[str] = "Saat"
    
    # Gantt dates
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    
    # Gantt dates
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    
    priority: Optional[str] = "Normal"
    completed_at: Optional[datetime] = None

class PhaseDetailCreate(PhaseDetailBase):
    phase_id: int

class PhaseDetailUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    description: Optional[str] = None
    is_completed: Optional[bool] = None
    sort_order: Optional[int] = None
    parent_id: Optional[int] = None
    item_type: Optional[str] = None
    
    # New detailed fields
    scope: Optional[str] = None
    reference: Optional[str] = None
    responsible: Optional[str] = None
    effort: Optional[float] = None
    unit: Optional[str] = None
    
    # Gantt dates
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    
    priority: Optional[str] = None

class PhaseDetail(PhaseDetailBase):
    id: int
    phase_id: int
    created_at: datetime
    updated_at: datetime
    children: List['PhaseDetail'] = []

    class Config:
        from_attributes = True

# Resolve forward reference
PhaseDetail.model_rebuild()



# ======================
# PROJECT FILES (upload/download list)
# ======================
class ProjectFileOut(BaseModel):
    id: int
    project_id: int
    filename: str
    content_type: Optional[str] = None
    size_bytes: Optional[int] = None
    created_at: datetime
    class Config:
        from_attributes = True


# ======================
# TASKS (phase altındaki işler)
#   Not: Router model->DTO çevirirken sort_order => order mapler.
# ======================
class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: Optional[str] = None
    assignee_id: Optional[int] = None
    status: Optional[Literal["todo", "in_progress", "blocked", "done"]] = "todo"
    priority: Optional[Literal["low", "medium", "high"]] = "medium"
    due_date: Optional[datetime] = None
    order: Optional[int] = None

class TaskUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    description: Optional[str] = None
    assignee_id: Optional[int] = None
    status: Optional[Literal["todo", "in_progress", "blocked", "done"]] = None
    priority: Optional[Literal["low", "medium", "high"]] = None
    due_date: Optional[datetime] = None
    order: Optional[int] = None

class TaskOut(BaseModel):
    id: int
    project_id: int
    phase_id: int
    title: str
    description: Optional[str] = None
    assignee_id: Optional[int] = None
    status: Literal["todo", "in_progress", "blocked", "done"]
    priority: Literal["low", "medium", "high"]
    order: int
    due_date: Optional[datetime] = None
    created_at: datetime
    class Config:
        from_attributes = True

class ReorderTasksIn(BaseModel):
    ordered_ids: List[int]
    
    
from decimal import Decimal

class BudgetSetIn(BaseModel):
    total_budget: Decimal = Field(ge=0)

class ExpenseCreate(BaseModel):
    amount: Decimal = Field(gt=0)
    note: Optional[str] = Field(default=None, max_length=255)

class ExpenseOut(BaseModel):
    id: int
    project_id: int
    amount: Decimal
    note: Optional[str] = None
    created_by: Optional[int] = None
    created_at: datetime
    class Config:
        from_attributes = True

class BudgetSummaryOut(BaseModel):
    project_id: int
    total_budget: Decimal
    spent_amount: Decimal
    remaining: Decimal
    percent_used: float

# ======================
# NOTES
# ======================
class PhaseDetailNoteBase(BaseModel):
    note: str

class PhaseDetailNoteCreate(PhaseDetailNoteBase):
    detail_id: int
    user: str

class PhaseDetailNoteOut(PhaseDetailNoteBase):
    id: int
    detail_id: int
    user: str
    created_at: datetime
    
    class Config:
        from_attributes = True
