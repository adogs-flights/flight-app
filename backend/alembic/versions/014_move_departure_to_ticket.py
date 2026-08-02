"""move departure-prep fields from guest submission to ticket

Revision ID: 014
Revises: 013

출국 준비 추가정보를 티켓에 통합한다. 봉사자 제출 티켓과 단체 등록 티켓 모두
같은 자리(tickets)에 모으기 위해 컬럼을 티켓으로 옮긴다.
기존 제출에 담겨 있던 값은 연결된 티켓으로 이관한다.
"""

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision = "014"
down_revision = "013"
branch_labels = None
depends_on = None

COLS = ["dep_address", "passport_object_key", "seat_confirm_object_key"]


def upgrade() -> None:
    with op.batch_alter_table("tickets") as batch_op:
        for col in COLS:
            batch_op.add_column(sa.Column(col, sa.String(), nullable=True))
        batch_op.add_column(
            sa.Column("departure_submitted_at", sa.DateTime(timezone=True), nullable=True)
        )

    # 기존 제출의 출국 정보를 연결된 티켓으로 이관.
    # UPDATE ... FROM은 PostgreSQL 전용이라, SQLite에서도 되는 상관 서브쿼리로 옮긴다.
    def _sub(col: str) -> str:
        return (
            f"(SELECT s.{col} FROM guest_ticket_submissions s "
            "WHERE s.created_ticket_id = tickets.id "
            "AND s.departure_submitted_at IS NOT NULL LIMIT 1)"
        )

    op.execute(
        "UPDATE tickets SET "
        f"dep_address = {_sub('dep_address')}, "
        f"passport_object_key = {_sub('passport_object_key')}, "
        f"seat_confirm_object_key = {_sub('seat_confirm_object_key')}, "
        f"departure_submitted_at = {_sub('departure_submitted_at')} "
        "WHERE id IN (SELECT created_ticket_id FROM guest_ticket_submissions "
        "WHERE departure_submitted_at IS NOT NULL AND created_ticket_id IS NOT NULL)"
    )

    with op.batch_alter_table("guest_ticket_submissions") as batch_op:
        batch_op.drop_column("departure_submitted_at")
        for col in COLS:
            batch_op.drop_column(col)


def downgrade() -> None:
    with op.batch_alter_table("guest_ticket_submissions") as batch_op:
        for col in COLS:
            batch_op.add_column(sa.Column(col, sa.String(), nullable=True))
        batch_op.add_column(
            sa.Column("departure_submitted_at", sa.DateTime(timezone=True), nullable=True)
        )
    with op.batch_alter_table("tickets") as batch_op:
        batch_op.drop_column("departure_submitted_at")
        for col in COLS:
            batch_op.drop_column(col)
