"""Initial database setup

Revision ID: 001
Revises: 
Create Date: 2025-08-25 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

# revision identifiers, used by Alembic.
revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create users table
    op.create_table('users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('username', sa.String(length=100), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('password_hash', sa.String(length=255), nullable=False),
        sa.Column('role', sa.Enum('ADMIN', 'USER', name='userrole'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email', 'deleted_at', name='uq_email_deleted_at')
    )
    op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)
    op.create_index('ix_users_username', 'users', ['username'], unique=False)
    
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
    
    # Create contents table
    op.create_table('contents',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_contents_id'), 'contents', ['id'], unique=False)
    
    # Create files table
    op.create_table('files',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('filename', sa.String(length=255), nullable=False),
        sa.Column('original_filename', sa.String(length=255), nullable=False),
        sa.Column('file_size', sa.Integer(), nullable=False),
        sa.Column('mime_type', sa.String(length=100), nullable=False),
        sa.Column('uploaded_by', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['uploaded_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_files_id'), 'files', ['id'], unique=False)
    
    # Create content_categories many-to-many table
    op.create_table('content_categories',
        sa.Column('content_id', sa.Integer(), nullable=False),
        sa.Column('category_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['category_id'], ['categories.id'], ),
        sa.ForeignKeyConstraint(['content_id'], ['contents.id'], ),
        sa.PrimaryKeyConstraint('content_id', 'category_id')
    )
    
    # Insert default categories
    op.execute("""
        INSERT INTO categories (name, description) VALUES 
        ('ニュース', '最新のニュースや時事情報'),
        ('技術', 'プログラミングやIT技術に関する記事'),
        ('ビジネス', 'ビジネスや経済に関する話題'),
        ('ライフスタイル', '日常生活や趣味に関する記事'),
        ('エンターテイメント', '映画、音楽、ゲームなどの娯楽情報'),
        ('健康', '健康や医療に関する情報'),
        ('教育', '学習や教育に関する記事'),
        ('スポーツ', 'スポーツニュースや情報'),
        ('旅行', '旅行先や観光に関する情報'),
        ('グルメ', '料理やレストランに関する記事')
    """)


def downgrade() -> None:
    op.drop_table('content_categories')
    op.drop_index(op.f('ix_files_id'), table_name='files')
    op.drop_table('files')
    op.drop_index(op.f('ix_contents_id'), table_name='contents')
    op.drop_table('contents')
    op.drop_index(op.f('ix_categories_id'), table_name='categories')
    op.drop_table('categories')
    op.drop_index('ix_users_username', table_name='users')
    op.drop_index(op.f('ix_users_id'), table_name='users')
    op.drop_table('users')