"""add phase_tasks table

Revision ID: 6598e2b311b5
Revises: 46919fabac61
Create Date: 2025-10-16 09:24:29.803317

"""
from alembic import op
import sqlalchemy as sa

# revision ids
revision = "6598e2b311b5"
down_revision = "46919fabac61"  # project_phases rev id'in buydu, sende farklıysa ona göre düzelt
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.create_table(
        "phase_tasks",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("project_id", sa.Integer(), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("phase_id", sa.Integer(), sa.ForeignKey("project_phases.id", ondelete="CASCADE"), nullable=False, index=True),

        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),

        sa.Column("sort_order", sa.Integer(), nullable=False, server_default=sa.text("1")),

        sa.Column("status", sa.Enum("todo","doing","done","canceled", name="task_status"), nullable=False, server_default="todo"),

        sa.Column("assignee_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True, index=True),

        sa.Column("start_date", sa.DateTime(), nullable=True),
        sa.Column("due_date", sa.DateTime(), nullable=True),
        sa.Column("completed_at", sa.DateTime(), nullable=True),

        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),

        mysql_engine="InnoDB",
        mysql_charset="utf8mb4",
    )

    # aynı faz içinde sıranın benzersiz olması (faz içi 1,2,3...)
    op.create_unique_constraint(
        "uq_phase_tasks_phase_order",
        "phase_tasks",
        ["phase_id", "sort_order"],
    )

    # sorgu hızları için indexler
    op.create_index("ix_phase_tasks_project", "phase_tasks", ["project_id"])
    op.create_index("ix_phase_tasks_phase", "phase_tasks", ["phase_id"])
    op.create_index("ix_phase_tasks_status", "phase_tasks", ["status"])

def downgrade() -> None:
    op.drop_index("ix_phase_tasks_status", table_name="phase_tasks")
    op.drop_index("ix_phase_tasks_phase", table_name="phase_tasks")
    op.drop_index("ix_phase_tasks_project", table_name="phase_tasks")
    op.drop_constraint("uq_phase_tasks_phase_order", "phase_tasks", type_="unique")
    op.drop_table("phase_tasks")