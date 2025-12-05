# backend/app/models.py

from __future__ import annotations  # İleriye dönük referanslar için (örneğin "User" gibi string tip tanımı)
from datetime import datetime
import enum
from typing import Optional
from decimal import Decimal
from sqlalchemy import Numeric

# SQLAlchemy bileşenleri import edilir
from sqlalchemy import (
    Integer, String, DateTime, ForeignKey, Text, UniqueConstraint, func, Enum,
)
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import relationship, Mapped, mapped_column

# Veritabanı taban sınıfı (Base) içe aktarılır
from .db import Base


# ============================================================
# ENUM TANIMLARI
# ============================================================
# Enum sınıfları sabit değerleri (ör. roller, durumlar) tanımlamak için kullanılır.
# Bunlar hem okunabilirliği artırır hem de hatalı veri girişini engeller.

class UserRole(str, enum.Enum):
    """Kullanıcı rollerini tanımlar."""
    admin = "admin"
    pm = "pm"              # Project Manager
    member = "member"


class ProjectStatus(str, enum.Enum):
    """Projelerin aşama durumlarını belirtir."""
    idea = "Idea"
    planning = "Planning"
    executing = "Executing"
    monitoring = "Monitoring"
    closed = "Closed"


class ProjectPriority(str, enum.Enum):
    """Proje öncelik seviyeleri."""
    High = "High"       # Önemli
    Medium = "Medium"   # Orta
    Normal = "Normal"   # Normal


class ProjectMemberRole(str, enum.Enum):
    """Projedeki kullanıcı rolü."""
    owner = "owner"          # Proje sahibi
    manager = "manager"      # Yöneten
    contributor = "contributor"  # Katkıda bulunan
    viewer = "viewer"        # Sadece görüntüleyen


class PhaseStatus(str, enum.Enum):
    """Proje fazlarının (aşamalarının) ilerleme durumları."""
    not_started = "not_started"
    in_progress = "in_progress"
    blocked = "blocked"
    done = "done"


# ============================================================
# DEPARTMENT MODELİ
# ============================================================
class Department(Base):
    """
    Şirket veya organizasyon içindeki departmanları temsil eder.
    Bir departmanın birden fazla kullanıcısı ve projesi olabilir.
    """
    __tablename__ = "departments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), unique=True, index=True)  # Departman adı benzersiz olmalı
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # İlişkiler
    users: Mapped[list["User"]] = relationship(
        "User", back_populates="department", cascade="all, delete-orphan"
    )  # Bir departmanın kullanıcıları
    projects: Mapped[list["Project"]] = relationship(
        "Project", back_populates="department", cascade="all, delete-orphan"
    )  # Bir departmanın projeleri


# ============================================================
# USER MODELİ
# ============================================================
class User(Base):
    """
    Sistemdeki kullanıcıları temsil eder.
    Her kullanıcının adı, e-postası, parolası, rolü ve ait olduğu departman olabilir.
    """
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(120))  # Kullanıcı adı
    email: Mapped[str] = mapped_column(String(160), unique=True, index=True)  # E-posta (benzersiz)
    password_hash: Mapped[str] = mapped_column(String(255))  # Parola hash’i
    role: Mapped[UserRole] = mapped_column(SAEnum(UserRole), default=UserRole.member)  # Varsayılan: member
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Departman bağlantısı
    department_id: Mapped[Optional[int]] = mapped_column(ForeignKey("departments.id"), nullable=True)
    department: Mapped[Optional["Department"]] = relationship("Department", back_populates="users")

    # İlişkiler
    owned_projects: Mapped[list["Project"]] = relationship("Project", back_populates="owner")  # Sahip olduğu projeler
    memberships: Mapped[list["ProjectMember"]] = relationship(
        "ProjectMember", back_populates="user", cascade="all, delete-orphan"
    )  # Üyesi olduğu projeler
    notes: Mapped[list["ProjectNote"]] = relationship(
        "ProjectNote", back_populates="author", cascade="all, delete-orphan"
    )  # Kullanıcının yazdığı notlar


