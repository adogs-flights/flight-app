"""Update user organization and make gdrive token nullable

Revision ID: 004
Revises: 003
Create Date: 2026-04-24 16:45:00.000000

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = '004'
down_revision = '003'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. User 테이블에 organization 컬럼 추가
    op.add_column('users', sa.Column('organization', sa.String(), nullable=True))
    
    # 2. UserGoogleToken 테이블의 access_token 컬럼을 nullable로 변경
    # PostgreSQL 환경을 고려하여 alter_column 사용
    op.alter_column('user_google_tokens', 'access_token',
               existing_type=sa.String(),
               nullable=True)


def downgrade() -> None:
    # 1. UserGoogleToken 테이블의 access_token 컬럼을 다시 NOT NULL로 변경
    # 주의: 기존 데이터에 NULL이 있을 경우 실패할 수 있으므로 downgrade 시 유의 필요
    op.alter_column('user_google_tokens', 'access_token',
               existing_type=sa.String(),
               nullable=False)
    
    # 2. User 테이블에서 organization 컬럼 제거
    op.drop_column('users', 'organization')
