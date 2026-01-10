"""add_racks_table

Revision ID: e4f5g6h7i8j9
Revises: d2e3f4g5h6i7
Create Date: 2026-01-10 20:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision: str = 'e4f5g6h7i8j9'
down_revision: Union[str, None] = 'd2e3f4g5h6i7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def table_exists(table_name):
    """Check if a table already exists"""
    bind = op.get_bind()
    inspector = inspect(bind)
    return table_name in inspector.get_table_names()


def upgrade() -> None:
    # Create racks table if it doesn't exist
    if not table_exists('racks'):
        op.create_table('racks',
            sa.Column('id', sa.String(length=36), nullable=False),
            sa.Column('rack_name', sa.String(length=100), nullable=False),
            sa.Column('rack_number', sa.String(length=50), nullable=False),
            sa.Column('description', sa.Text(), nullable=True),
            sa.Column('warehouse_id', sa.String(length=36), nullable=True),
            sa.Column('shop_id', sa.String(length=36), nullable=True),
            sa.Column('floor', sa.String(length=20), nullable=True),
            sa.Column('section', sa.String(length=50), nullable=True),
            sa.Column('capacity', sa.Integer(), nullable=True),
            sa.Column('is_active', sa.Boolean(), nullable=True, default=True),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.Column('updated_at', sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(['warehouse_id'], ['warehouses.id'], ),
            sa.ForeignKeyConstraint(['shop_id'], ['medical_shops.id'], ),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('rack_number')
        )
        op.create_index('idx_rack_number', 'racks', ['rack_number'], unique=False)
    
    # Create audit_logs table if it doesn't exist
    if not table_exists('audit_logs'):
        op.create_table('audit_logs',
            sa.Column('id', sa.String(length=36), nullable=False),
            sa.Column('user_id', sa.String(length=36), nullable=True),
            sa.Column('action', sa.String(length=50), nullable=False),
            sa.Column('entity_type', sa.String(length=50), nullable=False),
            sa.Column('entity_id', sa.String(length=36), nullable=True),
            sa.Column('old_values', sa.Text(), nullable=True),
            sa.Column('new_values', sa.Text(), nullable=True),
            sa.Column('ip_address', sa.String(length=45), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index('idx_audit_entity', 'audit_logs', ['entity_type', 'entity_id'], unique=False)
    
    # Create login_audit_logs table if it doesn't exist
    if not table_exists('login_audit_logs'):
        op.create_table('login_audit_logs',
            sa.Column('id', sa.String(length=36), nullable=False),
            sa.Column('user_id', sa.String(length=36), nullable=True),
            sa.Column('email', sa.String(length=255), nullable=False),
            sa.Column('action', sa.String(length=50), nullable=False),
            sa.Column('ip_address', sa.String(length=45), nullable=True),
            sa.Column('user_agent', sa.String(length=500), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
            sa.PrimaryKeyConstraint('id')
        )


def downgrade() -> None:
    if table_exists('login_audit_logs'):
        op.drop_table('login_audit_logs')
    if table_exists('audit_logs'):
        op.drop_index('idx_audit_entity', table_name='audit_logs')
        op.drop_table('audit_logs')
    if table_exists('racks'):
        op.drop_index('idx_rack_number', table_name='racks')
        op.drop_table('racks')
