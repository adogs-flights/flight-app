"""add organization intro fields

Revision ID: 017
Revises: 016

공개 단체 소개 페이지(/org/{slug})를 위해 organizations에 소개글·로고·링크
컬럼을 추가한다.
"""

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision = "017"
down_revision = "016"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("organizations") as batch_op:
        batch_op.add_column(sa.Column("description", sa.Text(), nullable=True))
        batch_op.add_column(sa.Column("logo_object_key", sa.String(), nullable=True))
        batch_op.add_column(sa.Column("homepage_url", sa.String(), nullable=True))
        batch_op.add_column(sa.Column("instagram_url", sa.String(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("organizations") as batch_op:
        batch_op.drop_column("instagram_url")
        batch_op.drop_column("homepage_url")
        batch_op.drop_column("logo_object_key")
        batch_op.drop_column("description")
