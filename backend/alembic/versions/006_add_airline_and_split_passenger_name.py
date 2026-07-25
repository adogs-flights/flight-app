"""Add airline to guest submissions and split passenger name into last/first

Revision ID: 006
Revises: 005
Create Date: 2026-07-25 02:00:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "006"
down_revision: str | None = "005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "guest_ticket_submissions", sa.Column("airline", sa.String(), nullable=True)
    )
    op.add_column(
        "guest_ticket_submissions",
        sa.Column("passenger_last_name_en", sa.String(), nullable=True),
    )
    op.add_column(
        "guest_ticket_submissions",
        sa.Column("passenger_first_name_en", sa.String(), nullable=True),
    )

    # 기존 passenger_name_en 값을 최대한 성/이름으로 나눠서 이전
    # (공백 기준 첫 단어를 성, 나머지를 이름으로 간주 - 완벽하진 않지만 데이터 유실 방지)
    connection = op.get_bind()
    submissions_table = sa.table(
        "guest_ticket_submissions",
        sa.column("id", sa.String()),
        sa.column("passenger_name_en", sa.String()),
        sa.column("passenger_last_name_en", sa.String()),
        sa.column("passenger_first_name_en", sa.String()),
    )
    rows = connection.execute(
        sa.select(submissions_table.c.id, submissions_table.c.passenger_name_en).where(
            submissions_table.c.passenger_name_en.isnot(None)
        )
    ).fetchall()
    for row_id, full_name in rows:
        name = (full_name or "").strip()
        if not name:
            continue
        parts = name.split(None, 1)
        last_name = parts[0]
        first_name = parts[1] if len(parts) > 1 else None
        connection.execute(
            submissions_table.update()
            .where(submissions_table.c.id == row_id)
            .values(passenger_last_name_en=last_name, passenger_first_name_en=first_name)
        )

    op.drop_column("guest_ticket_submissions", "passenger_name_en")


def downgrade() -> None:
    op.add_column(
        "guest_ticket_submissions", sa.Column("passenger_name_en", sa.String(), nullable=True)
    )

    connection = op.get_bind()
    submissions_table = sa.table(
        "guest_ticket_submissions",
        sa.column("id", sa.String()),
        sa.column("passenger_name_en", sa.String()),
        sa.column("passenger_last_name_en", sa.String()),
        sa.column("passenger_first_name_en", sa.String()),
    )
    rows = connection.execute(
        sa.select(
            submissions_table.c.id,
            submissions_table.c.passenger_last_name_en,
            submissions_table.c.passenger_first_name_en,
        )
    ).fetchall()
    for row_id, last_name, first_name in rows:
        if not last_name and not first_name:
            continue
        full_name = " ".join(p for p in [last_name, first_name] if p)
        connection.execute(
            submissions_table.update()
            .where(submissions_table.c.id == row_id)
            .values(passenger_name_en=full_name)
        )

    op.drop_column("guest_ticket_submissions", "passenger_first_name_en")
    op.drop_column("guest_ticket_submissions", "passenger_last_name_en")
    op.drop_column("guest_ticket_submissions", "airline")
