"""role model, organization FK, kakao login, guest submission claim

Revision ID: 008
Revises: 007

================================================================================
!! 경고 — 이 마이그레이션은 되돌릴 수 없는 데이터 손실을 포함한다 !!
================================================================================

upgrade()는 `admin_users` 테이블을 DROP한다. 그 내용은 `users.role = 'admin'`으로
옮겨지므로 downgrade()에서 복원할 수 있다.

downgrade()는 `DELETE FROM users WHERE role = 'general'`을 실행한다.
이건 복원할 수 없다. 카카오로 가입한 일반 회원 계정이 통째로 삭제되며,
그 계정이 소유한 티켓·신청·게시글도 FK 규칙에 따라 함께 사라지거나 소유자를 잃는다.
(email/hashed_password를 NOT NULL로 되돌려야 하는데 카카오 전용 계정은 둘 다 NULL이라
 그 행이 남아 있으면 되돌릴 수 없기 때문이다.)

따라서 downgrade()를 실행하기 전에 반드시:
  SELECT COUNT(*) FROM users WHERE role = 'general';
를 확인하고, 0이 아니면 먼저 백업을 뜬다.
================================================================================
"""

import secrets

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision = "008"
down_revision = "007"
branch_labels = None
depends_on = None

ADMIN_EMAILS = (
    "admin@adogs.com",
    "janguk95@naver.com",
    "ynco32@gmail.com",
)
ORG_EMAILS = (
    "adogsyou@gmail.com",
    "adogs-ticket@gmail.com",
    "stat79@naver.com",
    "kalepassh@gmail.com",
)


