"""add chat sessions and messages

Revision ID: 0003_add_chat_sessions
Revises: 0002_add_visitor_events
Create Date: 2026-05-09
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0003_add_chat_sessions"
down_revision: str | None = "0002_add_visitor_events"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
