"""add users.is_approved for org self-signup approval

Revision ID: 009
Revises: 008

단체 자율 회원가입을 도입하면서 '관리자 승인 대기' 상태가 필요해졌다.
기존 계정(관리자 발급 org/admin, 카카오 general)은 전부 승인된 것으로 본다.
따라서 컬럼을 추가한 뒤 기존 행을 모두 TRUE로 채우고 NOT NULL을 건다.

되돌릴 수 있는 마이그레이션이다. downgrade()는 컬럼만 제거한다.
"""

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision = "009"
down_revision = "008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()

    # 1. nullable로 추가한 뒤 기존 행을 채운다. server_default의 dialect 차이를
    #    피하려고 NOT NULL은 백필 이후에 건다.
    with op.batch_alter_table("users") as batch_op:
        batch_op.add_column(sa.Column("is_approved", sa.Boolean(), nullable=True))

    # 기존 계정은 모두 승인 상태로 본다. TRUE 리터럴은 PostgreSQL과 SQLite(3.23+)
    # 양쪽에서 동작한다.
    bind.execute(sa.text("UPDATE users SET is_approved = TRUE"))

    with op.batch_alter_table("users") as batch_op:
        batch_op.alter_column(
            "is_approved", existing_type=sa.Boolean(), nullable=False
        )


def downgrade() -> None:
    with op.batch_alter_table("users") as batch_op:
        batch_op.drop_column("is_approved")
