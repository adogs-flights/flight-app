"""add rescue_dogs table

Revision ID: 018
Revises: 017

구조견 관리 대장(/rescueadog). 구글 시트의 "구조견 정보 / 임보 / 입양"
3개 블록을 한 테이블로 모은다. 임보자·입양자 개인정보는 담당 단체만
조회하도록 organization_id로 소유를 기록한다.
"""

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision = "018"
down_revision = "017"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "rescue_dogs",
        sa.Column("id", sa.String(), nullable=False),
        # 구조견 정보
        sa.Column("notice_number", sa.String(), nullable=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("photo_object_key", sa.String(), nullable=True),
        sa.Column("rescued_on", sa.Date(), nullable=True),
        sa.Column("birth_on", sa.Date(), nullable=True),
        sa.Column("sex", sa.String(), nullable=True),
        sa.Column("rescue_place", sa.String(), nullable=True),
        sa.Column(
            "status", sa.String(), nullable=False, server_default="protecting"
        ),
        sa.Column("microchip_number", sa.String(), nullable=True),
        sa.Column(
            "is_neutered", sa.Boolean(), nullable=False, server_default=sa.false()
        ),
        sa.Column("note", sa.Text(), nullable=True),
        # 임보
        sa.Column("foster_name", sa.String(), nullable=True),
        sa.Column("foster_address", sa.String(), nullable=True),
        sa.Column("foster_contact", sa.String(), nullable=True),
        sa.Column("foster_note", sa.Text(), nullable=True),
        # 입양
        sa.Column("adopted_on", sa.Date(), nullable=True),
        sa.Column("adopter_name", sa.String(), nullable=True),
        sa.Column("adopter_address", sa.String(), nullable=True),
        sa.Column("adopter_contact", sa.String(), nullable=True),
        sa.Column("adopter_email", sa.String(), nullable=True),
        sa.Column("adoption_note", sa.Text(), nullable=True),
        # 소유·작성자
        sa.Column("organization_id", sa.Integer(), nullable=True),
        sa.Column("created_by_id", sa.String(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now()
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()
        ),
        sa.CheckConstraint(
            "status IN ('protecting', 'fostering', 'adopted')",
            name="ck_rescue_dogs_status",
        ),
        sa.CheckConstraint(
            "sex IS NULL OR sex IN ('male', 'female')",
            name="ck_rescue_dogs_sex",
        ),
        sa.ForeignKeyConstraint(
            ["organization_id"], ["organizations.id"], ondelete="SET NULL"
        ),
        sa.ForeignKeyConstraint(["created_by_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_rescue_dogs_notice_number"),
        "rescue_dogs",
        ["notice_number"],
    )
    op.create_index(op.f("ix_rescue_dogs_rescued_on"), "rescue_dogs", ["rescued_on"])
    op.create_index(op.f("ix_rescue_dogs_status"), "rescue_dogs", ["status"])
    op.create_index(
        op.f("ix_rescue_dogs_organization_id"), "rescue_dogs", ["organization_id"]
    )
    op.create_index(
        op.f("ix_rescue_dogs_created_by_id"), "rescue_dogs", ["created_by_id"]
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_rescue_dogs_created_by_id"), table_name="rescue_dogs")
    op.drop_index(op.f("ix_rescue_dogs_organization_id"), table_name="rescue_dogs")
    op.drop_index(op.f("ix_rescue_dogs_status"), table_name="rescue_dogs")
    op.drop_index(op.f("ix_rescue_dogs_rescued_on"), table_name="rescue_dogs")
    op.drop_index(op.f("ix_rescue_dogs_notice_number"), table_name="rescue_dogs")
    op.drop_table("rescue_dogs")
