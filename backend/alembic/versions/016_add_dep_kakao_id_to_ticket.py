"""add dep_kakao_id to ticket

Revision ID: 016
Revises: 015

출국 준비 추가정보에 카카오톡 아이디를 함께 받도록,
tickets에 dep_kakao_id 컬럼을 추가한다.
"""

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision = "016"
down_revision = "015"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("tickets") as batch_op:
        batch_op.add_column(sa.Column("dep_kakao_id", sa.String(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("tickets") as batch_op:
        batch_op.drop_column("dep_kakao_id")