# ============================================================
# PROJECT MODELİ
# ============================================================
class Project(Base):
    """
    Proje bilgilerini tutar.
    Her proje bir departmana ve bir sahibine (owner) ait olabilir.
    """
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(200), index=True)  # Proje başlığı
    status: Mapped[ProjectStatus] = mapped_column(SAEnum(ProjectStatus), default=ProjectStatus.planning)
    progress: Mapped[int] = mapped_column(Integer, default=0)  # Proje ilerleme yüzdesi (0–100)

    priority: Mapped[ProjectPriority] = mapped_column(SAEnum(ProjectPriority), default=ProjectPriority.Normal)

    # İlişkiler ve yabancı anahtarlar
    owner_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    owner: Mapped[Optional["User"]] = relationship("User", back_populates="owned_projects")

    department_id: Mapped[Optional[int]] = mapped_column(ForeignKey("departments.id"), nullable=True, index=True)
    department: Mapped[Optional["Department"]] = relationship("Department", back_populates="projects")

    # Tarihler
    start_date: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    end_date: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # İlişkiler (bir projeye ait üyeler, notlar, fazlar)
    members: Mapped[list["ProjectMember"]] = relationship(
        "ProjectMember", back_populates="project", cascade="all, delete-orphan"
    )
    notes: Mapped[list["ProjectNote"]] = relationship(
        "ProjectNote", back_populates="project", cascade="all, delete-orphan"
    )
    phases: Mapped[list["ProjectPhase"]] = relationship(
        "ProjectPhase", back_populates="project", cascade="all, delete-orphan"
    )
    
    files = relationship("ProjectFile", back_populates="project", cascade="all, delete-orphan")

    total_budget: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"))
    spent_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"))

    expenses = relationship("ProjectExpense", back_populates="project", cascade="all, delete-orphan")

# ============================================================
# PROJECT MEMBER MODELİ
# ============================================================
class ProjectMember(Base):
    """
    Proje ile kullanıcı arasındaki ilişkiyi temsil eder.
    (Yani hangi kullanıcı hangi projede hangi rolde görevli?)
    """
    __tablename__ = "project_members"
    __table_args__ = (UniqueConstraint("project_id", "user_id", name="uq_project_user"),)
    # Aynı kullanıcı bir projede yalnızca bir kez yer alabilir.

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    role: Mapped[ProjectMemberRole] = mapped_column(
        SAEnum(ProjectMemberRole), default=ProjectMemberRole.contributor
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # İlişkiler
    project: Mapped["Project"] = relationship("Project", back_populates="members")
    user: Mapped["User"] = relationship("User", back_populates="memberships")


# ============================================================
# PROJECT NOTE MODELİ
# ============================================================
class ProjectNote(Base):
    """
    Projeye eklenen notları tutar.
    Her not bir kullanıcı (author) tarafından yazılır ve bir projeye aittir.
    """
    __tablename__ = "project_notes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), index=True)
    author_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    content: Mapped[str] = mapped_column(Text)  # Not içeriği
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # İlişkiler
    project: Mapped["Project"] = relationship("Project", back_populates="notes")
    author: Mapped["User"] = relationship("User", back_populates="notes")


# ============================================================
# PROJECT PHASE MODELİ
# ============================================================
class ProjectPhase(Base):
    """
    Projenin aşamalarını (fazlarını) tutar.
    Örn: “Planlama”, “Uygulama”, “Test”, “Tamamlandı” gibi.
    """
    __tablename__ = "project_phases"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    project_id: Mapped[int] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )  # Proje silinirse fazlar da silinir
    name: Mapped[str] = mapped_column(String(200), nullable=False)  # Faz adı

    # Faz sırası (örneğin 1: planlama, 2: geliştirme)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, server_default="1")

    # Faz durumu (başlamadı, devam ediyor, tamamlandı vb.)
    status: Mapped[PhaseStatus] = mapped_column(
        SAEnum(PhaseStatus, name="phase_status"), nullable=False, default=PhaseStatus.not_started
    )

    # Tarihler
    start_date: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    end_date: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())

    # İlişki
    project: Mapped["Project"] = relationship("Project", back_populates="phases")
    details: Mapped[list["PhaseDetail"]] = relationship(
        "PhaseDetail", 
        back_populates="phase",
        cascade="all, delete-orphan",
        order_by="PhaseDetail.sort_order"
    )
    
    
    # ---------- PHASE TASK (görev/alt başlık) ----------
