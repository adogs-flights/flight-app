"""Initial create tables

Revision ID: 000
Revises: None
Create Date: 2026-03-30 10:00

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "000"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1. users 테이블 생성
    op.create_table(
        "users",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("hashed_password", sa.String(), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now()
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    # 2. admin_users 테이블 생성
    op.create_table(
        "admin_users",
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("approved", sa.Boolean(), nullable=True, server_default="0"),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now()
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("user_id"),
    )

    # 3. refresh_tokens 테이블 생성
    op.create_table(
        "refresh_tokens",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("token", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now()
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_refresh_tokens_token", "refresh_tokens", ["token"], unique=True)

    # 4. tickets 테이블 생성 (001번 파일에서 수정하기 전의 원형)
    op.create_table(
        "tickets",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column(
            "country", sa.Text(), nullable=False
        ),  # 001에서 arrival_airport로 변경됨
        sa.Column("departure_date", sa.Date(), nullable=False),
        sa.Column("return_date", sa.Date(), nullable=False),
        sa.Column("flight_info", sa.Text(), nullable=True, server_default=""),
        sa.Column("airline", sa.Text(), nullable=True, server_default=""),
        sa.Column("capacity", sa.Integer(), nullable=True, server_default="1"),
        sa.Column("status", sa.String(), nullable=False, server_default="owned"),
        sa.Column("manager_name", sa.Text(), nullable=False),
        sa.Column("contact", sa.Text(), nullable=False),
        sa.Column("memo", sa.Text(), nullable=True),
        sa.Column("created_by_id", sa.String(), nullable=True),
        sa.Column("owner_id", sa.String(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now()
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()
        ),
        sa.ForeignKeyConstraint(["created_by_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_tickets_country", "tickets", ["country"], unique=False)

    # 5. ticket_applications 테이블 생성
    op.create_table(
        "ticket_applications",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("ticket_id", sa.String(), nullable=False),
        sa.Column("applicant_id", sa.String(), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("contact", sa.Text(), nullable=False),
        sa.Column("status", sa.String(), nullable=False, server_default="pending"),
        sa.Column(
            "applied_at", sa.DateTime(timezone=True), server_default=sa.func.now()
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()
        ),
        sa.ForeignKeyConstraint(["applicant_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["ticket_id"], ["tickets.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("ticket_id", "applicant_id", name="uq_ticket_applicant"),
    )

    # 6. need_posts 테이블 생성
    op.create_table(
        "need_posts",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("airport_code", sa.String(), nullable=False),
        sa.Column("desired_date", sa.Date(), nullable=True),
        sa.Column("flight_route", sa.Text(), nullable=True, server_default=""),
        sa.Column("seats_needed", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("contact", sa.Text(), nullable=False),
        sa.Column("detail", sa.Text(), nullable=True),
        sa.Column("is_urgent", sa.Boolean(), nullable=False, server_default="0"),
        sa.Column("is_resolved", sa.Boolean(), nullable=False, server_default="0"),
        sa.Column("author_id", sa.String(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now()
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()
        ),
        sa.ForeignKeyConstraint(["author_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("need_posts")
    op.drop_table("ticket_applications")
    op.drop_table("tickets")
    op.drop_table("refresh_tokens")
    op.drop_table("admin_users")
    op.drop_table("users")
