"""add project files

Revision ID: a723e850ffa9
Revises: 6598e2b311b5
Create Date: 2025-10-16 13:24:45.125090
"""
from alembic import op
import sqlalchemy as sa

revision = "a723e850ffa9"
down_revision = "6598e2b311b5"
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.create_table(
        "project_files",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("project_id", sa.Integer(), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("uploader_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True),
        sa.Column("filename", sa.String(255), nullable=False),          # orijinal isim
        sa.Column("stored_path", sa.String(500), nullable=False),       # disk/S3 yolu
        sa.Column("content_type", sa.String(100), nullable=True),
        sa.Column("size_bytes", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Index("ix_project_files_project_created", "project_id", "created_at"),
    )

def downgrade() -> None:
    op.drop_table("project_files")