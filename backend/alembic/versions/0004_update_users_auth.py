"""update users table for auth system (removed)

Revision ID: 0004_update_users_auth
Revises: 0003_add_chat_sessions
Create Date: 2026-05-09
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0004_update_users_auth"
down_revision: str | None = "0003_add_chat_sessions"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