def upgrade() -> None:
    conn = op.get_bind()

    # 1. 컬럼 추가. role은 server_default로 채운 뒤 기본값을 떼낸다
    with op.batch_alter_table("users") as batch_op:
        batch_op.add_column(
            sa.Column("role", sa.String(), nullable=False, server_default="org")
        )
        batch_op.add_column(sa.Column("organization_id", sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column("kakao_user_id", sa.String(), nullable=True))

    # 2. 기존 7계정 분류. 스펙 8.1 표
    adogs_org_id = conn.execute(
        sa.text("SELECT id FROM organizations WHERE slug = 'adogs'")
    ).scalar()

    # IN 절의 목록 바인딩은 SQLAlchemy 2.x에서 expanding bindparam이 필요하다.
    # 없으면 "IN ?"로 렌더되어 SQLite/PostgreSQL 모두 문법 오류가 난다.
    conn.execute(
        sa.text("UPDATE users SET role = 'admin' WHERE email IN :emails").bindparams(
            sa.bindparam("emails", expanding=True)
        ),
        {"emails": list(ADMIN_EMAILS)},
    )
    if adogs_org_id is not None:
        conn.execute(
            sa.text(
                "UPDATE users SET role = 'org', organization_id = :org_id "
                "WHERE email IN :emails"
            ).bindparams(sa.bindparam("emails", expanding=True)),
            {"org_id": adogs_org_id, "emails": list(ORG_EMAILS)},
        )

    # admin_users에 있으나 위 목록에 없는 계정도 admin으로 승격시킨다
    conn.execute(
        sa.text(
            "UPDATE users SET role = 'admin' WHERE id IN "
            "(SELECT user_id FROM admin_users WHERE approved = true)"
        )
    )

    # 분류되지 않은 org 계정이 남아 있으면 CHECK 제약에서 실패한다.
    # 단체가 하나뿐이므로 남은 org 계정은 어독스로 넣는다.
    if adogs_org_id is not None:
        conn.execute(
            sa.text(
                "UPDATE users SET organization_id = :org_id "
                "WHERE role = 'org' AND organization_id IS NULL"
            ),
            {"org_id": adogs_org_id},
        )

    # 3. NULL 허용으로 변경 + server_default 제거 + organization 컬럼 삭제
    with op.batch_alter_table("users") as batch_op:
        batch_op.alter_column("role", server_default=None)
        batch_op.alter_column(
            "email", existing_type=sa.String(), nullable=True
        )
        batch_op.alter_column(
            "hashed_password", existing_type=sa.String(), nullable=True
        )
        batch_op.drop_column("organization")

    # 3-1. CHECK 제약을 걸기 전에 위반 행이 남아 있는지 먼저 본다.
    # 여기서 걸리면 4단계에서 DB가 알아보기 힘든 제약 위반 오류를 던진다.
    # (예: organizations에 slug='adogs' 행이 없어 org 계정에 단체를 못 붙인 경우)
    violations = conn.execute(
        sa.text(
            "SELECT COUNT(*) FROM users WHERE "
            "(role = 'general' AND kakao_user_id IS NULL) OR "
            "(role = 'org' AND (email IS NULL OR hashed_password IS NULL "
            "OR organization_id IS NULL)) OR "
            "(role = 'admin' AND (email IS NULL OR hashed_password IS NULL))"
        )
    ).scalar()
    if violations:
        raise RuntimeError(
            f"CHECK 제약을 위반하는 users 행이 {violations}건 남아 있어 중단한다. "
            "organizations에 slug='adogs' 행이 있는지, 분류되지 않은 계정이 "
            "있는지 확인한 뒤 다시 실행한다."
        )

    # 4. FK + CHECK 제약.
    # SQLite는 ALTER로 제약을 붙일 수 없어 batch_alter_table(복사-이동)로만 가능하다.
    # users를 재생성하는 마지막 batch이므로 여기서 한 번에 붙인다.
    with op.batch_alter_table("users") as batch_op:
        batch_op.create_foreign_key(
            "fk_users_organization_id",
            "organizations",
            ["organization_id"],
            ["id"],
            ondelete="SET NULL",
        )
        batch_op.create_check_constraint(
            "ck_users_general_requires_kakao",
            "role <> 'general' OR kakao_user_id IS NOT NULL",
        )
        batch_op.create_check_constraint(
            "ck_users_org_requires_credentials_and_org",
            "role <> 'org' OR (email IS NOT NULL AND hashed_password IS NOT NULL "
            "AND organization_id IS NOT NULL)",
        )
        batch_op.create_check_constraint(
            "ck_users_admin_requires_credentials",
            "role <> 'admin' OR (email IS NOT NULL AND hashed_password IS NOT NULL)",
        )

    # 5. 인덱스는 users 재생성이 모두 끝난 뒤에 만든다.
    # batch가 테이블을 다시 만들 때마다 인덱스를 반영·복원해야 하는 일을 줄인다.
    op.create_index("ix_users_role", "users", ["role"])
    op.create_index("ix_users_organization_id", "users", ["organization_id"])
    op.create_index("ix_users_kakao_user_id", "users", ["kakao_user_id"], unique=True)

    # 6. guest_ticket_submissions: user_id, lookup_token
    with op.batch_alter_table("guest_ticket_submissions") as batch_op:
        batch_op.add_column(sa.Column("user_id", sa.String(), nullable=True))
        batch_op.add_column(sa.Column("lookup_token", sa.String(), nullable=True))

    # 기존 제출에 조회 토큰을 채운 뒤 NOT NULL을 건다
    rows = conn.execute(sa.text("SELECT id FROM guest_ticket_submissions")).fetchall()
    for (submission_id,) in rows:
        conn.execute(
            sa.text(
                "UPDATE guest_ticket_submissions SET lookup_token = :token "
                "WHERE id = :id"
            ),
            {"token": secrets.token_urlsafe(24), "id": submission_id},
        )

    with op.batch_alter_table("guest_ticket_submissions") as batch_op:
        batch_op.alter_column(
            "lookup_token", existing_type=sa.String(), nullable=False
        )
        batch_op.create_foreign_key(
            "fk_guest_submissions_user_id",
            "users",
            ["user_id"],
            ["id"],
            ondelete="SET NULL",
        )

    # 인덱스 이름은 models.py의 index=True가 만드는 이름(ix_<테이블>_<컬럼>)과
    # 005의 기존 관례를 따른다. 다르게 지으면 autogenerate가 매번 drop/create를
    # 제안하고, create_all로 만든 테스트 DB와 운영 DB의 인덱스 이름이 갈린다.
    op.create_index(
        "ix_guest_ticket_submissions_user_id", "guest_ticket_submissions", ["user_id"]
    )
    op.create_index(
        "ix_guest_ticket_submissions_lookup_token",
        "guest_ticket_submissions",
        ["lookup_token"],
        unique=True,
    )

    # 7. admin_users 삭제. role로 대체됐다
    op.drop_table("admin_users")


def downgrade() -> None:
    conn = op.get_bind()

    # 1. admin_users 재생성 + role='admin' 복원
    op.create_table(
        "admin_users",
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("approved", sa.Boolean(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=True,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("user_id"),
    )
    conn.execute(
        sa.text(
            "INSERT INTO admin_users (user_id, approved) "
            "SELECT id, true FROM users WHERE role = 'admin'"
        )
    )

    # 2. guest_ticket_submissions 되돌리기.
    # 인덱스를 먼저 지워야 batch가 테이블을 재생성할 때 없는 컬럼의 인덱스를
    # 다시 만들려 하지 않는다. FK도 SQLite에서는 batch 안에서만 지울 수 있다.
    op.drop_index(
        "ix_guest_ticket_submissions_lookup_token", "guest_ticket_submissions"
    )
    op.drop_index("ix_guest_ticket_submissions_user_id", "guest_ticket_submissions")
    with op.batch_alter_table("guest_ticket_submissions") as batch_op:
        batch_op.drop_constraint(
            "fk_guest_submissions_user_id", type_="foreignkey"
        )
        batch_op.drop_column("lookup_token")
        batch_op.drop_column("user_id")

    # 3. CHECK 제약 제거
    with op.batch_alter_table("users") as batch_op:
        batch_op.drop_constraint(
            "ck_users_admin_requires_credentials", type_="check"
        )
        batch_op.drop_constraint(
            "ck_users_org_requires_credentials_and_org", type_="check"
        )
        batch_op.drop_constraint("ck_users_general_requires_kakao", type_="check")

    # 4. organization 문자열 컬럼 복원 + NOT NULL 되돌리기
    with op.batch_alter_table("users") as batch_op:
        batch_op.add_column(sa.Column("organization", sa.String(), nullable=True))

    # NULL인 email/hashed_password가 있으면 NOT NULL로 되돌릴 수 없다.
    # 카카오 전용 계정을 먼저 지운다
    conn.execute(sa.text("DELETE FROM users WHERE role = 'general'"))

    with op.batch_alter_table("users") as batch_op:
        batch_op.alter_column(
            "hashed_password", existing_type=sa.String(), nullable=False
        )
        batch_op.alter_column("email", existing_type=sa.String(), nullable=False)

    # 5. 컬럼 삭제. 인덱스를 먼저 지우고, FK는 batch 안에서 지운다
    op.drop_index("ix_users_kakao_user_id", "users")
    op.drop_index("ix_users_organization_id", "users")
    op.drop_index("ix_users_role", "users")
    with op.batch_alter_table("users") as batch_op:
        batch_op.drop_constraint("fk_users_organization_id", type_="foreignkey")
        batch_op.drop_column("kakao_user_id")
        batch_op.drop_column("organization_id")
        batch_op.drop_column("role")