import enum as _enum

class TaskStatus(str, _enum.Enum):
    todo = "todo"
    doing = "doing"
    done = "done"
    canceled = "canceled"

class PhaseTask(Base):
    __tablename__ = "phase_tasks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True, nullable=False)
    phase_id: Mapped[int]   = mapped_column(ForeignKey("project_phases.id", ondelete="CASCADE"), index=True, nullable=False)

    title: Mapped[str]       = mapped_column(String(200), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # DB'de kolon adı sort_order olsun (fazla aynı mantık)
    sort_order: Mapped[int]  = mapped_column(Integer, nullable=False, default=1)

    status: Mapped[TaskStatus] = mapped_column(Enum(TaskStatus), nullable=False, default=TaskStatus.todo)

    assignee_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)

    start_date: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    due_date:   Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    project = relationship("Project")
    phase   = relationship("ProjectPhase")
    assignee = relationship("User", foreign_keys=[assignee_id])
    
    
from sqlalchemy import Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime

class ProjectFile(Base):
    __tablename__ = "project_files"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    uploader_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), index=True, nullable=True)

    filename: Mapped[str] = mapped_column(String(255))       # orijinal ad
    stored_path: Mapped[str] = mapped_column(String(500))    # diskteki yol
    content_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    size_bytes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="files")
    uploader = relationship("User", lazy="joined", foreign_keys=[uploader_id])

# Project içine ilişki ekle (tek bir Project sınıfın var, o class’ın içine):
# files = relationship("ProjectFile", back_populates="project", cascade="all, delete-orphan")

class PhaseDetail(Base):
    """Stores sub-items/details for each project phase."""
    __tablename__ = "phase_details"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    phase_id: Mapped[int] = mapped_column(
        ForeignKey("project_phases.id", ondelete="CASCADE"), 
        nullable=False,
        index=True
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_completed: Mapped[bool] = mapped_column(default=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    
    # New detailed fields
    scope: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    reference: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    responsible: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    effort: Mapped[Optional[float]] = mapped_column(Numeric(10, 2), nullable=True)
    unit: Mapped[str] = mapped_column(String(20), default="Saat")
    
    # Gantt dates
    start_date: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    end_date: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    
    # Priority
    priority: Mapped[str] = mapped_column(String(20), default="Normal")
    
    # Completion Time
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    phase: Mapped["ProjectPhase"] = relationship("ProjectPhase", back_populates="details")
    
    # Recursive relationship
    parent_id: Mapped[Optional[int]] = mapped_column(ForeignKey("phase_details.id", ondelete="CASCADE"), nullable=True)
    item_type: Mapped[str] = mapped_column(String(20), default="task") # "task" or "sub_phase"
    
    children: Mapped[list["PhaseDetail"]] = relationship(
        "PhaseDetail",
        back_populates="parent",
        cascade="all, delete-orphan"
    )
    
    parent: Mapped[Optional["PhaseDetail"]] = relationship(
        "PhaseDetail",
        remote_side="PhaseDetail.id",
        back_populates="children"
    )
    
    notes: Mapped[list["PhaseDetailNote"]] = relationship(
        "PhaseDetailNote",
        back_populates="detail",
        cascade="all, delete-orphan"
    )

class PhaseDetailNote(Base):
    __tablename__ = "phase_detail_notes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    detail_id: Mapped[int] = mapped_column(
        ForeignKey("phase_details.id", ondelete="CASCADE"), 
        nullable=False,
        index=True
    )
    user: Mapped[str] = mapped_column(String(100), nullable=False)
    note: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    detail: Mapped["PhaseDetail"] = relationship("PhaseDetail", back_populates="notes")

class ProjectExpense(Base):
    __tablename__ = "project_expenses"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    note: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_by: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="expenses")
