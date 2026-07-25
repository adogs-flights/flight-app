"""Add kakao_id to guest ticket submissions

Revision ID: 007
Revises: 006
Create Date: 2026-07-25 07:00:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "007"
down_revision: str | None = "006"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "guest_ticket_submissions", sa.Column("kakao_id", sa.String(), nullable=True)
    )


def downgrade() -> None:
    op.drop_column("guest_ticket_submissions", "kakao_id")
