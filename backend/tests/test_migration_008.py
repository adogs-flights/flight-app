import os
import subprocess
import sys
from pathlib import Path

import pytest
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.exc import IntegrityError

import models


def test_alembic_env_imports_models():
    """env.py가 models를 import하는지 소스에서 확인한다.

    env.py는 alembic만 읽는 파일이라 런타임에 그 효과를 관측할 수 없다.
    그래서 소스를 직접 확인한다. 이 import가 없으면 Base.metadata가 비어 있어
    autogenerate가 모든 테이블을 drop하는 마이그레이션을 만든다.

    주석을 떼고 실제 import 문만 본다. env.py에 "we can import models"라는
    주석이 이미 있어서 단순 부분 문자열 검사로는 없는 import를 있다고 판정한다.
    """
    env_source = (Path(__file__).parent.parent / "alembic" / "env.py").read_text()
    code_lines = [line.split("#")[0].strip() for line in env_source.splitlines()]
    assert "import models" in code_lines


def test_models_register_on_metadata():
    """models를 import하면 Base.metadata에 테이블이 등록된다."""
    from database import Base

    table_names = set(Base.metadata.tables.keys())
    assert "users" in table_names
    assert "guest_ticket_submissions" in table_names


def test_user_has_role_and_organization_columns(db_session, make_organization):
    org = make_organization()
    user = models.User(
        name="단체담당자",
        email="org@example.com",
        hashed_password="hashed",
        role="org",
        organization_id=org.id,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    assert user.role == "org"
    assert user.organization.name == "어독스"


def test_admin_user_model_is_gone():
    assert not hasattr(models, "AdminUser")


def test_general_user_without_kakao_id_is_rejected(db_session):
    db_session.add(models.User(name="일반인", role="general"))
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


def test_org_user_without_organization_is_rejected(db_session):
    db_session.add(
        models.User(
            name="단체", email="a@b.com", hashed_password="h", role="org"
        )
    )
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


def test_general_user_needs_no_email_or_password(db_session):
    user = models.User(name="카카오유저", role="general", kakao_user_id="kakao-1")
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    assert user.email is None
    assert user.hashed_password is None


def test_guest_submission_has_user_id_and_lookup_token(db_session):
    submission = models.GuestTicketSubmission(
        phone="01011112222",
        verification_method="reservation_number",
        lookup_token="tok-abc",
    )
    db_session.add(submission)
    db_session.commit()
    db_session.refresh(submission)

    assert submission.user_id is None
    assert submission.lookup_token == "tok-abc"


def _alembic_runner(db_path):
    """일회용 SQLite 파일에 대고 alembic을 돌리는 헬퍼를 만든다.

    `alembic` 실행 파일은 `venv/bin/python -m pytest`로 돌 때 PATH에 없다.
    그래서 항상 `sys.executable -m alembic`으로 부른다.
    """
    backend_dir = Path(__file__).parent.parent
    env = {
        **os.environ,
        "DATABASE_URL": f"sqlite:///{db_path}",
        "SECRET_KEY": "test-secret-key",
    }

    def alembic(*args):
        result = subprocess.run(
            [sys.executable, "-m", "alembic", *args],
            cwd=backend_dir,
            env=env,
            capture_output=True,
            text=True,
            check=False,
        )
        assert result.returncode == 0, f"alembic {args} failed:\n{result.stderr}"
        return result

    return alembic


def test_migration_008_round_trip(tmp_path):
    """upgrade → downgrade → upgrade가 모두 동작해야 한다.
    프로덕션에서 admin_users를 삭제하는 마이그레이션이므로 복원 가능성을 증명한다."""
    db_path = tmp_path / "migration_test.db"
    alembic = _alembic_runner(db_path)

    alembic("upgrade", "head")
    alembic("downgrade", "007")

    # downgrade 직후 스키마가 007로 정말 되돌아갔는지 본다.
    # CHECK 제약이 지워지지 않고 남아 있으면 007 스키마가 아니다.
    engine = create_engine(f"sqlite:///{db_path}")
    inspector = inspect(engine)
    downgraded = {c["name"] for c in inspector.get_columns("users")}
    assert "organization" in downgraded
    assert "role" not in downgraded
    assert "organization_id" not in downgraded
    assert "kakao_user_id" not in downgraded
    assert "admin_users" in inspector.get_table_names()
    assert inspector.get_check_constraints("users") == []
    engine.dispose()

    alembic("upgrade", "head")

    engine = create_engine(f"sqlite:///{db_path}")
    inspector = inspect(engine)
    columns = {c["name"] for c in inspector.get_columns("users")}
    assert "role" in columns
    assert "organization_id" in columns
    assert "organization" not in columns
    assert "admin_users" not in inspector.get_table_names()

    # batch_alter_table은 users를 세 번 재생성한다. 000에서 만든 이메일 유니크
    # 인덱스가 그 과정에서 사라지면 중복 가입을 막지 못하므로 살아남았는지 본다.
    email_indexes = [
        ix
        for ix in inspector.get_indexes("users")
        if ix["column_names"] == ["email"] and ix["unique"]
    ]
    assert email_indexes, "users.email 유니크 인덱스가 batch 재생성에서 사라졌다"

    # CHECK 제약 3개가 실제로 테이블에 붙어 있는지 확인한다
    check_names = {c["name"] for c in inspector.get_check_constraints("users")}
    assert check_names == {
        "ck_users_general_requires_kakao",
        "ck_users_org_requires_credentials_and_org",
        "ck_users_admin_requires_credentials",
    }
    engine.dispose()


def test_migration_008_classifies_existing_accounts(tmp_path):
    """스펙 8.1 표대로 기존 계정을 분류하는지, 007 시점 데이터를 넣고 확인한다.

    왕복 테스트는 빈 DB에서 돌아서 데이터 이관 코드가 한 줄도 실행되지 않는다.
    프로덕션에는 실계정 7개와 게스트 제출 4건이 있으므로 그 경로를 따로 재현한다.
    """
    db_path = tmp_path / "classify_test.db"
    alembic = _alembic_runner(db_path)
    alembic("upgrade", "007")

    engine = create_engine(f"sqlite:///{db_path}")
    with engine.begin() as conn:
        conn.execute(
            text(
                "INSERT INTO organizations (name, slug, is_active) "
                "VALUES ('어독스', 'adogs', 1)"
            )
        )
        accounts = [
            # 스펙 8.1: admin으로 분류되어야 하는 3계정
            ("u-admin-1", "admin@adogs.com"),
            ("u-admin-2", "janguk95@naver.com"),
            ("u-admin-3", "ynco32@gmail.com"),
            # 스펙 8.1: org로 분류되어야 하는 4계정
            ("u-org-1", "adogsyou@gmail.com"),
            ("u-org-2", "adogs-ticket@gmail.com"),
            ("u-org-3", "stat79@naver.com"),
            ("u-org-4", "kalepassh@gmail.com"),
            # 표에 없는 계정. org로 남아 어독스에 배정되어야 한다
            ("u-leftover", "leftover@example.com"),
            # 표에 없지만 admin_users에 승인되어 있다. admin으로 승격되어야 한다
            ("u-promoted", "promoted@example.com"),
            # admin_users에 있지만 미승인. 승격되면 안 된다
            ("u-unapproved", "unapproved@example.com"),
        ]
        for user_id, email in accounts:
            conn.execute(
                text(
                    "INSERT INTO users (id, name, email, hashed_password, organization) "
                    "VALUES (:id, :name, :email, 'hashed', '어독스')"
                ),
                {"id": user_id, "name": email.split("@")[0], "email": email},
            )
        conn.execute(
            text(
                "INSERT INTO admin_users (user_id, approved) VALUES "
                "('u-promoted', 1), ('u-unapproved', 0)"
            )
        )
        for n in range(4):
            conn.execute(
                text(
                    "INSERT INTO guest_ticket_submissions "
                    "(id, phone, verification_method, status) "
                    "VALUES (:id, '01000000000', 'reservation_number', 'pending')"
                ),
                {"id": f"g-{n}"},
            )
    engine.dispose()

    alembic("upgrade", "head")

    engine = create_engine(f"sqlite:///{db_path}")
    with engine.connect() as conn:
        adogs_id = conn.execute(
            text("SELECT id FROM organizations WHERE slug = 'adogs'")
        ).scalar()
        roles = dict(
            conn.execute(text("SELECT id, role FROM users")).fetchall()
        )
        org_ids = dict(
            conn.execute(text("SELECT id, organization_id FROM users")).fetchall()
        )

        assert roles["u-admin-1"] == "admin"
        assert roles["u-admin-2"] == "admin"
        assert roles["u-admin-3"] == "admin"
        for user_id in ("u-org-1", "u-org-2", "u-org-3", "u-org-4"):
            assert roles[user_id] == "org"
            assert org_ids[user_id] == adogs_id
        assert roles["u-leftover"] == "org"
        assert org_ids["u-leftover"] == adogs_id
        assert roles["u-promoted"] == "admin"
        assert roles["u-unapproved"] == "org"
        assert org_ids["u-unapproved"] == adogs_id

        # 모든 계정이 CHECK 제약을 만족해야 한다. 하나라도 위반하면
        # 4단계에서 제약을 붙일 때 마이그레이션이 터졌을 것이다.
        tokens = [
            row[0]
            for row in conn.execute(
                text("SELECT lookup_token FROM guest_ticket_submissions")
            ).fetchall()
        ]
        assert len(tokens) == 4
        assert all(tokens)
        assert len(set(tokens)) == 4, "lookup_token이 중복됐다"
    engine.dispose()

    # admin_users를 DROP하는 마이그레이션이므로, 되돌렸을 때 테이블 모양뿐 아니라
    # 내용까지 살아 돌아오는지 확인한다. 이게 안 되면 롤백이 관리자 권한을 지운다.
    alembic("downgrade", "007")

    engine = create_engine(f"sqlite:///{db_path}")
    with engine.connect() as conn:
        restored = {
            row[0]
            for row in conn.execute(
                text("SELECT user_id FROM admin_users WHERE approved")
            ).fetchall()
        }
        assert restored == {"u-admin-1", "u-admin-2", "u-admin-3", "u-promoted"}
        # 007 시점에는 없던 계정이 사라지지도, 늘지도 않아야 한다
        assert conn.execute(text("SELECT COUNT(*) FROM users")).scalar() == 10
    engine.dispose()


def test_migration_008_aborts_when_accounts_cannot_be_classified(tmp_path):
    """단체(slug='adogs')가 없어 org 계정에 organization_id를 못 붙이면,
    CHECK 제약 위반이라는 알아보기 힘든 오류 대신 이유를 말하고 멈춰야 한다."""
    db_path = tmp_path / "abort_test.db"
    alembic = _alembic_runner(db_path)
    alembic("upgrade", "007")

    engine = create_engine(f"sqlite:///{db_path}")
    with engine.begin() as conn:
        # organizations는 비워 둔다. adogs가 없으니 분류가 끝나지 않는다.
        conn.execute(
            text(
                "INSERT INTO users (id, name, email, hashed_password) "
                "VALUES ('u-1', '단체', 'nobody@example.com', 'hashed')"
            )
        )
    engine.dispose()

    result = subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head"],
        cwd=Path(__file__).parent.parent,
        env={
            **os.environ,
            "DATABASE_URL": f"sqlite:///{db_path}",
            "SECRET_KEY": "test-secret-key",
        },
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.returncode != 0
    assert "CHECK 제약을 위반하는 users 행이 1건" in result.stderr

    # 중단했으므로 admin_users는 아직 살아 있어야 한다
    engine = create_engine(f"sqlite:///{db_path}")
    assert "admin_users" in inspect(engine).get_table_names()
    engine.dispose()
