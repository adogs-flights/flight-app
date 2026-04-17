"""Add master tables (airports, airlines) and color fields

Revision ID: 002
Revises: 001
Create Date: 2026-04-10 12:30

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "002"
down_revision: str | None = "001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1. airports 테이블 생성
    op.create_table(
        "airports",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("code", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("country", sa.String(), nullable=False),
        sa.Column("bg_color", sa.String(), nullable=True, server_default="#f1f5f9"),
        sa.Column("text_color", sa.String(), nullable=True, server_default="#475569"),
        sa.Column("is_active", sa.Boolean(), nullable=True, server_default="1"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_airports_code", "airports", ["code"], unique=True)
    op.create_index("ix_airports_id", "airports", ["id"], unique=False)

    # 2. airlines 테이블 생성
    op.create_table(
        "airlines",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("code", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=True, server_default="1"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_airlines_code", "airlines", ["code"], unique=True)
    op.create_index("ix_airlines_id", "airlines", ["id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_airlines_id", table_name="airlines")
    op.drop_index("ix_airlines_code", table_name="airlines")
    op.drop_table("airlines")
    op.drop_index("ix_airports_id", table_name="airports")
    op.drop_index("ix_airports_code", table_name="airports")
    op.drop_table("airports")
