"""add project phases table

Revision ID: 46919fabac61
Revises: 07749fb4cc95
Create Date: 2025-10-09 00:00:00
"""
from alembic import op
import sqlalchemy as sa

# Alembic identifiers
revision = "46919fabac61"
down_revision = "07749fb4cc95"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Faz durum enum'u
    phase_status = sa.Enum(
        "not_started", "in_progress", "blocked", "done",
        name="phase_status"
    )

    op.create_table(
        "project_phases",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column(
            "project_id",
            sa.Integer(),
            sa.ForeignKey("projects.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(200), nullable=False),
        # MySQL'de 'order' keyword, o yüzden sort_order kullandık
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default=sa.text("1")),
        sa.Column("status", phase_status, nullable=False, server_default="not_started"),
        sa.Column("start_date", sa.DateTime(), nullable=True),
        sa.Column("end_date", sa.DateTime(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.UniqueConstraint("project_id", "sort_order", name="uq_project_phases_project_order"),
        mysql_engine="InnoDB",
        mysql_charset="utf8mb4",
    )

    op.create_index("ix_project_phases_project", "project_phases", ["project_id"])
    op.create_index("ix_project_phases_status", "project_phases", ["status"])


def downgrade() -> None:
    op.drop_index("ix_project_phases_status", table_name="project_phases")
    op.drop_index("ix_project_phases_project", table_name="project_phases")
    op.drop_constraint("uq_project_phases_project_order", "project_phases", type_="unique")
    op.drop_table("project_phases")