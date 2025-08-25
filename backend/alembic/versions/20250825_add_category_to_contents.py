"""Add category column to contents

Revision ID: 20250825_add_category
Revises: bd7e7b68907a
Create Date: 2025-08-25 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20250825_add_category'
down_revision = 'bd7e7b68907a'
branch_labels = None
depends_on = None


def upgrade():
    # Add category column to contents table
    op.add_column('contents', sa.Column('category', sa.String(length=100), nullable=True, server_default='未分類'))


def downgrade():
    # Remove category column from contents table
    op.drop_column('contents', 'category')