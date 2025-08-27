"""add_author_to_content

Revision ID: 1ea6c9290483
Revises: 8157cb7fdb60
Create Date: 2025-08-27 12:41:25.444700+00:00

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '1ea6c9290483'
down_revision = '8157cb7fdb60'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add author_id column to contents table
    op.add_column('contents', sa.Column('author_id', sa.Integer(), nullable=True))
    
    # Set default author_id to 1 (assuming admin user exists with id=1)
    op.execute("UPDATE contents SET author_id = 1 WHERE author_id IS NULL")
    
    # Make author_id not nullable
    op.alter_column('contents', 'author_id', existing_type=sa.Integer(), nullable=False)
    
    # Add foreign key constraint
    op.create_foreign_key('fk_contents_author_id', 'contents', 'users', ['author_id'], ['id'])


def downgrade() -> None:
    # Remove foreign key constraint
    op.drop_constraint('fk_contents_author_id', 'contents', type_='foreignkey')
    
    # Remove author_id column
    op.drop_column('contents', 'author_id')