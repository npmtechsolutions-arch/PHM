"""add_entity_assignment_to_users

Revision ID: f5g6h7i8j9k0
Revises: e4f5g6h7i8j9
Create Date: 2026-01-10 21:22:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f5g6h7i8j9k0'
down_revision: Union[str, None] = 'e4f5g6h7i8j9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add entity assignment columns to users table for RBAC
    op.add_column('users', sa.Column('assigned_warehouse_id', sa.String(36), nullable=True))
    op.add_column('users', sa.Column('assigned_shop_id', sa.String(36), nullable=True))
    
    # Add foreign key constraints
    op.create_foreign_key(
        'fk_users_assigned_warehouse',
        'users', 'warehouses',
        ['assigned_warehouse_id'], ['id']
    )
    op.create_foreign_key(
        'fk_users_assigned_shop',
        'users', 'medical_shops',
        ['assigned_shop_id'], ['id']
    )


def downgrade() -> None:
    op.drop_constraint('fk_users_assigned_shop', 'users', type_='foreignkey')
    op.drop_constraint('fk_users_assigned_warehouse', 'users', type_='foreignkey')
    op.drop_column('users', 'assigned_shop_id')
    op.drop_column('users', 'assigned_warehouse_id')
