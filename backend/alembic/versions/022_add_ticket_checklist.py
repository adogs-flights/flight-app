"""add ticket_checklist_items table and tickets.checklist_initialized_at

Revision ID: 022
Revises: 021

티켓별 출국 준비 체크리스트. 기한 없이 완료 여부만 다루므로 항목은
라벨·메모·완료 여부와 완료 시각만 갖는다. template_key는 기본 항목에서
생성된 항목을 식별해 "기본 항목 복원" 시 중복 생성을 막는다.

tickets.checklist_initialized_at은 기본 항목을 깔아준 시각이다. 항목을 전부
지운 티켓에 조회만으로 기본 항목이 되살아나지 않게 하려고 둔다.
"""

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision = "022"
down_revision = "021"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "ticket_checklist_items",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("ticket_id", sa.String(), nullable=False),
        sa.Column("template_key", sa.String(), nullable=True),
        sa.Column("label", sa.Text(), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column(
            "is_done", sa.Boolean(), nullable=False, server_default=sa.false()
        ),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_by_id", sa.String(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now()
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()
        ),
        sa.ForeignKeyConstraint(["ticket_id"], ["tickets.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["created_by_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_ticket_checklist_items_ticket_id"),
        "ticket_checklist_items",
        ["ticket_id"],
    )
    op.create_index(
        op.f("ix_ticket_checklist_items_is_done"),
        "ticket_checklist_items",
        ["is_done"],
    )
    op.create_index(
        op.f("ix_ticket_checklist_items_created_by_id"),
        "ticket_checklist_items",
        ["created_by_id"],
    )

    with op.batch_alter_table("tickets") as batch_op:
        batch_op.add_column(
            sa.Column(
                "checklist_initialized_at",
                sa.DateTime(timezone=True),
                nullable=True,
            )
        )


def downgrade() -> None:
    with op.batch_alter_table("tickets") as batch_op:
        batch_op.drop_column("checklist_initialized_at")

    op.drop_index(
        op.f("ix_ticket_checklist_items_created_by_id"),
        table_name="ticket_checklist_items",
    )
    op.drop_index(
        op.f("ix_ticket_checklist_items_is_done"),
        table_name="ticket_checklist_items",
    )
    op.drop_index(
        op.f("ix_ticket_checklist_items_ticket_id"),
        table_name="ticket_checklist_items",
    )
    op.drop_table("ticket_checklist_items")
