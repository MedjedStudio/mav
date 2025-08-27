"""Fix existing admin roles

Revision ID: 0d723528ba3a
Revises: aa47a7b878b1
Create Date: 2025-08-27 10:41:06.912117+00:00

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0d723528ba3a'
down_revision = 'aa47a7b878b1'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # role=2をrole=1に変更（既存のadminユーザーを修正）
    op.execute("UPDATE users SET role = 1 WHERE role = 2")


def downgrade() -> None:
    pass