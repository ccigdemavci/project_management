from alembic import op
import sqlalchemy as sa

revision = "07749fb4cc95"
down_revision = "94e7e7c824ba"
branch_labels = None
depends_on = None

def upgrade():
    # 1) Departments
    op.create_table(
        "departments",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(120), nullable=False, unique=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
    )

    # 2) users.department_id
    op.add_column("users", sa.Column("department_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_users_department",
        "users",
        "departments",
        ["department_id"],
        ["id"],
        ondelete="SET NULL",
    )

    # 3) projects.department_id
    op.add_column("projects", sa.Column("department_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_projects_department",
        "projects",
        "departments",
        ["department_id"],
        ["id"],
        ondelete="SET NULL",
    )

def downgrade():
    op.drop_constraint("fk_projects_department", "projects", type_="foreignkey")
    op.drop_column("projects", "department_id")
    op.drop_constraint("fk_users_department", "users", type_="foreignkey")
    op.drop_column("users", "department_id")
    op.drop_table("departments")