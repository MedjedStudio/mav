"""Create content_categories table for many-to-many relationship

Revision ID: 20250825_content_categories
Revises: 20250825_categories
Create Date: 2025-08-25 16:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20250825_content_categories'
down_revision = '20250825_categories'
branch_labels = None
depends_on = None


def upgrade():
    # Check if content_categories table already exists
    from sqlalchemy import inspect
    from alembic import context
    
    conn = context.get_bind()
    inspector = inspect(conn)
    tables = inspector.get_table_names()
    
    if 'content_categories' not in tables:
        # Create content_categories many-to-many table
        op.create_table('content_categories',
            sa.Column('content_id', sa.Integer(), nullable=False),
            sa.Column('category_id', sa.Integer(), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
            sa.ForeignKeyConstraint(['category_id'], ['categories.id'], ),
            sa.ForeignKeyConstraint(['content_id'], ['contents.id'], ),
            sa.PrimaryKeyConstraint('content_id', 'category_id')
        )
    
    # Check if category_id column exists in contents table
    contents_columns = inspector.get_columns('contents')
    has_category_id = any(col['name'] == 'category_id' for col in contents_columns)
    
    if has_category_id:
        # Migrate existing category relationships
        op.execute("""
            INSERT IGNORE INTO content_categories (content_id, category_id)
            SELECT id, category_id FROM contents 
            WHERE category_id IS NOT NULL
        """)
        
        # Drop the old category_id column from contents (already done manually)
        print("Note: category_id column and foreign key constraint should be removed manually")


def downgrade():
    # Add back category_id column to contents
    op.add_column('contents', sa.Column('category_id', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_contents_category_id', 'contents', 'categories', ['category_id'], ['id'])
    
    # Migrate data back (take the first category for each content)
    op.execute("""
        UPDATE contents 
        SET category_id = (
            SELECT category_id FROM content_categories 
            WHERE content_categories.content_id = contents.id 
            LIMIT 1
        )
    """)
    
    # Drop the content_categories table
    op.drop_table('content_categories')