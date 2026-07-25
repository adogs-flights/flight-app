"""Add organizations and guest_ticket_submissions tables

Revision ID: 005
Revises: 004
Create Date: 2026-07-25 00:00:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "005"
down_revision: str | None = "004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1. organizations 테이블 생성
    op.create_table(
        "organizations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("slug", sa.String(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=True, server_default="1"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_organizations_id", "organizations", ["id"], unique=False)
    op.create_index("ix_organizations_name", "organizations", ["name"], unique=True)
    op.create_index("ix_organizations_slug", "organizations", ["slug"], unique=True)

    # 1-1. 기존 회원(users.organization)에 입력되어 있던 단체명들을
    #      organizations 마스터 테이블로 백필 (중복/공백 제거)
    connection = op.get_bind()
    users_table = sa.table("users", sa.column("organization", sa.String()))
    organizations_table = sa.table(
        "organizations",
        sa.column("name", sa.String()),
        sa.column("slug", sa.String()),
        sa.column("is_active", sa.Boolean()),
    )

    existing_orgs = connection.execute(
        sa.select(users_table.c.organization).distinct()
    ).fetchall()

    seen: set[str] = set()
    names_to_insert = []
    for row in existing_orgs:
        name = (row[0] or "").strip()
        if not name or name in seen:
            continue
        seen.add(name)
        names_to_insert.append(name)

    if names_to_insert:
        op.bulk_insert(
            organizations_table,
            [
                {"name": name, "slug": None, "is_active": True}
                for name in names_to_insert
            ],
        )

    # 2. guest_ticket_submissions 테이블 생성
    op.create_table(
        "guest_ticket_submissions",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("phone", sa.String(), nullable=False),
        sa.Column("verification_method", sa.String(), nullable=False),
        sa.Column("eticket_object_key", sa.String(), nullable=True),
        sa.Column("eticket_drive_url", sa.String(), nullable=True),
        sa.Column("reservation_number", sa.String(), nullable=True),
        sa.Column("passenger_name_en", sa.String(), nullable=True),
        sa.Column("organization_id", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(), nullable=False, server_default="pending"),
        sa.Column("admin_note", sa.Text(), nullable=True),
        sa.Column("created_ticket_id", sa.String(), nullable=True),
        sa.Column(
            "submitted_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(
            ["organization_id"], ["organizations.id"], ondelete="SET NULL"
        ),
        sa.ForeignKeyConstraint(
            ["created_ticket_id"], ["tickets.id"], ondelete="SET NULL"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_guest_ticket_submissions_verification_method",
        "guest_ticket_submissions",
        ["verification_method"],
        unique=False,
    )
    op.create_index(
        "ix_guest_ticket_submissions_organization_id",
        "guest_ticket_submissions",
        ["organization_id"],
        unique=False,
    )
    op.create_index(
        "ix_guest_ticket_submissions_status",
        "guest_ticket_submissions",
        ["status"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_guest_ticket_submissions_status", table_name="guest_ticket_submissions"
    )
    op.drop_index(
        "ix_guest_ticket_submissions_organization_id",
        table_name="guest_ticket_submissions",
    )
    op.drop_index(
        "ix_guest_ticket_submissions_verification_method",
        table_name="guest_ticket_submissions",
    )
    op.drop_table("guest_ticket_submissions")
    op.drop_index("ix_organizations_slug", table_name="organizations")
    op.drop_index("ix_organizations_name", table_name="organizations")
    op.drop_index("ix_organizations_id", table_name="organizations")
    op.drop_table("organizations")
