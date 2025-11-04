"""add project budget & expenses

Revision ID: 32fbdbad88e5
Revises: a723e850ffa9
Create Date: 2025-10-16 14:00:52.581628
"""
from alembic import op
import sqlalchemy as sa

revision = "32fbdbad88e5"
down_revision = "a723e850ffa9"
branch_labels = None
depends_on = None

def upgrade() -> None:
    # projects tablosuna toplam/harcanan bütçe
    op.add_column(
        "projects",
        sa.Column("total_budget", sa.Numeric(12, 2), nullable=False, server_default="0.00"),
    )
    op.add_column(
        "projects",
        sa.Column("spent_amount", sa.Numeric(12, 2), nullable=False, server_default="0.00"),
    )

    # harcama kalemleri tablosu
    op.create_table(
        "project_expenses",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("project_id", sa.Integer, sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("note", sa.String(255), nullable=True),
        sa.Column("created_by", sa.Integer, sa.ForeignKey("users.id"), nullable=True, index=True),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        mysql_engine="InnoDB",
        mysql_charset="utf8mb4",
    )
    op.create_index("ix_expenses_project", "project_expenses", ["project_id"])

def downgrade() -> None:
    op.drop_index("ix_expenses_project", table_name="project_expenses")
    op.drop_table("project_expenses")
    op.drop_column("projects", "spent_amount")
    op.drop_column("projects", "total_budget")