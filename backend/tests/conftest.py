import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))
os.environ.setdefault("SECRET_KEY", "test-secret-key")
os.environ.setdefault("COOKIE_SECURE", "false")
# main.py는 import 시점에 run_migrations()와 seed_data()를 실행한다(main.py:96-101).
# DATABASE_URL을 지정하지 않으면 개발자의 실제 DB(backend/data/flight.db)에
# 마이그레이션/시딩을 돌려버리므로, 테스트 전용 임시 DB로 리다이렉트한다.
os.environ.setdefault(
    "DATABASE_URL", f"sqlite:///{Path(__file__).parent / 'test_app.db'}"
)

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import models
from database import Base, get_db


@pytest.fixture(autouse=True)
def no_smtp(monkeypatch):
    """테스트가 실제 메일을 보내지 않게 한다."""
    import routers.auth

    monkeypatch.setattr(routers.auth, "send_email", lambda **kwargs: None)


@pytest.fixture
def db_engine():
    """테스트마다 격리된 인메모리 SQLite. StaticPool이라 같은 연결을 공유한다."""
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


@pytest.fixture
def db_session(db_engine):
    session_factory = sessionmaker(autocommit=False, autoflush=False, bind=db_engine)
    session = session_factory()
    yield session
    session.close()


@pytest.fixture
def client(db_engine, db_session):
    from main import app

    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def make_organization(db_session):
    def _make(name="어독스", slug="adogs"):
        org = models.Organization(name=name, slug=slug, is_active=True)
        db_session.add(org)
        db_session.commit()
        db_session.refresh(org)
        return org

    return _make


@pytest.fixture
def make_user(db_session):
    """역할별 사용자를 만든다. CHECK 제약을 만족하는 최소 조합을 채운다."""
    from routers.auth import get_password_hash

    counter = {"n": 0}

    def _make(role="org", organization_id=None, password="pw1234", **kwargs):
        counter["n"] += 1
        n = counter["n"]
        fields = {
            "name": kwargs.pop("name", f"테스트{n}"),
            "role": role,
        }
        if role == "general":
            fields["kakao_user_id"] = kwargs.pop("kakao_user_id", f"kakao-{n}")
            fields["email"] = kwargs.pop("email", None)
        else:
            fields["email"] = kwargs.pop("email", f"user{n}@example.com")
            fields["hashed_password"] = get_password_hash(password)
            if role == "org":
                fields["organization_id"] = organization_id
        fields.update(kwargs)
        user = models.User(**fields)
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        return user

    return _make
