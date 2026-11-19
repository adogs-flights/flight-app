"""add rescue_dog_records table

Revision ID: 019
Revises: 018

구조견의 접종·검진·모니터링 이력. 셋 다 "예정일 → 완료일 + 내용"이라는
같은 모양이라 kind로 구분해 한 테이블에 담는다.
"""

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision = "019"
down_revision = "018"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "rescue_dog_records",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("dog_id", sa.String(), nullable=False),
        sa.Column("kind", sa.String(), nullable=False),
        sa.Column("title", sa.String(), nullable=True),
        sa.Column("scheduled_on", sa.Date(), nullable=True),
        sa.Column("completed_on", sa.Date(), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("created_by_id", sa.String(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now()
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()
        ),
        sa.CheckConstraint(
            "kind IN ('vaccination', 'checkup', 'monitoring')",
            name="ck_rescue_dog_records_kind",
        ),
        sa.ForeignKeyConstraint(["dog_id"], ["rescue_dogs.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["created_by_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_rescue_dog_records_dog_id"), "rescue_dog_records", ["dog_id"]
    )
    op.create_index(op.f("ix_rescue_dog_records_kind"), "rescue_dog_records", ["kind"])
    op.create_index(
        op.f("ix_rescue_dog_records_scheduled_on"),
        "rescue_dog_records",
        ["scheduled_on"],
    )
    op.create_index(
        op.f("ix_rescue_dog_records_created_by_id"),
        "rescue_dog_records",
        ["created_by_id"],
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_rescue_dog_records_created_by_id"), table_name="rescue_dog_records"
    )
    op.drop_index(
        op.f("ix_rescue_dog_records_scheduled_on"), table_name="rescue_dog_records"
    )
    op.drop_index(op.f("ix_rescue_dog_records_kind"), table_name="rescue_dog_records")
    op.drop_index(op.f("ix_rescue_dog_records_dog_id"), table_name="rescue_dog_records")
    op.drop_table("rescue_dog_records")
