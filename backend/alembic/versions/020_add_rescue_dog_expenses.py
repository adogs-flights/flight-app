"""add rescue_dog_expenses table

Revision ID: 020
Revises: 019

시트의 "비용/정산" 탭. 임보자가 먼저 부담한 병원비 등을 단체가 돌려주는
흐름이라 부담자(payer_name)와 정산 여부(is_settled)를 함께 둔다.
"""

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision = "020"
down_revision = "019"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "rescue_dog_expenses",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("dog_id", sa.String(), nullable=False),
        sa.Column("spent_on", sa.Date(), nullable=True),
        sa.Column("payer_name", sa.String(), nullable=True),
        sa.Column("category", sa.String(), nullable=True),
        sa.Column("amount", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "is_settled", sa.Boolean(), nullable=False, server_default=sa.false()
        ),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("created_by_id", sa.String(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now()
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()
        ),
        sa.CheckConstraint("amount >= 0", name="ck_rescue_dog_expenses_amount"),
        sa.ForeignKeyConstraint(["dog_id"], ["rescue_dogs.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["created_by_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_rescue_dog_expenses_dog_id"), "rescue_dog_expenses", ["dog_id"]
    )
    op.create_index(
        op.f("ix_rescue_dog_expenses_spent_on"), "rescue_dog_expenses", ["spent_on"]
    )
    op.create_index(
        op.f("ix_rescue_dog_expenses_is_settled"), "rescue_dog_expenses", ["is_settled"]
    )
    op.create_index(
        op.f("ix_rescue_dog_expenses_created_by_id"),
        "rescue_dog_expenses",
        ["created_by_id"],
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_rescue_dog_expenses_created_by_id"), table_name="rescue_dog_expenses"
    )
    op.drop_index(
        op.f("ix_rescue_dog_expenses_is_settled"), table_name="rescue_dog_expenses"
    )
    op.drop_index(
        op.f("ix_rescue_dog_expenses_spent_on"), table_name="rescue_dog_expenses"
    )
    op.drop_index(
        op.f("ix_rescue_dog_expenses_dog_id"), table_name="rescue_dog_expenses"
    )
    op.drop_table("rescue_dog_expenses")
