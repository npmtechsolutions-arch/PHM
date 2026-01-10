"""Add rack_number and rack_name columns to medicines

Revision ID: d2e3f4g5h6i7
Revises: c1a2b3d4e5f6
Create Date: 2026-01-09 22:40:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd2e3f4g5h6i7'
down_revision: Union[str, None] = 'c1a2b3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add rack_number column to medicines table
    op.add_column('medicines', sa.Column('rack_number', sa.String(50), nullable=True))
    # Add rack_name column to medicines table
    op.add_column('medicines', sa.Column('rack_name', sa.String(100), nullable=True))


def downgrade() -> None:
    # Remove rack_name column from medicines table
    op.drop_column('medicines', 'rack_name')
    # Remove rack_number column from medicines table
    op.drop_column('medicines', 'rack_number')
