"""add departure-prep fields collected after seat reservation is approved

Revision ID: 012
Revises: 011

승인(자리 완료) 후 제출자가 출국 준비를 위해 제출하는 정보 컬럼을 더한다.
성함/출국일/목적지/주소와 여권 사본·자리 확약 캡쳐(스토리지 키), 제출 시각.
모두 nullable이라 기존 데이터에 영향이 없다. reversible.
"""

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision = "012"
down_revision = "011"
branch_labels = None
depends_on = None


DEP_COLUMNS = [
    "dep_name",
    "dep_departure_date",
    "dep_destination",
    "dep_address",
    "passport_object_key",
    "seat_confirm_object_key",
]


def upgrade() -> None:
    with op.batch_alter_table("guest_ticket_submissions") as batch_op:
        for col in DEP_COLUMNS:
            batch_op.add_column(sa.Column(col, sa.String(), nullable=True))
        batch_op.add_column(
            sa.Column(
                "departure_submitted_at", sa.DateTime(timezone=True), nullable=True
            )
        )


def downgrade() -> None:
    with op.batch_alter_table("guest_ticket_submissions") as batch_op:
        batch_op.drop_column("departure_submitted_at")
        for col in reversed(DEP_COLUMNS):
            batch_op.drop_column(col)
