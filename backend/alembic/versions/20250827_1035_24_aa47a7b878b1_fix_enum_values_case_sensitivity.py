"""Fix enum values case sensitivity

Revision ID: aa47a7b878b1
Revises: 8ba0eba35c11
Create Date: 2025-08-27 10:35:24.564332+00:00

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'aa47a7b878b1'
down_revision = '8ba0eba35c11'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # roleカラムを文字列からINTに変更し、値をマッピング
    # admin -> 1, member/user -> 2
    op.execute("UPDATE users SET role = CASE WHEN role = 'admin' THEN 1 ELSE 2 END")
    op.execute("ALTER TABLE users MODIFY COLUMN role INT NOT NULL DEFAULT 2")


def downgrade() -> None:
    # ロールバック処理
    op.execute("ALTER TABLE users MODIFY COLUMN role ENUM('admin', 'member') NOT NULL DEFAULT 'member'")
    op.execute("UPDATE users SET role = CASE WHEN role = 1 THEN 'admin' ELSE 'member' END")