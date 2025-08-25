"""Create categories table and update contents

Revision ID: 20250825_categories
Revises: 20250825_add_category
Create Date: 2025-08-25 14:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20250825_categories'
down_revision = '20250825_add_category'
branch_labels = None
depends_on = None


def upgrade():
    # Create categories table
    op.create_table('categories',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )
    op.create_index(op.f('ix_categories_id'), 'categories', ['id'], unique=False)
    
    # Insert default categories
    op.execute("""
        INSERT INTO categories (name, description) VALUES 
        ('未分類', 'カテゴリが設定されていない記事'),
        ('ニュース', 'ニュース関連の記事'),
        ('技術', '技術関連の記事'),
        ('ビジネス', 'ビジネス関連の記事'),
        ('ライフスタイル', 'ライフスタイル関連の記事'),
        ('エンターテイメント', 'エンターテイメント関連の記事')
    """)
    
    # Add category_id column to contents table
    op.add_column('contents', sa.Column('category_id', sa.Integer(), nullable=True))
    op.create_foreign_key(None, 'contents', 'categories', ['category_id'], ['id'])
    
    # Migrate existing category data
    op.execute("""
        UPDATE contents 
        SET category_id = (
            SELECT id FROM categories WHERE name = contents.category
        )
        WHERE category IS NOT NULL
    """)
    
    # Set default category for null values
    op.execute("""
        UPDATE contents 
        SET category_id = (
            SELECT id FROM categories WHERE name = '未分類'
        )
        WHERE category_id IS NULL
    """)
    
    # Drop old category column
    op.drop_column('contents', 'category')


def downgrade():
    # Add back category column
    op.add_column('contents', sa.Column('category', sa.String(length=100), nullable=True, server_default='未分類'))
    
    # Migrate data back
    op.execute("""
        UPDATE contents 
        SET category = (
            SELECT name FROM categories WHERE id = contents.category_id
        )
        WHERE category_id IS NOT NULL
    """)
    
    # Drop foreign key and category_id
    op.drop_constraint(None, 'contents', type_='foreignkey')
    op.drop_column('contents', 'category_id')
    
    # Drop categories table
    op.drop_index(op.f('ix_categories_id'), table_name='categories')
    op.drop_table('categories')