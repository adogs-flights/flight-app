"""add need_posts.image_object_key for dog photos

Revision ID: 010
Revises: 009

이동을 기다리는 강아지 사진을 게시글에 올릴 수 있게 이미지 오브젝트 키 컬럼을 더한다.
nullable이라 기존 글에 영향이 없다. reversible.
"""

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision = "010"
down_revision = "009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("need_posts") as batch_op:
        batch_op.add_column(sa.Column("image_object_key", sa.String(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("need_posts") as batch_op:
        batch_op.drop_column("image_object_key")
