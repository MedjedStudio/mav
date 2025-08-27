"""Add avatar profile timezone to users

Revision ID: 8157cb7fdb60
Revises: 0d723528ba3a
Create Date: 2025-08-27 11:21:17.849095+00:00

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '8157cb7fdb60'
down_revision = '0d723528ba3a'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ユーザーテーブルに新しいカラムを追加
    op.add_column('users', sa.Column('avatar_url', sa.String(500), nullable=True))
    op.add_column('users', sa.Column('profile', sa.Text(), nullable=True))
    op.add_column('users', sa.Column('timezone', sa.Integer(), nullable=False, server_default='1'))


def downgrade() -> None:
    # カラムを削除
    op.drop_column('users', 'timezone')
    op.drop_column('users', 'profile')
    op.drop_column('users', 'avatar_url')