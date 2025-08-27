"""Change user role from USER to MEMBER

Revision ID: 8ba0eba35c11
Revises: 8cc377870bc4
Create Date: 2025-08-27 10:29:37.811426+00:00

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '8ba0eba35c11'
down_revision = '8cc377870bc4'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # MySQLでENUMの変更とデータ更新
    op.execute("ALTER TABLE users MODIFY COLUMN role ENUM('admin', 'member') NOT NULL DEFAULT 'member'")
    op.execute("UPDATE users SET role = 'member' WHERE role = 'user'")


def downgrade() -> None:
    # ロールバック処理
    op.execute("UPDATE users SET role = 'user' WHERE role = 'member'")
    op.execute("ALTER TABLE users MODIFY COLUMN role ENUM('admin', 'user') NOT NULL DEFAULT 'user'")