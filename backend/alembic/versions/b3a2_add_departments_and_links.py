"""add departments and links"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql
from datetime import datetime

# revision identifiers, used by Alembic.
revision = 'b3a2_add_departments_and_links'
down_revision = '94e7c7c824ba'  # önceki migration ID, senin terminalde görünen buydu
branch_labels = None
depends_on = None


def upgrade():
    # 1) departments tablosu
    op.create_table(
        'departments',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('name', sa.String(length=120), nullable=False, unique=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        mysql_charset='utf8mb4',
        mysql_collate='utf8mb4_general_ci',
    )

    # 2) users.department_id kolonu + FK
    op.add_column('users', sa.Column('department_id', sa.Integer(), nullable=True))
    op.create_foreign_key(
        'fk_users_department',
        'users', 'departments',
        ['department_id'], ['id'],
        ondelete='SET NULL'
    )

    # 3) projects.department_id kolonu + FK
    op.add_column('projects', sa.Column('department_id', sa.Integer(), nullable=True))
    op.create_foreign_key(
        'fk_projects_department',
        'projects', 'departments',
        ['department_id'], ['id'],
        ondelete='SET NULL'
    )

    # 4) varsayılan "Genel" departmanı oluştur
    op.execute(
        sa.text("INSERT INTO departments (name, created_at) VALUES (:n, :c)")
        .bindparams(n="Genel", c=datetime.utcnow())
    )


def downgrade():
    op.drop_constraint('fk_projects_department', 'projects', type_='foreignkey')
    op.drop_column('projects', 'department_id')

    op.drop_constraint('fk_users_department', 'users', type_='foreignkey')
    op.drop_column('users', 'department_id')

    op.drop_table('departments')