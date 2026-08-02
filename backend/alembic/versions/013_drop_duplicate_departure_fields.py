"""drop departure fields that duplicate the approved ticket

Revision ID: 013
Revises: 012

성함/출국일/목적지는 승인 시 생성되는 티켓의 manager_name/departure_date/
arrival_airport에 이미 들어간다. 출국 준비 폼에서 중복으로 받던 컬럼을 제거한다.
주소·여권·자리확약·제출시각은 유지한다. reversible(되돌리면 nullable로 재생성).
"""

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision = "013"
down_revision = "012"
branch_labels = None
depends_on = None


DROPPED = ["dep_name", "dep_departure_date", "dep_destination"]


def upgrade() -> None:
    with op.batch_alter_table("guest_ticket_submissions") as batch_op:
        for col in DROPPED:
            batch_op.drop_column(col)


def downgrade() -> None:
    with op.batch_alter_table("guest_ticket_submissions") as batch_op:
        for col in DROPPED:
            batch_op.add_column(sa.Column(col, sa.String(), nullable=True))
