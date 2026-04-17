"""rename return_date to arrival_date

Revision ID: 058826f658d0
Revises: 002
Create Date: 2026-04-17 11:24:00.000000

"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "058826f658d0"
down_revision: str | None = "002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.alter_column("tickets", "return_date", new_column_name="arrival_date")


def downgrade() -> None:
    op.alter_column("tickets", "arrival_date", new_column_name="return_date")
