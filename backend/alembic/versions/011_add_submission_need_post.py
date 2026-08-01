"""link guest submissions to the need post they respond to

Revision ID: 011
Revises: 010

'구해요' 게시글에서 바로 티켓을 제출할 수 있게, 제출이 어느 게시글에 대한
응답인지 기록하는 FK를 더한다. nullable이라 기존 제출에 영향이 없다. reversible.
"""

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision = "011"
down_revision = "010"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("guest_ticket_submissions") as batch_op:
        batch_op.add_column(sa.Column("need_post_id", sa.String(), nullable=True))
        batch_op.create_foreign_key(
            "fk_guest_submissions_need_post_id",
            "need_posts",
            ["need_post_id"],
            ["id"],
            ondelete="SET NULL",
        )
    op.create_index(
        "ix_guest_ticket_submissions_need_post_id",
        "guest_ticket_submissions",
        ["need_post_id"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_guest_ticket_submissions_need_post_id", "guest_ticket_submissions"
    )
    with op.batch_alter_table("guest_ticket_submissions") as batch_op:
        batch_op.drop_constraint(
            "fk_guest_submissions_need_post_id", type_="foreignkey"
        )
        batch_op.drop_column("need_post_id")
