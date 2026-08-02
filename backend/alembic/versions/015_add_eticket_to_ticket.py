"""add eticket_object_key to ticket

Revision ID: 015
Revises: 014

봉사자 제출 티켓을 승인해 만든 일정에서도 e티켓 이미지를 볼 수 있도록,
tickets에 eticket_object_key 컬럼을 추가한다. 기존에 승인된 제출의 e티켓 키는
연결된 티켓으로 이관한다.
"""

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision = "015"
down_revision = "014"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("tickets") as batch_op:
        batch_op.add_column(sa.Column("eticket_object_key", sa.String(), nullable=True))

    # 이미 승인돼 티켓이 만들어진 제출의 e티켓 키를 연결된 티켓으로 이관한다.
    # UPDATE ... FROM은 PostgreSQL 전용이라 SQLite에서도 되는 상관 서브쿼리로 옮긴다.
    op.execute(
        "UPDATE tickets SET eticket_object_key = ("
        "SELECT s.eticket_object_key FROM guest_ticket_submissions s "
        "WHERE s.created_ticket_id = tickets.id "
        "AND s.eticket_object_key IS NOT NULL LIMIT 1) "
        "WHERE id IN (SELECT created_ticket_id FROM guest_ticket_submissions "
        "WHERE eticket_object_key IS NOT NULL AND created_ticket_id IS NOT NULL)"
    )


def downgrade() -> None:
    with op.batch_alter_table("tickets") as batch_op:
        batch_op.drop_column("eticket_object_key")
