"""Update schema for v1.1

Revision ID: 001
Revises: None
Create Date: 2026-03-31 02:10

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Ticket 테이블 변경
    with op.batch_alter_table('tickets', schema=None) as batch_op:
        # country -> arrival_airport (SQLite는 RENAME COLUMN보다는 DROP/ADD가 안전할 수 있음)
        # 하지만 batch_op를 쓰면 RENAME도 지원함
        batch_op.alter_column('country', new_column_name='arrival_airport', existing_type=sa.TEXT())
        
        # 신규 컬럼 추가
        batch_op.add_column(sa.Column('departure_time', sa.String(), nullable=True, server_default=''))
        batch_op.add_column(sa.Column('arrival_time', sa.String(), nullable=True, server_default=''))
        batch_op.add_column(sa.Column('cabin_capacity', sa.Integer(), nullable=True, server_default='0'))
        batch_op.add_column(sa.Column('cargo_capacity', sa.Integer(), nullable=True, server_default='0'))
    
    # 인덱스 추가 (arrival_airport)
    op.create_index('ix_tickets_arrival_airport', 'tickets', ['arrival_airport'], unique=False)


def downgrade() -> None:
    # 롤백 로직
    with op.batch_alter_table('tickets', schema=None) as batch_op:
        batch_op.drop_index('ix_tickets_arrival_airport')
        batch_op.alter_column('arrival_airport', new_column_name='country', existing_type=sa.TEXT())
        batch_op.drop_column('cargo_capacity')
        batch_op.drop_column('cabin_capacity')
        batch_op.drop_column('arrival_time')
        batch_op.drop_column('departure_time')
