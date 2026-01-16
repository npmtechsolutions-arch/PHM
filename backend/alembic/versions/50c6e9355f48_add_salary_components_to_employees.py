"""add_salary_components_to_employees

Revision ID: 50c6e9355f48
Revises: o5p6q7r8s9t0
Create Date: 2026-01-16 15:03:03.492100

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '50c6e9355f48'
down_revision: Union[str, None] = 'o5p6q7r8s9t0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add salary component columns to employees table
    op.add_column('employees', sa.Column('hra_percent', sa.Float(), nullable=True))
    op.add_column('employees', sa.Column('allowances_percent', sa.Float(), nullable=True))
    op.add_column('employees', sa.Column('pf_percent', sa.Float(), nullable=True))
    op.add_column('employees', sa.Column('esi_percent', sa.Float(), nullable=True))
    op.add_column('employees', sa.Column('esi_applicable', sa.Boolean(), nullable=True))
    
    # Set default values for existing employees
    op.execute("UPDATE employees SET hra_percent = 40.0 WHERE hra_percent IS NULL")
    op.execute("UPDATE employees SET allowances_percent = 20.0 WHERE allowances_percent IS NULL")
    op.execute("UPDATE employees SET pf_percent = 12.0 WHERE pf_percent IS NULL")
    op.execute("UPDATE employees SET esi_percent = 0.75 WHERE esi_percent IS NULL")
    op.execute("UPDATE employees SET esi_applicable = TRUE WHERE esi_applicable IS NULL")


def downgrade() -> None:
    # Remove salary component columns
    op.drop_column('employees', 'esi_applicable')
    op.drop_column('employees', 'esi_percent')
    op.drop_column('employees', 'pf_percent')
    op.drop_column('employees', 'allowances_percent')
    op.drop_column('employees', 'hra_percent')
