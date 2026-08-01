# 역할 모델 정규화와 카카오 로그인 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `users` 테이블에 3단 역할(`general`/`org`/`admin`)과 단체 FK를 도입하고, 카카오 로그인과 HttpOnly 쿠키 기반 사일런트 리프레시로 인증을 전환한다.

**Architecture:** 권한은 `users.role` 컬럼 하나로 판정하고 기존 `admin_users` 테이블을 삭제한다. 통과/차단으로 표현할 수 없는 "티켓은 공유, 개인정보는 자기 단체만" 규칙은 `scope_to_org()` 쿼리 헬퍼 하나에 모은다. 토큰은 localStorage에서 HttpOnly 쿠키로 옮기고, access 만료 시 `get_current_user` 안에서 refresh 쿠키를 검증해 401 없이 재발급한다.

**Tech Stack:** FastAPI, SQLAlchemy, Alembic, Pydantic v2, PyJWT, pytest, httpx, React 19, axios

## Global Constraints

- 스펙: `docs/superpowers/specs/2026-07-26-role-model-and-kakao-auth-design.md`
- `Base.metadata.create_all` 사용 금지. 스키마 변경은 Alembic 마이그레이션만 (`docs/backend.md`)
- 마이그레이션 파일은 생성 후 사람이 전수 검토한다. `op.drop_table`이 의도한 것인지 확인 (`docs/backend.md`)
- 구글 API 통신은 `BackgroundTasks`로 처리 (`docs/backend.md`)
- OAuth `state`는 사용자 ID가 포함된 서명된 단기 JWT (`docs/security.md`)
- 백엔드 수정 후 `ruff check` 실행, 프론트 수정 후 `npm run lint` 실행 (`GEMINI.md`)
- 프로덕션 DB에 실제 회원 7명과 게스트 제출 4건이 있다. 마이그레이션은 백업 후 수동 적용한다
- 마이그레이션은 SQLite(테스트)와 PostgreSQL(프로덕션) 양쪽에서 동작해야 한다. 컬럼 변경·삭제는 `op.batch_alter_table` 사용
- 역할 문자열은 정확히 `general`, `org`, `admin`
- 쿠키 이름은 정확히 `access_token`, `refresh_token`

---

## File Structure

**신규 생성**

| 파일 | 책임 |
|---|---|
| `backend/tests/conftest.py` | pytest 픽스처 — 격리된 SQLite DB, TestClient, 역할별 사용자 팩토리 |
| `backend/tests/test_auth_cookies.py` | 쿠키 발급·사일런트 리프레시·동시 요청 |
| `backend/tests/test_permissions.py` | 역할별 접근 통제, `scope_to_org` 단체 격리 |
| `backend/tests/test_kakao_login.py` | 카카오 로그인 (카카오 API는 목) |
| `backend/tests/test_claim.py` | 클레임 정상·중복·토큰 불일치 |
| `backend/tests/test_migration_008.py` | 마이그레이션 upgrade → downgrade → upgrade 왕복 |
| `backend/services/kakao_service.py` | 카카오 토큰 교환과 사용자 정보 조회. HTTP 호출을 여기 한 곳에 격리해 목으로 대체 가능하게 한다 |
| `backend/permissions.py` | `scope_to_org()` 쿼리 헬퍼. 라우터가 아니라 독립 모듈에 둬서 정책 변경 시 한 곳만 고친다 |
| `backend/alembic/versions/008_role_model_and_kakao.py` | 스키마 변경 + 데이터 이관 + `admin_users` 삭제 |
| `frontend/src/pages/KakaoCallback.jsx` | 카카오 콜백 라우트. `code`를 백엔드로 넘기는 것만 한다 |

**수정**

| 파일 | 변경 |
|---|---|
| `backend/alembic/env.py:12` | `import models` 추가 |
| `backend/models.py:24-95` | `User`에 컬럼 3개·CHECK 3개 추가, `AdminUser` 클래스 삭제 |
| `backend/models.py:229-258` | `GuestTicketSubmission`에 `user_id`·`lookup_token` 추가 |
| `backend/schemas.py:26-67` | `AdminUser` 스키마 삭제, `User`에 `role`·`organization` 추가 |
| `backend/routers/auth.py` | 쿠키 인증, 사일런트 리프레시, 카카오 엔드포인트, 의존성 4개 |
| `backend/routers/guest_submissions.py` | `scope_to_org` 적용 3곳, 클레임 엔드포인트 |
| `backend/requirements.txt` | `pytest`, `httpx`, `requests` 추가 |
| `frontend/src/utils/api.js` | 요청 인터셉터 제거, `withCredentials` |
| `frontend/src/contexts/AuthContext.jsx` | localStorage 제거, 카카오 로그인 |
| `frontend/src/App.jsx:44` | 권한 판정 + 콜백 라우트 |
| `frontend/src/components/layout/Header.jsx:42` | 권한 판정 |
| `frontend/src/components/layout/Sidebar.jsx:34` | 권한 판정 |
| `frontend/src/components/modals/NeedPostDetailModal.jsx:11` | 권한 판정 |
| `frontend/src/components/modals/TicketDetailModal.jsx:15` | 권한 판정 |
| `frontend/src/pages/AdminView.jsx:119` | 권한 판정 + 회원 등록 폼 |
| `frontend/src/pages/LoginScreen.jsx` | 카카오 로그인 버튼 |
| `docker-compose.yml` | healthcheck, `depends_on` 조건 |
| `.github/workflows/deploy.yml` | 마이그레이션 단계 |

---

## Task 1: 테스트 기반과 alembic env.py 수정

`alembic/env.py`에 `import models`가 없다. 이 상태로 `--autogenerate`를 돌리면 `Base.metadata`가 비어 있어 **모든 테이블을 drop하는 마이그레이션이 생성된다.** 다른 작업을 하기 전에 고친다.

**Files:**
- Modify: `backend/alembic/env.py:12`
- Modify: `backend/requirements.txt`
- Create: `backend/tests/conftest.py`
- Create: `backend/tests/test_migration_008.py` (이 태스크에서는 env.py 검증만)

**Interfaces:**
- Produces: `client` 픽스처(`TestClient`), `db_session` 픽스처(`Session`), `make_user(role, **kwargs)` 팩토리. Task 2~6이 전부 이 픽스처를 쓴다.

- [ ] **Step 1: 의존성 추가**

`backend/requirements.txt` 맨 아래 opentelemetry 블록 **위에** 세 줄을 추가한다.

```
pytest
httpx
requests
```

`requests`는 Task 5의 카카오 HTTP 호출에 쓴다.

- [ ] **Step 2: 실패하는 테스트를 쓴다**

`backend/tests/test_migration_008.py`:

```python
import os
from pathlib import Path

import models


def test_alembic_env_imports_models():
    """env.py가 models를 import하는지 소스에서 확인한다.

    env.py는 alembic만 읽는 파일이라 런타임에 그 효과를 관측할 수 없다.
    그래서 소스를 직접 확인한다. 이 import가 없으면 Base.metadata가 비어 있어
    autogenerate가 모든 테이블을 drop하는 마이그레이션을 만든다.
    """
    env_source = (Path(__file__).parent.parent / "alembic" / "env.py").read_text()
    assert "import models" in env_source


def test_models_register_on_metadata():
    """models를 import하면 Base.metadata에 테이블이 등록된다."""
    from database import Base

    table_names = set(Base.metadata.tables.keys())
    assert "users" in table_names
    assert "guest_ticket_submissions" in table_names
```

`import os`와 `import models`는 이 파일의 뒤 테스트들이 쓴다. 지우지 않는다.

- [ ] **Step 3: 테스트가 실패하는지 확인**

```bash
cd backend && python -m pytest tests/test_migration_008.py -v
```

Expected: `test_alembic_env_imports_models` FAIL (`AssertionError`), `test_models_register_on_metadata` PASS

두 번째가 통과하는 것은 정상이다. 테스트 파일이 `models`를 직접 import하므로 등록이 일어난다. 검사 대상은 `env.py`의 소스다.

- [ ] **Step 4: env.py를 고친다**

`backend/alembic/env.py:12`를 두 줄로 바꾼다.

```python
from database import SQLALCHEMY_DATABASE_URL, Base
import models  # noqa: F401  # Base.metadata에 모델을 등록한다. 지우면 autogenerate가 테이블을 drop한다
```

- [ ] **Step 5: 두 테스트가 모두 통과하는지 확인**

```bash
cd backend && python -m pytest tests/test_migration_008.py -v
```

Expected: 2 passed

- [ ] **Step 6: conftest.py를 쓴다**

`backend/tests/conftest.py`:

```python
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))
os.environ.setdefault("SECRET_KEY", "test-secret-key")
os.environ.setdefault("COOKIE_SECURE", "false")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import models
from database import Base, get_db


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
```

`Base.metadata.create_all`을 테스트에서 쓰는 것은 `docs/backend.md`의 금지 규칙과 충돌하지 않는다. 그 규칙은 프로덕션 스키마 변경을 마이그레이션으로만 하라는 뜻이고, 여기는 인메모리 테스트 DB다.

이 픽스처는 Task 2에서 추가하는 `role`, `kakao_user_id`, `organization_id` 컬럼을 참조하므로 Task 2까지는 사용되지 않는다.

- [ ] **Step 7: conftest가 로드되는지 확인**

```bash
cd backend && python -m pytest tests/ -v
```

Expected: 2 passed. conftest 수집 에러가 없어야 한다.

- [ ] **Step 8: 린트**

```bash
cd backend && ruff check .
```

Expected: `All checks passed!` 또는 에러 없음. 에러가 나면 고친 뒤 재실행한다.

- [ ] **Step 9: 커밋**

```bash
git add backend/alembic/env.py backend/requirements.txt backend/tests/
git commit -m "test: pytest 기반 추가, alembic env.py에 import models 복구

env.py에 import models가 없어 Base.metadata가 비어 있었다. 이 상태로
autogenerate를 돌리면 모든 테이블을 drop하는 마이그레이션이 생성된다."
```

---

## Task 2: 모델·스키마·마이그레이션 008

**Files:**
- Modify: `backend/models.py:24-95` (User, AdminUser), `backend/models.py:229-258` (GuestTicketSubmission)
- Modify: `backend/schemas.py:26-67`
- Create: `backend/alembic/versions/008_role_model_and_kakao.py`
- Test: `backend/tests/test_migration_008.py`

**Interfaces:**
- Consumes: Task 1의 `db_session`, `make_user`, `make_organization`
- Produces:
  - `models.User.role: str` (`general`|`org`|`admin`), `models.User.organization_id: int | None`, `models.User.kakao_user_id: str | None`, `models.User.organization` 관계
  - `models.GuestTicketSubmission.user_id: str | None`, `models.GuestTicketSubmission.lookup_token: str`
  - `models.AdminUser` **삭제됨**. `schemas.AdminUser` **삭제됨**
  - `schemas.User.role: str`, `schemas.User.organization: Organization | None`

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`backend/tests/test_migration_008.py`의 import 블록에 두 줄을 더하고,

```python
import pytest
from sqlalchemy.exc import IntegrityError
```

파일 맨 아래에 테스트를 추가한다.

```python
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
```

SQLite에서 CHECK 제약이 실제로 동작하려면 `Base.metadata.create_all`이 제약을 함께 만들어야 한다. SQLAlchemy의 `CheckConstraint`는 SQLite에서도 DDL로 생성된다.

- [ ] **Step 2: 테스트가 실패하는지 확인**

```bash
cd backend && python -m pytest tests/test_migration_008.py -v
```

Expected: 새 테스트 6개 전부 FAIL. `role` 컬럼이 없어 `TypeError` 또는 `InvalidRequestError`.

- [ ] **Step 3: models.py의 User를 고친다**

`backend/models.py`의 import 블록(3-13행)에 `CheckConstraint`를 추가한다.

```python
from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
```

`User` 클래스(24행부터)를 아래로 바꾼다. `organization` 문자열 컬럼(31행)을 지우고 `admin_info` 관계(34-39행)를 지운다.

```python
class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint(
            "role <> 'general' OR kakao_user_id IS NOT NULL",
            name="ck_users_general_requires_kakao",
        ),
        CheckConstraint(
            "role <> 'org' OR (email IS NOT NULL AND hashed_password IS NOT NULL "
            "AND organization_id IS NOT NULL)",
            name="ck_users_org_requires_credentials_and_org",
        ),
        CheckConstraint(
            "role <> 'admin' OR (email IS NOT NULL AND hashed_password IS NOT NULL)",
            name="ck_users_admin_requires_credentials",
        ),
    )

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=True)
    hashed_password = Column(String, nullable=True)
    role = Column(String, nullable=False, default="org", index=True)
    organization_id = Column(
        Integer, ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True, index=True
    )
    kakao_user_id = Column(String, unique=True, index=True, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    organization = relationship("Organization")
    tickets_created = relationship(
        "Ticket",
        back_populates="creator",
        foreign_keys="[Ticket.created_by_id]",
    )
    tickets_owned = relationship(
        "Ticket",
        back_populates="owner",
        foreign_keys="[Ticket.owner_id]",
    )
    applications = relationship(
        "TicketApplication",
        back_populates="applicant",
        cascade="all, delete-orphan",
    )
    need_posts = relationship(
        "NeedPost",
        back_populates="author",
        cascade="all, delete-orphan",
    )
    refresh_tokens = relationship(
        "RefreshToken",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    google_token = relationship(
        "UserGoogleToken",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )
```

`AdminUser` 클래스(85-94행) 전체를 삭제한다.

- [ ] **Step 4: models.py의 GuestTicketSubmission을 고친다**

`user_id`와 `lookup_token`을 추가한다. `organization_id` 컬럼 바로 아래에 넣는다.

```python
    user_id = Column(
        String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    lookup_token = Column(String, unique=True, index=True, nullable=False)
```

관계도 추가한다. `organization = relationship("Organization")` 아래.

```python
    user = relationship("User")
```

- [ ] **Step 5: 테스트가 통과하는지 확인**

```bash
cd backend && python -m pytest tests/test_migration_008.py -v
```

Expected: 8 passed

- [ ] **Step 6: schemas.py를 고친다**

`AdminUserBase`(26-28행)와 `AdminUser`(31-32행) 클래스를 삭제한다.

`UserBase`(41-44행)와 `User`(64-67행)를 아래로 바꾼다. `Organization` 스키마가 파일 안에서 `User`보다 뒤에 정의되어 있으면 `User`를 `Organization` 뒤로 옮긴다.

```python
class UserBase(BaseModel):
    email: EmailStr
    name: str


class UserCreate(UserBase):
    password: str
    organization_id: int
    role: str = "org"


class User(BaseModel):
    id: str
    name: str
    email: EmailStr | None = None
    role: str
    organization_id: int | None = None
    organization: Organization | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
```

`UserCreate`가 `organization_id`를 필수로 받는 이유는 CHECK 제약이 `role='org'`에 단체를 요구하기 때문이다. `role='admin'` 계정을 만들 때는 `organization_id`가 무시되므로, Task 7에서 라우터가 역할에 따라 처리한다.

`User`가 `UserBase`를 상속하지 않는 이유는 `email`이 응답에서 선택이고 생성에서 필수라서다.

기존 `User`에 `model_config` 또는 `class Config`가 어떤 형태로 붙어 있는지 확인하고 파일의 기존 방식을 따른다.

- [ ] **Step 7: AdminUser 스키마 참조를 모두 제거했는지 확인**

```bash
cd backend && grep -rn "AdminUserBase\|schemas.AdminUser\|models.AdminUser\|admin_info" --include="*.py" .
```

Expected: `routers/auth.py:107`의 `current_user.admin_info`만 남는다. 이건 Task 4에서 고친다.

- [ ] **Step 8: 마이그레이션 008을 손으로 쓴다**

`--autogenerate`를 쓰지 않는다. 데이터 이관 순서와 CHECK 제약 생성 시점을 정확히 통제해야 하고, 테이블 삭제가 포함되기 때문이다.

`backend/alembic/versions/008_role_model_and_kakao.py`:

```python
"""role model, organization FK, kakao login, guest submission claim

Revision ID: 008
Revises: 007
"""

import secrets

import sqlalchemy as sa
from alembic import op

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

    op.create_index("ix_users_role", "users", ["role"])
    op.create_index("ix_users_organization_id", "users", ["organization_id"])
    op.create_index("ix_users_kakao_user_id", "users", ["kakao_user_id"], unique=True)
    op.create_foreign_key(
        "fk_users_organization_id",
        "users",
        "organizations",
        ["organization_id"],
        ["id"],
        ondelete="SET NULL",
    )

    # 2. 기존 7계정 분류. 스펙 8.1 표
    adogs_org_id = conn.execute(
        sa.text("SELECT id FROM organizations WHERE slug = 'adogs'")
    ).scalar()

    conn.execute(
        sa.text("UPDATE users SET role = 'admin' WHERE email IN :emails"),
        {"emails": tuple(ADMIN_EMAILS)},
    )
    if adogs_org_id is not None:
        conn.execute(
            sa.text(
                "UPDATE users SET role = 'org', organization_id = :org_id "
                "WHERE email IN :emails"
            ),
            {"org_id": adogs_org_id, "emails": tuple(ORG_EMAILS)},
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

    # 4. CHECK 제약
    with op.batch_alter_table("users") as batch_op:
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

    # 5. guest_ticket_submissions: user_id, lookup_token
    with op.batch_alter_table("guest_ticket_submissions") as batch_op:
        batch_op.add_column(sa.Column("user_id", sa.String(), nullable=True))
        batch_op.add_column(sa.Column("lookup_token", sa.String(), nullable=True))

    op.create_index(
        "ix_guest_submissions_user_id", "guest_ticket_submissions", ["user_id"]
    )
    op.create_index(
        "ix_guest_submissions_lookup_token",
        "guest_ticket_submissions",
        ["lookup_token"],
        unique=True,
    )
    op.create_foreign_key(
        "fk_guest_submissions_user_id",
        "guest_ticket_submissions",
        "users",
        ["user_id"],
        ["id"],
        ondelete="SET NULL",
    )

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

    # 6. admin_users 삭제. role로 대체됐다
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

    # 2. guest_ticket_submissions 되돌리기
    op.drop_constraint(
        "fk_guest_submissions_user_id", "guest_ticket_submissions", type_="foreignkey"
    )
    op.drop_index("ix_guest_submissions_lookup_token", "guest_ticket_submissions")
    op.drop_index("ix_guest_submissions_user_id", "guest_ticket_submissions")
    with op.batch_alter_table("guest_ticket_submissions") as batch_op:
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

    # 5. 컬럼 삭제
    op.drop_constraint("fk_users_organization_id", "users", type_="foreignkey")
    op.drop_index("ix_users_kakao_user_id", "users")
    op.drop_index("ix_users_organization_id", "users")
    op.drop_index("ix_users_role", "users")
    with op.batch_alter_table("users") as batch_op:
        batch_op.drop_column("kakao_user_id")
        batch_op.drop_column("organization_id")
        batch_op.drop_column("role")
```

`downgrade()`가 `role='general'` 계정을 삭제하는 것은 되돌릴 수 없는 손실이다. 되돌리기 전에 카카오 가입자가 있는지 확인해야 한다. 이 사실을 파일 상단 docstring에 적는다.

`sa.text` 안의 `IN :emails` 튜플 바인딩은 SQLAlchemy 2.x에서 `expanding` 파라미터가 필요할 수 있다. 아래 Step 9에서 실패하면 `sa.text(...).bindparams(sa.bindparam("emails", expanding=True))`로 바꾼다.

- [ ] **Step 9: 마이그레이션 왕복 테스트를 쓴다**

`backend/tests/test_migration_008.py` 맨 아래에 추가한다.

```python
def test_migration_008_round_trip(tmp_path):
    """upgrade → downgrade → upgrade가 모두 동작해야 한다.
    프로덕션에서 admin_users를 삭제하는 마이그레이션이므로 복원 가능성을 증명한다."""
    import subprocess
    from pathlib import Path

    backend_dir = Path(__file__).parent.parent
    db_path = tmp_path / "migration_test.db"
    env = {
        **os.environ,
        "DATABASE_URL": f"sqlite:///{db_path}",
        "SECRET_KEY": "test-secret-key",
    }

    def alembic(*args):
        result = subprocess.run(
            ["alembic", *args],
            cwd=backend_dir,
            env=env,
            capture_output=True,
            text=True,
        )
        assert result.returncode == 0, f"alembic {args} failed:\n{result.stderr}"
        return result

    alembic("upgrade", "head")
    alembic("downgrade", "007")
    alembic("upgrade", "head")

    from sqlalchemy import create_engine, inspect

    engine = create_engine(f"sqlite:///{db_path}")
    inspector = inspect(engine)
    columns = {c["name"] for c in inspector.get_columns("users")}
    assert "role" in columns
    assert "organization_id" in columns
    assert "organization" not in columns
    assert "admin_users" not in inspector.get_table_names()
    engine.dispose()
```

- [ ] **Step 10: 왕복 테스트를 실행한다**

```bash
cd backend && python -m pytest tests/test_migration_008.py::test_migration_008_round_trip -v
```

Expected: PASS

실패하면 에러 메시지에 따라 마이그레이션을 고친다. 흔한 원인 두 가지다.

- SQLite에서 `op.drop_constraint(type_="check")`가 지원되지 않는다 → `batch_alter_table`로 감싼다(이미 감쌌다). 그래도 실패하면 SQLite에서 CHECK 제약 이름을 알 수 없는 문제이므로, `downgrade`에서 CHECK 제거를 `if conn.dialect.name != "sqlite"`로 감싼다
- `IN :emails` 바인딩 실패 → Step 8 마지막 문단 참조

- [ ] **Step 11: 전체 테스트와 린트**

```bash
cd backend && python -m pytest tests/ -v && ruff check .
```

Expected: 전부 PASS, 린트 에러 없음

- [ ] **Step 12: 마이그레이션 파일을 사람에게 보여준다**

`docs/backend.md`의 규칙이다. `op.drop_table("admin_users")`와 `downgrade`의 `DELETE FROM users WHERE role = 'general'`이 의도한 것인지 확인받는다. 승인 없이 프로덕션에 적용하지 않는다.

- [ ] **Step 13: 커밋**

```bash
git add backend/models.py backend/schemas.py backend/alembic/versions/008_role_model_and_kakao.py backend/tests/
git commit -m "feat: users.role 3단 역할과 단체 FK 도입, admin_users 테이블 삭제

- role(general/org/admin), organization_id, kakao_user_id 추가
- email/hashed_password를 NULL 허용으로 변경하고 CHECK 제약 3개로 보호
- guest_ticket_submissions에 user_id, lookup_token 추가
- 기존 7계정을 스펙 8.1 표대로 분류"
```

---

## Task 3: 쿠키 인증과 사일런트 리프레시

**Files:**
- Modify: `backend/routers/auth.py:20-33` (설정), `:77-115` (의존성), `:121-190` (엔드포인트)
- Test: `backend/tests/test_auth_cookies.py`

**Interfaces:**
- Consumes: Task 2의 `models.User.role`
- Produces:
  - `auth.ACCESS_COOKIE_NAME = "access_token"`, `auth.REFRESH_COOKIE_NAME = "refresh_token"`
  - `auth.set_access_cookie(response: Response, token: str) -> None`
  - `auth.set_refresh_cookie(response: Response, token: str) -> None`
  - `auth.clear_auth_cookies(response: Response) -> None`
  - `auth.issue_tokens(db: Session, response: Response, user: models.User) -> dict[str, str]` — 쿠키를 설정하고 토큰 dict를 반환한다. Task 5의 카카오 로그인이 재사용한다
  - `get_current_user`가 쿠키 우선, 헤더 대체로 동작하며 access 만료 시 refresh로 자동 갱신

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`backend/tests/test_auth_cookies.py`:

```python
from datetime import datetime, timedelta, timezone

import models
from routers.auth import (
    ACCESS_COOKIE_NAME,
    REFRESH_COOKIE_NAME,
    create_access_token,
)


def _login(client, email, password="pw1234"):
    return client.post(
        "/api/token", data={"username": email, "password": password}
    )


def test_login_sets_httponly_cookies(client, make_user, make_organization):
    org = make_organization()
    user = make_user(role="org", organization_id=org.id, email="a@b.com")

    response = _login(client, user.email)

    assert response.status_code == 200
    assert ACCESS_COOKIE_NAME in response.cookies
    assert REFRESH_COOKIE_NAME in response.cookies
    set_cookie_header = " ".join(response.headers.get_list("set-cookie")).lower()
    assert "httponly" in set_cookie_header
    assert "samesite=lax" in set_cookie_header


def test_jwt_subject_is_user_id_not_email(client, make_user, make_organization):
    """email이 NULL일 수 있으므로 sub는 user.id여야 한다."""
    import jwt as pyjwt
    from routers.auth import ALGORITHM, SECRET_KEY

    org = make_organization()
    user = make_user(role="org", organization_id=org.id, email="a@b.com")

    response = _login(client, user.email)
    token = response.cookies[ACCESS_COOKIE_NAME]
    payload = pyjwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

    assert payload["sub"] == user.id


def test_expired_access_token_is_silently_refreshed(
    client, db_session, make_user, make_organization
):
    """만료된 access + 유효한 refresh면 401이 아니라 200이 오고 새 쿠키가 내려온다."""
    org = make_organization()
    user = make_user(role="org", organization_id=org.id, email="a@b.com")

    refresh_token = "valid-refresh-token"
    db_session.add(
        models.RefreshToken(
            token=refresh_token,
            user_id=user.id,
            expires_at=datetime.now(timezone.utc) + timedelta(days=7),
        )
    )
    db_session.commit()

    expired_access = create_access_token(
        data={"sub": user.id}, expires_delta=timedelta(seconds=-10)
    )
    client.cookies.set(ACCESS_COOKIE_NAME, expired_access)
    client.cookies.set(REFRESH_COOKIE_NAME, refresh_token)

    response = client.get("/api/users/me")

    assert response.status_code == 200
    assert response.json()["id"] == user.id
    assert ACCESS_COOKIE_NAME in response.cookies


def test_expired_refresh_token_returns_401(client, make_user, make_organization):
    org = make_organization()
    user = make_user(role="org", organization_id=org.id, email="a@b.com")

    expired_access = create_access_token(
        data={"sub": user.id}, expires_delta=timedelta(seconds=-10)
    )
    client.cookies.set(ACCESS_COOKIE_NAME, expired_access)
    client.cookies.set(REFRESH_COOKIE_NAME, "no-such-refresh-token")

    response = client.get("/api/users/me")

    assert response.status_code == 401


def test_concurrent_expired_requests_all_succeed(
    client, db_session, make_user, make_organization
):
    """refresh 회전을 껐으므로 같은 refresh로 여러 번 갱신해도 로그아웃되지 않는다."""
    org = make_organization()
    user = make_user(role="org", organization_id=org.id, email="a@b.com")

    refresh_token = "shared-refresh-token"
    db_session.add(
        models.RefreshToken(
            token=refresh_token,
            user_id=user.id,
            expires_at=datetime.now(timezone.utc) + timedelta(days=7),
        )
    )
    db_session.commit()

    expired_access = create_access_token(
        data={"sub": user.id}, expires_delta=timedelta(seconds=-10)
    )

    for _ in range(3):
        client.cookies.set(ACCESS_COOKIE_NAME, expired_access)
        client.cookies.set(REFRESH_COOKIE_NAME, refresh_token)
        response = client.get("/api/users/me")
        assert response.status_code == 200


def test_authorization_header_still_works(client, make_user, make_organization):
    """API 문서 화면 테스트용으로 Bearer 헤더도 계속 받는다."""
    org = make_organization()
    user = make_user(role="org", organization_id=org.id, email="a@b.com")
    token = create_access_token(
        data={"sub": user.id}, expires_delta=timedelta(minutes=5)
    )

    response = client.get(
        "/api/users/me", headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 200


def test_logout_clears_cookies(client, make_user, make_organization):
    org = make_organization()
    user = make_user(role="org", organization_id=org.id, email="a@b.com")
    _login(client, user.email)

    response = client.post("/api/logout")

    assert response.status_code == 204
    set_cookie_header = " ".join(response.headers.get_list("set-cookie"))
    assert ACCESS_COOKIE_NAME in set_cookie_header
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

```bash
cd backend && python -m pytest tests/test_auth_cookies.py -v
```

Expected: 전부 FAIL. `ImportError: cannot import name 'ACCESS_COOKIE_NAME'`

- [ ] **Step 3: 설정과 쿠키 헬퍼를 추가한다**

`backend/routers/auth.py`의 설정 블록(20-24행) 아래에 추가한다.

```python
COOKIE_SECURE = os.environ.get("COOKIE_SECURE", "false").lower() == "true"
ACCESS_COOKIE_NAME = "access_token"
REFRESH_COOKIE_NAME = "refresh_token"
# refresh 쿠키 경로가 /api/auth가 아니라 /api인 이유:
# 사일런트 리프레시가 get_current_user 안에서 일어나므로 모든 /api/* 요청이
# refresh 쿠키를 들고 와야 한다
REFRESH_COOKIE_PATH = "/api"
```

import 블록(8-9행)을 고친다.

```python
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
```

`create_refresh_token`(62-71행) 아래에 헬퍼를 추가한다.

```python
def set_access_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=ACCESS_COOKIE_NAME,
        value=token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite="lax",
        path="/",
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


def set_refresh_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite="lax",
        path=REFRESH_COOKIE_PATH,
        max_age=REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
    )


def clear_auth_cookies(response: Response) -> None:
    response.delete_cookie(ACCESS_COOKIE_NAME, path="/")
    response.delete_cookie(REFRESH_COOKIE_NAME, path=REFRESH_COOKIE_PATH)


def issue_tokens(
    db: Session, response: Response, user: models.User
) -> dict[str, str]:
    """access/refresh를 발급하고 쿠키에 심는다. 본문에도 담아 API 클라이언트를 지원한다."""
    access_token = create_access_token(
        data={"sub": user.id},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    refresh_token = create_refresh_token(db, user.id)
    set_access_cookie(response, access_token)
    set_refresh_cookie(response, refresh_token)
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
    }
```

- [ ] **Step 4: get_current_user를 쿠키 기반 사일런트 리프레시로 바꾼다**

`TokenDep`(32행)을 삭제하고 `oauth2_scheme`(27행)은 남긴다(Swagger UI의 인증 버튼이 이걸 본다).

`get_current_user`(77-100행) 전체를 아래로 바꾼다.

```python
def _extract_access_token(request: Request) -> str | None:
    """쿠키를 먼저 보고, 없으면 Authorization 헤더를 본다."""
    token = request.cookies.get(ACCESS_COOKIE_NAME)
    if token:
        return token
    header = request.headers.get("Authorization")
    if header and header.lower().startswith("bearer "):
        return header[7:]
    return None


def _user_from_refresh_cookie(
    request: Request, response: Response, db: Session
) -> models.User | None:
    """refresh 쿠키를 검증하고 새 access 쿠키를 심는다. 회전하지 않는다."""
    raw_token = request.cookies.get(REFRESH_COOKIE_NAME)
    if not raw_token:
        return None

    db_token = (
        db.query(models.RefreshToken)
        .filter(
            models.RefreshToken.token == raw_token,
            models.RefreshToken.expires_at > datetime.now(timezone.utc),
        )
        .first()
    )
    if not db_token:
        return None

    user = db_token.user
    if user is None:
        return None

    new_access_token = create_access_token(
        data={"sub": user.id},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    set_access_cookie(response, new_access_token)
    return user


def get_current_user(
    request: Request, response: Response, db: DBSession
) -> models.User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    token = _extract_access_token(request)
    user: models.User | None = None

    if token:
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            user_id: str | None = payload.get("sub")
            if user_id:
                user = db.query(models.User).filter(models.User.id == user_id).first()
        except jwt.ExpiredSignatureError:
            # 401을 던지지 않고 refresh로 조용히 갱신한다
            user = _user_from_refresh_cookie(request, response, db)
        except jwt.PyJWTError as err:
            raise credentials_exception from err
    else:
        # access 쿠키가 만료되어 브라우저가 지웠을 수 있다
        user = _user_from_refresh_cookie(request, response, db)

    if user is None:
        raise credentials_exception
    return user
```

- [ ] **Step 5: 로그인·리프레시·로그아웃 엔드포인트를 고친다**

`login_for_access_token`(121-142행)을 바꾼다. `user.hashed_password`가 NULL일 수 있으므로 확인을 추가한다.

```python
@router.post("/token", response_model=schemas.Token)
def login_for_access_token(
    form_data: OAuth2Form, db: DBSession, response: Response
) -> dict[str, str]:
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if (
        not user
        or not user.hashed_password
        or not verify_password(form_data.password, user.hashed_password)
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return issue_tokens(db, response, user)
```

`refresh_access_token`(145-179행)을 바꾼다. 쿠키를 먼저 보고 없으면 본문을 본다. **회전을 제거한다.**

```python
@router.post("/refresh", response_model=schemas.Token)
def refresh_access_token(
    request: Request,
    response: Response,
    db: DBSession,
    refresh_in: schemas.TokenRefresh | None = None,
) -> dict[str, str]:
    raw_token = request.cookies.get(REFRESH_COOKIE_NAME)
    if not raw_token and refresh_in:
        raw_token = refresh_in.refresh_token

    db_token = (
        db.query(models.RefreshToken)
        .filter(
            models.RefreshToken.token == raw_token,
            models.RefreshToken.expires_at > datetime.now(timezone.utc),
        )
        .first()
        if raw_token
        else None
    )

    if not db_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    user = db_token.user
    new_access_token = create_access_token(
        data={"sub": user.id},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    set_access_cookie(response, new_access_token)

    # refresh 회전을 하지 않는다. 동시 요청이 서로의 토큰을 무효화하면
    # 사용자가 로그아웃된다
    return {
        "access_token": new_access_token,
        "refresh_token": db_token.token,
        "token_type": "bearer",
    }
```

`logout`(182-190행)을 바꾼다. 본문 없이도 동작해야 한다.

```python
@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    request: Request,
    response: Response,
    db: DBSession,
    current_user: CurrentUser,
) -> None:
    raw_token = request.cookies.get(REFRESH_COOKIE_NAME)
    if raw_token:
        db.query(models.RefreshToken).filter(
            models.RefreshToken.token == raw_token,
            models.RefreshToken.user_id == current_user.id,
        ).delete()
        db.commit()
    clear_auth_cookies(response)
```

- [ ] **Step 6: 테스트가 통과하는지 확인**

```bash
cd backend && python -m pytest tests/test_auth_cookies.py -v
```

Expected: 7 passed

`test_logout_clears_cookies`가 실패하면 `delete_cookie`가 `Set-Cookie` 헤더를 만드는지 확인한다. FastAPI는 `max-age=0`인 `Set-Cookie`를 보낸다.

- [ ] **Step 7: 전체 테스트와 린트**

```bash
cd backend && python -m pytest tests/ -v && ruff check .
```

Expected: 전부 PASS. `test_permissions.py`는 아직 없다.

- [ ] **Step 8: 커밋**

```bash
git add backend/routers/auth.py backend/tests/test_auth_cookies.py
git commit -m "feat: HttpOnly 쿠키 인증과 사일런트 리프레시

- JWT sub를 email에서 user.id로 변경 (email이 NULL일 수 있음)
- access 만료 시 401 대신 refresh 쿠키로 조용히 재발급
- refresh 회전 제거: 동시 요청이 서로를 무효화해 로그아웃되는 문제
- Authorization 헤더는 API 문서 테스트용으로 계속 지원"
```

---

## Task 4: 권한 의존성과 단체 격리

**Files:**
- Create: `backend/permissions.py`
- Modify: `backend/routers/auth.py:106-115`
- Modify: `backend/routers/guest_submissions.py:135-168`
- Test: `backend/tests/test_permissions.py`

**Interfaces:**
- Consumes: Task 3의 `get_current_user`
- Produces:
  - `auth.get_current_admin_user` — 판정이 `role == "admin"`으로 교체됨
  - `auth.get_current_org_user`, `auth.OrgUser` — `role`이 `org` 또는 `admin`
  - `auth.get_optional_user`, `auth.OptionalUser` — 로그인 없이 통과, `models.User | None`
  - `permissions.scope_to_org(query, user, model)` — 단체 격리 필터를 적용한 query 반환

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`backend/tests/test_permissions.py`:

```python
import models


def _login(client, email, password="pw1234"):
    return client.post("/api/token", data={"username": email, "password": password})


def _make_submission(db_session, organization_id, token):
    submission = models.GuestTicketSubmission(
        phone="01011112222",
        verification_method="reservation_number",
        organization_id=organization_id,
        lookup_token=token,
    )
    db_session.add(submission)
    db_session.commit()
    db_session.refresh(submission)
    return submission


def test_general_user_cannot_list_submissions(client, make_user):
    user = make_user(role="general")
    from routers.auth import ACCESS_COOKIE_NAME, create_access_token
    from datetime import timedelta

    client.cookies.set(
        ACCESS_COOKIE_NAME,
        create_access_token(data={"sub": user.id}, expires_delta=timedelta(minutes=5)),
    )

    response = client.get("/api/guest-submissions")

    assert response.status_code == 403


def test_org_user_cannot_create_users(client, make_user, make_organization):
    org = make_organization()
    user = make_user(role="org", organization_id=org.id, email="org@b.com")
    _login(client, user.email)

    response = client.post(
        "/api/users",
        json={
            "email": "new@b.com",
            "name": "신규",
            "password": "pw1234",
            "organization_id": org.id,
        },
    )

    assert response.status_code == 403


def test_admin_can_list_users(client, make_user):
    admin = make_user(role="admin", email="admin@b.com")
    _login(client, admin.email)

    response = client.get("/api/users")

    assert response.status_code == 200


def test_org_user_sees_only_own_organization_submissions(
    client, db_session, make_user, make_organization
):
    org_a = make_organization(name="단체A", slug="a")
    org_b = make_organization(name="단체B", slug="b")
    mine = _make_submission(db_session, org_a.id, "token-a")
    _make_submission(db_session, org_b.id, "token-b")

    user = make_user(role="org", organization_id=org_a.id, email="a@b.com")
    _login(client, user.email)

    response = client.get("/api/guest-submissions")

    assert response.status_code == 200
    ids = [item["id"] for item in response.json()]
    assert ids == [mine.id]


def test_org_user_cannot_read_other_organization_submission_image(
    client, db_session, make_user, make_organization
):
    org_a = make_organization(name="단체A", slug="a")
    org_b = make_organization(name="단체B", slug="b")
    other = _make_submission(db_session, org_b.id, "token-b")
    other.eticket_object_key = "some-object.png"
    db_session.commit()

    user = make_user(role="org", organization_id=org_a.id, email="a@b.com")
    _login(client, user.email)

    response = client.get(f"/api/guest-submissions/{other.id}/image")

    assert response.status_code == 404


def test_admin_sees_all_organizations_submissions(
    client, db_session, make_user, make_organization
):
    org_a = make_organization(name="단체A", slug="a")
    org_b = make_organization(name="단체B", slug="b")
    _make_submission(db_session, org_a.id, "token-a")
    _make_submission(db_session, org_b.id, "token-b")

    admin = make_user(role="admin", email="admin@b.com")
    _login(client, admin.email)

    response = client.get("/api/guest-submissions")

    assert response.status_code == 200
    assert len(response.json()) == 2
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

```bash
cd backend && python -m pytest tests/test_permissions.py -v
```

Expected: `test_general_user_cannot_list_submissions`가 500 또는 403이 아닌 결과로 FAIL. `admin_info`가 없어 `AttributeError`.

- [ ] **Step 3: auth.py의 의존성을 고친다**

`get_current_admin_user`(106-115행)를 아래로 바꾼다.

```python
def get_current_admin_user(current_user: CurrentUser) -> models.User:
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The user does not have admin privileges",
        )
    return current_user


AdminUser = Annotated[models.User, Depends(get_current_admin_user)]


def get_current_org_user(current_user: CurrentUser) -> models.User:
    if current_user.role not in ("org", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="단체 계정만 접근할 수 있습니다.",
        )
    return current_user


OrgUser = Annotated[models.User, Depends(get_current_org_user)]


def get_optional_user(
    request: Request, response: Response, db: DBSession
) -> models.User | None:
    """로그인하지 않아도 통과한다. 공개 화면에서 쓴다."""
    try:
        return get_current_user(request, response, db)
    except HTTPException:
        return None


OptionalUser = Annotated[models.User | None, Depends(get_optional_user)]
```

- [ ] **Step 4: permissions.py를 만든다**

```python
"""단체 격리 규칙을 한 곳에 모은다.

스펙 결정: 티켓·강아지 리스트·일정은 모든 단체가 공유하고,
제출 서류·전화번호·e티켓은 지정된 자기 단체만 본다.
정책이 바뀌면 이 파일만 고친다.
"""

from typing import Any

from sqlalchemy.orm import Query

import models


def scope_to_org(query: Query, user: models.User | None, model: Any) -> Query:
    """model의 organization_id를 기준으로 조회 범위를 좁힌다.

    admin은 전체, org는 자기 단체만, 그 외는 빈 결과.
    """
    if user is not None and user.role == "admin":
        return query
    if user is not None and user.role == "org" and user.organization_id is not None:
        return query.filter(model.organization_id == user.organization_id)
    return query.filter(False)
```

`query.filter(False)`는 SQLAlchemy에서 항상 거짓인 조건을 만들어 빈 결과를 낸다. `sqlalchemy.false()`를 쓰는 것이 명시적이므로, 린트가 지적하면 `from sqlalchemy import false` 후 `query.filter(false())`로 바꾼다.

- [ ] **Step 5: guest_submissions.py에 적용한다**

import(22행)를 고친다.

```python
from permissions import scope_to_org
from routers.auth import AdminUser, CurrentUser, OrgUser
```

`list_guest_submissions`(135-146행)를 바꾼다.

```python
@router.get("", response_model=list[schemas.GuestTicketSubmission])
def list_guest_submissions(
    db: DBSession,
    current_user: OrgUser,
    submission_status: schemas.GuestSubmissionStatus | None = None,
) -> list[models.GuestTicketSubmission]:
    query = db.query(models.GuestTicketSubmission).options(
        joinedload(models.GuestTicketSubmission.organization)
    )
    query = scope_to_org(query, current_user, models.GuestTicketSubmission)
    if submission_status:
        query = query.filter(
            models.GuestTicketSubmission.status == submission_status.value
        )
    return query.order_by(models.GuestTicketSubmission.submitted_at.desc()).all()
```

`get_guest_submission_image`(149-168행)를 바꾼다.

```python
@router.get("/{submission_id}/image")
def get_guest_submission_image(
    submission_id: str, db: DBSession, current_user: OrgUser
) -> Response:
    query = db.query(models.GuestTicketSubmission).filter(
        models.GuestTicketSubmission.id == submission_id
    )
    submission = scope_to_org(
        query, current_user, models.GuestTicketSubmission
    ).first()
    if not submission or not submission.eticket_object_key:
        raise HTTPException(status_code=404, detail="이미지를 찾을 수 없습니다.")

    try:
        content, content_type = storage_service.get_object(
            submission.eticket_object_key
        )
    except Exception as e:
        raise HTTPException(
            status_code=404, detail="이미지를 찾을 수 없습니다."
        ) from e

    return Response(content=content, media_type=content_type)
```

`approve_guest_submission`과 `reject_guest_submission`은 `AdminUser`를 그대로 유지한다. 승인·거절은 운영자 권한이다.

- [ ] **Step 6: 테스트가 통과하는지 확인**

```bash
cd backend && python -m pytest tests/test_permissions.py -v
```

Expected: 6 passed

- [ ] **Step 7: 전체 테스트와 린트**

```bash
cd backend && python -m pytest tests/ -v && ruff check .
```

Expected: 전부 PASS

- [ ] **Step 8: 커밋**

```bash
git add backend/permissions.py backend/routers/auth.py backend/routers/guest_submissions.py backend/tests/test_permissions.py
git commit -m "feat: 역할 기반 의존성 4개와 scope_to_org 단체 격리

- admin 판정을 admin_info.approved에서 role == 'admin'으로 교체
- OrgUser, OptionalUser 추가
- 제출 목록·이미지에 단체 격리 적용. 티켓·강아지 리스트는 공유 유지"
```

---

## Task 5: 카카오 로그인

**Files:**
- Create: `backend/services/kakao_service.py`
- Modify: `backend/routers/auth.py` (엔드포인트 2개 추가), `backend/schemas.py` (요청 스키마)
- Test: `backend/tests/test_kakao_login.py`

**Interfaces:**
- Consumes: Task 3의 `issue_tokens`
- Produces:
  - `kakao_service.build_authorize_url(state: str) -> str`
  - `kakao_service.exchange_code_for_profile(code: str) -> KakaoProfile` — `KakaoProfile`은 `id: str`, `nickname: str | None`, `email: str | None`을 가진 dataclass
  - `GET /api/auth/kakao/login-url` → `{"authorize_url": str}`
  - `POST /api/auth/kakao` (body: `{"code": str, "state": str}`) → `schemas.Token`, 쿠키 설정

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`backend/tests/test_kakao_login.py`:

```python
import pytest

import models
from routers.auth import ACCESS_COOKIE_NAME
from services import kakao_service


@pytest.fixture(autouse=True)
def kakao_env(monkeypatch):
    monkeypatch.setattr(kakao_service, "KAKAO_REST_API_KEY", "test-rest-key")
    monkeypatch.setattr(
        kakao_service,
        "KAKAO_REDIRECT_URI",
        "https://adogs-ticket.shop/auth/kakao/callback",
    )


def test_login_url_contains_state_and_redirect(client):
    response = client.get("/api/auth/kakao/login-url")

    assert response.status_code == 200
    url = response.json()["authorize_url"]
    assert url.startswith("https://kauth.kakao.com/oauth/authorize")
    assert "client_id=test-rest-key" in url
    assert "state=" in url


def test_kakao_login_creates_general_user(client, db_session, monkeypatch):
    state = client.get("/api/auth/kakao/login-url").json()["state"]

    def fake_exchange(code):
        assert code == "auth-code-123"
        return kakao_service.KakaoProfile(
            id="kakao-98765", nickname="봉사자", email=None
        )

    monkeypatch.setattr(kakao_service, "exchange_code_for_profile", fake_exchange)

    response = client.post(
        "/api/auth/kakao", json={"code": "auth-code-123", "state": state}
    )

    assert response.status_code == 200
    assert ACCESS_COOKIE_NAME in response.cookies

    user = (
        db_session.query(models.User)
        .filter(models.User.kakao_user_id == "kakao-98765")
        .first()
    )
    assert user is not None
    assert user.role == "general"
    assert user.name == "봉사자"
    assert user.email is None


def test_kakao_login_reuses_existing_user(client, db_session, make_user, monkeypatch):
    existing = make_user(role="general", kakao_user_id="kakao-98765")
    state = client.get("/api/auth/kakao/login-url").json()["state"]

    monkeypatch.setattr(
        kakao_service,
        "exchange_code_for_profile",
        lambda code: kakao_service.KakaoProfile(
            id="kakao-98765", nickname="봉사자", email=None
        ),
    )

    response = client.post(
        "/api/auth/kakao", json={"code": "auth-code-123", "state": state}
    )

    assert response.status_code == 200
    count = (
        db_session.query(models.User)
        .filter(models.User.kakao_user_id == "kakao-98765")
        .count()
    )
    assert count == 1


def test_kakao_login_rejects_invalid_state(client, monkeypatch):
    monkeypatch.setattr(
        kakao_service,
        "exchange_code_for_profile",
        lambda code: kakao_service.KakaoProfile(id="x", nickname="y", email=None),
    )

    response = client.post(
        "/api/auth/kakao", json={"code": "auth-code-123", "state": "forged-state"}
    )

    assert response.status_code == 400


def test_kakao_login_does_not_merge_with_existing_email_account(
    client, db_session, make_user, make_organization, monkeypatch
):
    """카카오 이메일이 기존 단체 계정과 같아도 합치지 않는다.
    검증되지 않은 이메일로 남의 계정을 가져갈 길을 막는다."""
    org = make_organization()
    org_user = make_user(
        role="org", organization_id=org.id, email="shared@example.com"
    )
    state = client.get("/api/auth/kakao/login-url").json()["state"]

    monkeypatch.setattr(
        kakao_service,
        "exchange_code_for_profile",
        lambda code: kakao_service.KakaoProfile(
            id="kakao-new", nickname="동일이메일", email="shared@example.com"
        ),
    )

    response = client.post(
        "/api/auth/kakao", json={"code": "auth-code-123", "state": state}
    )

    assert response.status_code == 200
    new_user = (
        db_session.query(models.User)
        .filter(models.User.kakao_user_id == "kakao-new")
        .first()
    )
    assert new_user is not None
    assert new_user.id != org_user.id
    # email unique 제약과 충돌하지 않도록 카카오 계정에는 이메일을 넣지 않는다
    assert new_user.email is None


def test_kakao_api_failure_returns_502(client, monkeypatch):
    state = client.get("/api/auth/kakao/login-url").json()["state"]

    def failing_exchange(code):
        raise kakao_service.KakaoAPIError("token exchange failed")

    monkeypatch.setattr(kakao_service, "exchange_code_for_profile", failing_exchange)

    response = client.post(
        "/api/auth/kakao", json={"code": "auth-code-123", "state": state}
    )

    assert response.status_code == 502
```

`login-url` 응답에 `state`도 포함해야 테스트가 이를 재사용할 수 있다. 프론트도 콜백에서 되돌려 보내려면 `state`를 알아야 하는데, 카카오가 쿼리스트링으로 돌려주므로 프론트가 별도 보관할 필요는 없다. 응답에 담는 것은 테스트와 디버깅 편의를 위한 것이다.

- [ ] **Step 2: 테스트가 실패하는지 확인**

```bash
cd backend && python -m pytest tests/test_kakao_login.py -v
```

Expected: 전부 FAIL. `ModuleNotFoundError: No module named 'services.kakao_service'`

- [ ] **Step 3: kakao_service.py를 만든다**

```python
"""카카오 로그인 HTTP 통신을 이 모듈에 격리한다.

라우터가 직접 requests를 호출하지 않게 해서 테스트에서 목으로 대체할 수 있다.
카카오 액세스 토큰은 저장하지 않는다. 로그인 확인에만 쓰고 버린다.
"""

import os
from dataclasses import dataclass
from urllib.parse import urlencode

import requests

KAKAO_REST_API_KEY = os.environ.get("KAKAO_REST_API_KEY", "")
KAKAO_CLIENT_SECRET = os.environ.get("KAKAO_CLIENT_SECRET", "")
KAKAO_REDIRECT_URI = os.environ.get("KAKAO_REDIRECT_URI", "")

AUTHORIZE_URL = "https://kauth.kakao.com/oauth/authorize"
TOKEN_URL = "https://kauth.kakao.com/oauth/token"
PROFILE_URL = "https://kapi.kakao.com/v2/user/me"
REQUEST_TIMEOUT_SECONDS = 10


class KakaoAPIError(Exception):
    """카카오 API 통신 실패."""


@dataclass
class KakaoProfile:
    id: str
    nickname: str | None
    email: str | None


def build_authorize_url(state: str) -> str:
    params = {
        "client_id": KAKAO_REST_API_KEY,
        "redirect_uri": KAKAO_REDIRECT_URI,
        "response_type": "code",
        "state": state,
    }
    return f"{AUTHORIZE_URL}?{urlencode(params)}"


def exchange_code_for_profile(code: str) -> KakaoProfile:
    payload = {
        "grant_type": "authorization_code",
        "client_id": KAKAO_REST_API_KEY,
        "redirect_uri": KAKAO_REDIRECT_URI,
        "code": code,
    }
    if KAKAO_CLIENT_SECRET:
        payload["client_secret"] = KAKAO_CLIENT_SECRET

    try:
        token_response = requests.post(
            TOKEN_URL, data=payload, timeout=REQUEST_TIMEOUT_SECONDS
        )
    except requests.RequestException as err:
        raise KakaoAPIError("카카오 토큰 요청에 실패했습니다.") from err

    if token_response.status_code != 200:
        raise KakaoAPIError(
            f"카카오 토큰 교환 실패: {token_response.status_code}"
        )

    access_token = token_response.json().get("access_token")
    if not access_token:
        raise KakaoAPIError("카카오 응답에 access_token이 없습니다.")

    try:
        profile_response = requests.get(
            PROFILE_URL,
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=REQUEST_TIMEOUT_SECONDS,
        )
    except requests.RequestException as err:
        raise KakaoAPIError("카카오 사용자 정보 요청에 실패했습니다.") from err

    if profile_response.status_code != 200:
        raise KakaoAPIError(
            f"카카오 사용자 정보 조회 실패: {profile_response.status_code}"
        )

    body = profile_response.json()
    kakao_id = body.get("id")
    if kakao_id is None:
        raise KakaoAPIError("카카오 응답에 id가 없습니다.")

    account = body.get("kakao_account") or {}
    profile = account.get("profile") or {}

    return KakaoProfile(
        id=str(kakao_id),
        nickname=profile.get("nickname"),
        email=account.get("email"),
    )
```

- [ ] **Step 4: 요청 스키마를 추가한다**

`backend/schemas.py`의 `TokenRefresh`(241-242행) 아래에 추가한다.

```python
class KakaoLoginRequest(BaseModel):
    code: str
    state: str
```

- [ ] **Step 5: 엔드포인트 2개를 추가한다**

`backend/routers/auth.py`의 `logout` 아래에 추가한다. import에 `kakao_service`를 더한다.

```python
from services import kakao_service
```

```python
# ======================================================================================
# Kakao Login
# ======================================================================================
KAKAO_STATE_EXPIRE_MINUTES = 10


def _create_kakao_state() -> str:
    """docs/security.md 규칙: OAuth state는 서명된 단기 JWT."""
    return jwt.encode(
        {
            "purpose": "kakao_login",
            "nonce": secrets.token_urlsafe(16),
            "exp": datetime.now(timezone.utc)
            + timedelta(minutes=KAKAO_STATE_EXPIRE_MINUTES),
        },
        SECRET_KEY,
        algorithm=ALGORITHM,
    )


def _verify_kakao_state(state: str) -> None:
    try:
        payload = jwt.decode(state, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.PyJWTError as err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="잘못된 인증 요청입니다. 다시 시도해주세요.",
        ) from err
    if payload.get("purpose") != "kakao_login":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="잘못된 인증 요청입니다. 다시 시도해주세요.",
        )


@router.get("/auth/kakao/login-url")
def kakao_login_url() -> dict[str, str]:
    state = _create_kakao_state()
    return {"authorize_url": kakao_service.build_authorize_url(state), "state": state}


@router.post("/auth/kakao", response_model=schemas.Token)
def kakao_login(
    login_in: schemas.KakaoLoginRequest, db: DBSession, response: Response
) -> dict[str, str]:
    _verify_kakao_state(login_in.state)

    try:
        profile = kakao_service.exchange_code_for_profile(login_in.code)
    except kakao_service.KakaoAPIError as err:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="카카오 로그인에 실패했습니다. 잠시 후 다시 시도해주세요.",
        ) from err

    user = (
        db.query(models.User)
        .filter(models.User.kakao_user_id == profile.id)
        .first()
    )
    if user is None:
        # 카카오 이메일로 기존 계정과 병합하지 않는다. 검증되지 않은 이메일로
        # 남의 단체 계정을 가져갈 길을 막는다. email은 비워 둔다
        user = models.User(
            name=profile.nickname or "봉사자",
            role="general",
            kakao_user_id=profile.id,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    return issue_tokens(db, response, user)
```

`kakao_login`이 `kakao_service.exchange_code_for_profile`을 모듈 속성으로 호출하므로, 테스트의 `monkeypatch.setattr(kakao_service, ...)`이 실제로 적용된다. `from services.kakao_service import exchange_code_for_profile`로 import하면 목이 걸리지 않는다.

- [ ] **Step 6: 테스트가 통과하는지 확인**

```bash
cd backend && python -m pytest tests/test_kakao_login.py -v
```

Expected: 7 passed

- [ ] **Step 7: 전체 테스트와 린트**

```bash
cd backend && python -m pytest tests/ -v && ruff check .
```

Expected: 전부 PASS

- [ ] **Step 8: 커밋**

```bash
git add backend/services/kakao_service.py backend/routers/auth.py backend/schemas.py backend/tests/test_kakao_login.py
git commit -m "feat: 카카오 로그인

- 프론트가 code를 한 번 넘기면 백엔드가 state 검증부터 토큰 발급까지 처리
- state는 서명된 단기 JWT (docs/security.md)
- 카카오 액세스 토큰은 저장하지 않는다
- 카카오 이메일로 기존 계정과 병합하지 않는다"
```

---

## Task 6: 클레임 엔드포인트

**Files:**
- Modify: `backend/routers/guest_submissions.py` (엔드포인트 추가), `backend/schemas.py`
- Test: `backend/tests/test_claim.py`

**Interfaces:**
- Consumes: Task 2의 `models.GuestTicketSubmission.lookup_token`·`user_id`, Task 3의 `CurrentUser`
- Produces: `POST /api/guest-submissions/{submission_id}/claim` (body: `{"lookup_token": str}`) → `schemas.GuestTicketSubmission`

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`backend/tests/test_claim.py`:

```python
from datetime import timedelta

import models
from routers.auth import ACCESS_COOKIE_NAME, create_access_token


def _authenticate(client, user):
    client.cookies.set(
        ACCESS_COOKIE_NAME,
        create_access_token(data={"sub": user.id}, expires_delta=timedelta(minutes=5)),
    )


def _make_submission(db_session, token="lookup-token-1", user_id=None):
    submission = models.GuestTicketSubmission(
        phone="01011112222",
        verification_method="reservation_number",
        lookup_token=token,
        user_id=user_id,
    )
    db_session.add(submission)
    db_session.commit()
    db_session.refresh(submission)
    return submission


def test_claim_assigns_submission_to_user(client, db_session, make_user):
    submission = _make_submission(db_session)
    user = make_user(role="general")
    _authenticate(client, user)

    response = client.post(
        f"/api/guest-submissions/{submission.id}/claim",
        json={"lookup_token": "lookup-token-1"},
    )

    assert response.status_code == 200
    db_session.refresh(submission)
    assert submission.user_id == user.id


def test_claim_twice_returns_409(client, db_session, make_user):
    owner = make_user(role="general")
    submission = _make_submission(db_session, user_id=owner.id)
    other = make_user(role="general")
    _authenticate(client, other)

    response = client.post(
        f"/api/guest-submissions/{submission.id}/claim",
        json={"lookup_token": "lookup-token-1"},
    )

    assert response.status_code == 409


def test_claim_with_wrong_token_returns_404(client, db_session, make_user):
    submission = _make_submission(db_session)
    user = make_user(role="general")
    _authenticate(client, user)

    response = client.post(
        f"/api/guest-submissions/{submission.id}/claim",
        json={"lookup_token": "wrong-token"},
    )

    assert response.status_code == 404


def test_claim_requires_login(client, db_session):
    submission = _make_submission(db_session)

    response = client.post(
        f"/api/guest-submissions/{submission.id}/claim",
        json={"lookup_token": "lookup-token-1"},
    )

    assert response.status_code == 401
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

```bash
cd backend && python -m pytest tests/test_claim.py -v
```

Expected: 전부 404 (라우트 없음)로 FAIL

- [ ] **Step 3: 요청 스키마를 추가한다**

`backend/schemas.py`의 게스트 제출 스키마 근처에 추가한다.

```python
class GuestSubmissionClaim(BaseModel):
    lookup_token: str
```

- [ ] **Step 4: 엔드포인트를 추가한다**

`backend/routers/guest_submissions.py` 맨 아래에 추가한다.

```python
@router.post(
    "/{submission_id}/claim", response_model=schemas.GuestTicketSubmission
)
def claim_guest_submission(
    submission_id: str,
    claim_in: schemas.GuestSubmissionClaim,
    db: DBSession,
    current_user: CurrentUser,
) -> models.GuestTicketSubmission:
    """조회링크에서 본인이 눌러 자기 계정에 담는다.

    lookup_token 불일치는 404로 답한다. 제출이 존재하는지조차 알려주지 않는다.
    """
    submission = (
        db.query(models.GuestTicketSubmission)
        .filter(
            models.GuestTicketSubmission.id == submission_id,
            models.GuestTicketSubmission.lookup_token == claim_in.lookup_token,
        )
        .first()
    )
    if not submission:
        raise HTTPException(status_code=404, detail="제출 내역을 찾을 수 없습니다.")

    if submission.user_id is not None:
        if submission.user_id == current_user.id:
            return submission
        raise HTTPException(
            status_code=409, detail="이미 다른 계정에 등록된 제출 내역입니다."
        )

    submission.user_id = current_user.id
    db.commit()
    db.refresh(submission)
    return submission
```

같은 사용자가 다시 누르면 409가 아니라 성공으로 답한다. 링크를 두 번 누르는 것은 사용자의 실수가 아니다.

- [ ] **Step 5: 테스트가 통과하는지 확인**

```bash
cd backend && python -m pytest tests/test_claim.py -v
```

Expected: 4 passed

- [ ] **Step 6: 제출 생성 시 lookup_token을 발급한다**

`create_guest_submission`(108-118행)의 `models.GuestTicketSubmission(...)` 호출에 한 줄을 추가한다. 파일 상단 import에 `secrets`를 더한다.

```python
        organization_id=organization_id,
        lookup_token=secrets.token_urlsafe(24),
```

- [ ] **Step 7: 응답 스키마에 lookup_token을 노출한다**

`schemas.GuestTicketSubmission`에 `lookup_token: str`과 `user_id: str | None = None`을 추가한다. 제출 직후 프론트가 조회링크를 만들 수 있어야 한다.

관리자 목록 응답에도 토큰이 실리는 점은 감수한다. 관리자는 어차피 제출 상세를 볼 권한이 있다.

- [ ] **Step 8: 전체 테스트와 린트**

```bash
cd backend && python -m pytest tests/ -v && ruff check .
```

Expected: 전부 PASS

- [ ] **Step 9: 커밋**

```bash
git add backend/routers/guest_submissions.py backend/schemas.py backend/tests/test_claim.py
git commit -m "feat: 익명 제출을 계정에 담는 클레임 엔드포인트

lookup_token 불일치는 404로 답해 제출 존재 여부를 숨긴다.
같은 사용자의 재시도는 성공으로 처리한다."
```

---

## Task 7: 회원 생성·조회 API 갱신

**Files:**
- Modify: `backend/routers/auth.py:206-265`
- Test: `backend/tests/test_permissions.py` (추가)

**Interfaces:**
- Consumes: Task 2의 `schemas.UserCreate`(`organization_id`, `role` 포함)
- Produces: `POST /api/users`가 `role`과 `organization_id`를 받아 계정을 만든다

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`backend/tests/test_permissions.py` 맨 아래에 추가한다.

```python
def test_admin_creates_org_user_with_organization(
    client, db_session, make_user, make_organization
):
    org = make_organization()
    admin = make_user(role="admin", email="admin@b.com")
    _login(client, admin.email)

    response = client.post(
        "/api/users",
        json={
            "email": "neworg@b.com",
            "name": "새단체담당",
            "password": "pw1234",
            "organization_id": org.id,
            "role": "org",
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["role"] == "org"
    assert body["organization_id"] == org.id


def test_admin_creates_admin_user_without_organization(
    client, db_session, make_user, make_organization
):
    org = make_organization()
    admin = make_user(role="admin", email="admin@b.com")
    _login(client, admin.email)

    response = client.post(
        "/api/users",
        json={
            "email": "newadmin@b.com",
            "name": "새관리자",
            "password": "pw1234",
            "organization_id": org.id,
            "role": "admin",
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["role"] == "admin"
    assert body["organization_id"] is None


def test_create_user_rejects_unknown_organization(client, make_user):
    admin = make_user(role="admin", email="admin@b.com")
    _login(client, admin.email)

    response = client.post(
        "/api/users",
        json={
            "email": "x@b.com",
            "name": "x",
            "password": "pw1234",
            "organization_id": 99999,
            "role": "org",
        },
    )

    assert response.status_code == 404


def test_create_user_rejects_general_role(client, make_user):
    """general 계정은 카카오 로그인으로만 만들어진다."""
    admin = make_user(role="admin", email="admin@b.com")
    _login(client, admin.email)

    response = client.post(
        "/api/users",
        json={
            "email": "x@b.com",
            "name": "x",
            "password": "pw1234",
            "organization_id": 1,
            "role": "general",
        },
    )

    assert response.status_code == 400
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

```bash
cd backend && python -m pytest tests/test_permissions.py -v
```

Expected: 새 테스트 4개 FAIL

- [ ] **Step 3: create_user_by_admin을 고친다**

`backend/routers/auth.py:206-265`를 바꾼다. `organization` 문자열 저장과 단체 find-or-create 로직(220행, 226-236행)을 제거하고, 중복된 `return db_user`(265행)도 지운다.

```python
@router.post("/users", response_model=schemas.User, status_code=status.HTTP_201_CREATED)
def create_user_by_admin(
    user_in: schemas.UserCreate,
    db: DBSession,
    admin_user: AdminUser,
) -> models.User:
    if user_in.role not in ("org", "admin"):
        raise HTTPException(
            status_code=400,
            detail="관리자는 단체 또는 관리자 계정만 만들 수 있습니다. "
            "일반 사용자는 카카오 로그인으로 가입합니다.",
        )

    if db.query(models.User).filter(models.User.email == user_in.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    organization_id = None
    if user_in.role == "org":
        organization = (
            db.query(models.Organization)
            .filter(models.Organization.id == user_in.organization_id)
            .first()
        )
        if not organization:
            raise HTTPException(status_code=404, detail="단체를 찾을 수 없습니다.")
        organization_id = organization.id

    db_user = models.User(
        email=user_in.email,
        name=user_in.name,
        hashed_password=get_password_hash(user_in.password),
        role=user_in.role,
        organization_id=organization_id,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    # 이메일 템플릿 파일 읽기
    from pathlib import Path
    import string

    template_path = (
        Path(__file__).parent.parent / "templates" / "email" / "account_created.html"
    )

    try:
        with open(template_path, "r", encoding="utf-8") as f:
            template_content = f.read()

        # CSS 중괄호({})와 충돌을 피하기 위해 Template ($변수) 방식 사용
        t = string.Template(template_content)
        body = t.safe_substitute(
            base_url=BASE_URL,
            name=user_in.name,
            email=user_in.email,
            password=user_in.password,
        )
    except Exception as e:
        print(f"Failed to load email template: {e}")
        body = (
            f"안녕하세요 {user_in.name}님, 계정이 생성되었습니다. "
            f"ID: {user_in.email}, PW: {user_in.password}"
        )

    subject = "해봉티켓 계정이 생성되었습니다."
    send_email(receiver_email=user_in.email, subject=subject, body=body)

    return db_user
```

테스트에서 `send_email`이 실제 SMTP를 호출하지 않도록, `conftest.py`에 자동 목을 추가한다.

```python
@pytest.fixture(autouse=True)
def no_smtp(monkeypatch):
    """테스트가 실제 메일을 보내지 않게 한다."""
    import routers.auth

    monkeypatch.setattr(routers.auth, "send_email", lambda **kwargs: None)
```

- [ ] **Step 4: 테스트가 통과하는지 확인**

```bash
cd backend && python -m pytest tests/test_permissions.py -v
```

Expected: 10 passed

- [ ] **Step 5: 전체 테스트와 린트**

```bash
cd backend && python -m pytest tests/ -v && ruff check .
```

Expected: 전부 PASS

- [ ] **Step 6: 커밋**

```bash
git add backend/routers/auth.py backend/tests/
git commit -m "feat: 회원 생성 API가 role과 organization_id를 받는다

- organization 자유 문자열 저장과 find-or-create 제거
- general 역할은 카카오 로그인으로만 생성되므로 거부
- 중복된 return 문 정리"
```

---

## Task 8: 프론트엔드 인증 전환

프론트에는 테스트 도구가 없다. vitest와 React Testing Library를 도입하는 것은 이 작업의 범위를 넘으므로, 이 태스크는 **명시적 수동 검증 절차**로 확인한다.

**Files:**
- Modify: `frontend/src/utils/api.js`
- Modify: `frontend/src/contexts/AuthContext.jsx`
- Modify: `frontend/src/App.jsx`, `frontend/src/pages/LoginScreen.jsx`
- Modify: `frontend/src/components/layout/Header.jsx:42`, `frontend/src/components/layout/Sidebar.jsx:34`
- Modify: `frontend/src/components/modals/NeedPostDetailModal.jsx:11`, `frontend/src/components/modals/TicketDetailModal.jsx:15`
- Modify: `frontend/src/pages/AdminView.jsx:119`
- Create: `frontend/src/pages/KakaoCallback.jsx`

**Interfaces:**
- Consumes: Task 3의 쿠키, Task 5의 `GET /api/auth/kakao/login-url`·`POST /api/auth/kakao`
- Produces: `AuthContext`가 `{ user, login, loginWithKakao, logout, loading, ... }`를 제공. `user.role`로 권한을 판정한다

- [ ] **Step 1: api.js를 고친다**

전체를 아래로 바꾼다. 요청 인터셉터를 지우고 `withCredentials`를 켠다.

```javascript
import axios from 'axios';

const apiClient = axios.create({
    baseURL: '/api',
    // 토큰은 HttpOnly 쿠키로 오간다. 자바스크립트가 토큰을 다루지 않는다
    withCredentials: true
});

// Google Drive Sync API
export const gdriveApi = {
    getStatus: () => apiClient.get('/gdrive/status'),
    connect: () => apiClient.get('/gdrive/connect'),
    disconnect: () => apiClient.delete('/gdrive/disconnect'),
    setupFolder: (folderName, autoCreate = true) =>
        apiClient.post(`/gdrive/setup-folder?folder_name=${encodeURIComponent(folderName)}&auto_create=${autoCreate}`),
    listFolders: () => apiClient.get('/gdrive/folders'),
    setFolder: (folderId) => apiClient.post(`/gdrive/set-folder?folder_id=${folderId}`),
};

export default apiClient;
```

- [ ] **Step 2: AuthContext.jsx를 고친다**

`useState` 초기값(8-13행)의 mock에 `role`을 넣고, localStorage를 쓰는 부분(51-63행, 66-91행)을 바꾼다.

```javascript
    const [user, setUser] = useState(import.meta.env.DEV ? {
        id: "dev-user-id",
        name: "개발용 관리자",
        email: "dev@example.com",
        role: "admin"
    } : null);
```

`useEffect`(45-64행)의 localStorage 분기를 없앤다. 쿠키는 자바스크립트가 읽을 수 없으므로, 로그인 상태는 `/users/me` 호출로만 판단한다.

```javascript
    useEffect(() => {
        fetchStaticData();

        if (import.meta.env.DEV) return;

        // 토큰이 HttpOnly 쿠키에 있어 JS가 확인할 수 없다.
        // /users/me 성공 여부로 로그인 상태를 판단한다
        apiClient.get('/users/me')
            .then(response => setUser(response.data))
            .catch(() => setUser(null))
            .finally(() => setLoading(false));
    }, [fetchStaticData]);
```

`login`, `logout`을 바꾸고 `loginWithKakao`를 더한다.

```javascript
    const login = async (email, password) => {
        await apiClient.post('/token', new URLSearchParams({
            username: email,
            password: password
        }));
        // 쿠키가 심어졌다. 사용자 정보를 새로 읽는다
        const userResponse = await apiClient.get('/users/me');
        setUser(userResponse.data);
    };

    const startKakaoLogin = async () => {
        const response = await apiClient.get('/auth/kakao/login-url');
        window.location.href = response.data.authorize_url;
    };

    const completeKakaoLogin = async (code, state) => {
        await apiClient.post('/auth/kakao', { code, state });
        const userResponse = await apiClient.get('/users/me');
        setUser(userResponse.data);
    };

    const logout = async () => {
        try {
            await apiClient.post('/logout');
        } catch (e) {
            console.error("Logout from server failed", e);
        }
        setUser(null);
    };
```

`AuthContext.Provider`의 value(94행)에 `startKakaoLogin`, `completeKakaoLogin`을 더한다.

```javascript
        <AuthContext.Provider value={{ user, login, logout, startKakaoLogin, completeKakaoLogin, loading, apiClient, airlines, airports, rawAirports, fetchStaticData }}>
```

- [ ] **Step 3: KakaoCallback.jsx를 만든다**

```javascript
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function KakaoCallback() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { completeKakaoLogin } = useAuth();
    const [error, setError] = useState(null);
    const attempted = useRef(false);

    useEffect(() => {
        // code는 한 번만 쓸 수 있다. StrictMode의 이중 실행을 막는다
        if (attempted.current) return;
        attempted.current = true;

        const code = searchParams.get('code');
        const state = searchParams.get('state');

        if (!code || !state) {
            setError('로그인 정보가 올바르지 않습니다.');
            return;
        }

        completeKakaoLogin(code, state)
            .then(() => navigate('/', { replace: true }))
            .catch(() => setError('카카오 로그인에 실패했습니다. 다시 시도해주세요.'));
    }, [searchParams, completeKakaoLogin, navigate]);

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-6">
                <p className="text-sm text-destructive text-center">{error}</p>
                <button
                    onClick={() => navigate('/', { replace: true })}
                    className="text-sm font-semibold underline"
                >
                    처음으로 돌아가기
                </button>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-screen">
            <p className="text-sm text-muted-foreground">로그인 중입니다...</p>
        </div>
    );
}
```

`useRef`로 이중 실행을 막는 이유는, React StrictMode가 개발 모드에서 effect를 두 번 실행하고 카카오 `code`는 한 번만 쓸 수 있어서다. 두 번째 호출은 502로 실패한다.

- [ ] **Step 4: App.jsx에 라우트를 추가하고 권한 판정을 바꾼다**

`/apply`와 같은 층에 콜백 라우트를 넣는다. 로그인 여부와 무관하게 접근해야 한다.

```javascript
      <Route path="/apply" element={<GuestTicketSubmitView />} />
      <Route path="/auth/kakao/callback" element={<KakaoCallback />} />
```

`App.jsx:44`의 판정을 바꾼다.

```javascript
          {user.role === 'admin' && <Route path="admin" element={<AdminView />} />}
```

import를 추가한다.

```javascript
import KakaoCallback from './pages/KakaoCallback';
```

- [ ] **Step 5: 나머지 권한 판정 5곳을 바꾼다**

- `components/layout/Header.jsx:42` — `{user.admin_info?.approved && (` → `{user.role === 'admin' && (`
- `components/layout/Sidebar.jsx:34` — `const isAdmin = user?.admin_info?.approved;` → `const isAdmin = user?.role === 'admin';`
- `components/modals/NeedPostDetailModal.jsx:11` — `const isAdmin = user.admin_info && user.admin_info.approved;` → `const isAdmin = user?.role === 'admin';`
- `components/modals/TicketDetailModal.jsx:15` — `const isAdmin = user.admin_info && user.admin_info.approved;` → `const isAdmin = user?.role === 'admin';`
- `pages/AdminView.jsx:119`와 `:135` — `{u.admin_info?.approved && (` → `{u.role === 'admin' && (`

- [ ] **Step 6: 남은 참조가 없는지 확인**

```bash
cd frontend && grep -rn "admin_info" src/
```

Expected: 결과 없음

```bash
cd frontend && grep -rn "localStorage" src/
```

Expected: 결과 없음

- [ ] **Step 7: LoginScreen에 카카오 버튼을 추가한다**

`frontend/src/pages/LoginScreen.jsx`의 기존 로그인 폼 아래에 넣는다. `useAuth`에서 `startKakaoLogin`을 가져온다.

```javascript
                <div className="flex items-center gap-3 my-5">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs text-muted-foreground">또는</span>
                    <div className="flex-1 h-px bg-border" />
                </div>

                <button
                    type="button"
                    onClick={startKakaoLogin}
                    className="w-full py-3 rounded-lg font-bold text-sm"
                    style={{ backgroundColor: '#FEE500', color: '#191600' }}
                >
                    카카오로 시작하기
                </button>
                <p className="mt-2 text-center text-xs text-muted-foreground">
                    이동봉사를 신청하신 분은 카카오로 로그인해 진행 상황을 확인하세요
                </p>
```

기존 파일의 클래스 이름 규칙과 여백을 먼저 읽고 그에 맞춘다.

- [ ] **Step 8: AdminView의 회원 등록 폼을 고친다**

단체 자유 입력을 드롭다운으로 바꾸고 역할 선택을 넣는다. `POST /api/users` 본문에 `organization_id`와 `role`을 보낸다.

단체 목록은 `GET /api/organizations`로 이미 조회하고 있다. `AdminView.jsx`의 기존 단체 탭 상태를 재사용한다. 역할 선택은 `org`와 `admin` 두 값만 노출한다. `general`은 카카오 가입 전용이라 백엔드가 400으로 거부한다.

회원 목록 표의 단체 열은 `u.organization?.name`으로 표시한다.

- [ ] **Step 9: 린트**

```bash
cd frontend && npm run lint
```

Expected: 에러 없음. 경고가 있으면 내용을 확인하고 새로 생긴 것만 고친다.

- [ ] **Step 10: 빌드가 되는지 확인**

```bash
cd frontend && npm run build
```

Expected: 성공

- [ ] **Step 11: 수동 검증**

백엔드를 로컬에서 띄우고 프론트 개발 서버를 실행한다. `AuthContext`가 `import.meta.env.DEV`에서 mock 사용자를 쓰므로, 실제 로그인 흐름을 보려면 `npm run build && npm run preview`로 프로덕션 빌드를 확인한다.

확인 항목이다.

1. 이메일·비밀번호 로그인이 되고, 브라우저 개발자도구 Application 탭에서 `access_token`·`refresh_token` 쿠키에 HttpOnly 표시가 있다
2. localStorage가 비어 있다
3. 관리자 계정으로 로그인하면 관리자 메뉴가 보이고, 단체 계정으로는 안 보인다
4. 새로고침해도 로그인이 유지된다
5. 로그아웃하면 쿠키가 사라지고 로그인 화면으로 돌아간다

- [ ] **Step 12: 커밋**

```bash
git add frontend/src/
git commit -m "feat: 프론트 인증을 쿠키 기반으로 전환하고 카카오 로그인 추가

- localStorage 토큰 보관 제거. HttpOnly 쿠키로 대체
- 권한 판정 6곳을 user.role === 'admin'으로 교체
- /auth/kakao/callback 라우트 추가 (StrictMode 이중 실행 방지)
- 회원 등록 폼의 단체 자유 입력을 드롭다운으로"
```

---

## Task 9: 인프라

**Files:**
- Modify: `docker-compose.yml`
- Modify: `.github/workflows/deploy.yml`
- 서버 작업: `/home/ubuntu/minio/docker-compose.yml`, `.env` 완성본 생성

**Interfaces:**
- Consumes: Task 2의 마이그레이션 008, Task 5의 카카오 환경변수

- [ ] **Step 1: docker-compose.yml에 healthcheck를 추가한다**

`flight-db` 서비스에 넣는다. `${DB_USER}`와 `${DB_NAME}`은 `.env`에 이미 있다.

```yaml
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER} -d ${DB_NAME}"]
      interval: 5s
      timeout: 5s
      retries: 10
```

`flight-backend`의 `depends_on`을 바꾼다.

```yaml
    depends_on:
      flight-db:
        condition: service_healthy
```

포트 매핑은 바꾸지 않는다. 사장님 결정이다.

- [ ] **Step 2: deploy.yml에 마이그레이션 단계를 추가한다**

`docker compose pull` 다음, `docker compose up -d` **앞에** 넣는다.

```bash
            docker compose pull

            # DB가 준비될 때까지 기다린 뒤 마이그레이션을 적용한다
            docker compose up -d flight-db
            docker compose run --rm flight-backend alembic upgrade head

            docker compose up -d --remove-orphans
```

`docker compose run --rm`은 `depends_on`을 따르므로 `flight-db`가 healthy가 될 때까지 기다린다.

- [ ] **Step 3: compose 파일이 유효한지 확인한다**

```bash
docker compose -f docker-compose.yml config > /dev/null && echo "compose OK"
```

Expected: `compose OK`. 환경변수 경고는 무시한다(로컬에 `.env`가 없다).

- [ ] **Step 4: 커밋**

```bash
git add docker-compose.yml .github/workflows/deploy.yml
git commit -m "ci: 배포 시 마이그레이션 자동 적용, DB healthcheck 추가

마이그레이션이 자동 실행되지 않아 수동으로 돌려야 했다.
role 컬럼 없이 새 코드가 뜨면 앱이 즉시 죽으므로 배포 파이프라인에 넣는다."
```

- [ ] **Step 5: 서버의 MinIO를 flight-app 네트워크에 붙인다**

`/home/ubuntu/minio/docker-compose.yml`을 편집한다. git 추적 파일이 아니다. **편집 전에 백업한다.**

```bash
ssh -i ~/uk/dev-uk.key -p 61185 ubuntu@168.107.55.237 \
  'cp /home/ubuntu/minio/docker-compose.yml /home/ubuntu/minio/docker-compose.yml.bak'
```

minio 서비스의 `networks`를 세 개로 바꾼다.

```yaml
    networks:
      - app-network
      - ilchul-network
      - flight-app
```

`networks` 섹션에 `flight-app`을 추가한다.

```yaml
networks:
  app-network:
    external: true
    name: app-network
  ilchul-network:
    external: true
    name: ilchul-network
  flight-app:
    external: true
    name: flight-app
```

`ilchul-network`를 함께 명시하는 것이 중요하다. 현재 실행 중인 컨테이너는 `ilchul-network`에 붙어 있지만 compose 파일에는 없다. 누군가 `docker network connect`로 수동 연결한 것이다. 이대로 재생성하면 ilchul 프로젝트의 연결이 끊긴다.

- [ ] **Step 6: MinIO를 재생성하고 연결을 확인한다**

재생성은 conkiri와 ilchul에 수 초의 영향을 준다. 사장님께 시점을 확인한 뒤 실행한다.

```bash
ssh -i ~/uk/dev-uk.key -p 61185 ubuntu@168.107.55.237 \
  'cd /home/ubuntu/minio && docker compose up -d'
```

세 네트워크에 붙었는지 확인한다.

```bash
ssh -i ~/uk/dev-uk.key -p 61185 ubuntu@168.107.55.237 \
  'docker inspect minio --format "{{range \$k,\$v := .NetworkSettings.Networks}}{{\$k}} {{end}}"'
```

Expected: `app-network flight-app ilchul-network` (순서는 다를 수 있다)

ilchul이 아직 정상인지도 확인한다.

```bash
ssh -i ~/uk/dev-uk.key -p 61185 ubuntu@168.107.55.237 \
  'docker ps --filter name=ilchul --format "{{.Names}} {{.Status}}"'
```

- [ ] **Step 7: 백엔드에서 내부 주소로 MinIO에 붙는지 확인한다**

`.env`를 바꾸기 전에 연결 가능성만 먼저 본다.

```bash
ssh -i ~/uk/dev-uk.key -p 61185 ubuntu@168.107.55.237 \
  'docker exec flight-backend python -c "
from minio import Minio
import os
c = Minio(\"minio:9000\", access_key=os.environ[\"MINIO_ACCESS_KEY\"], secret_key=os.environ[\"MINIO_SECRET_KEY\"], secure=False)
print(\"bucket_exists:\", c.bucket_exists(os.environ[\"MINIO_BUCKET\"]))
"'
```

Expected: `bucket_exists: True`

실패하면 `.env`를 바꾸지 않는다. 네트워크 연결 문제를 먼저 해결한다.

- [ ] **Step 8: .env 완성본을 만든다**

서버의 현재 `.env`를 읽어 아래를 반영한 전체 내용을 만든다.

- `MINIO_ENDPOINT`를 `minio:9000`으로
- `MINIO_SECURE`를 `false`로
- `KAKAO_REST_API_KEY=` 추가 (값은 사장님이 채움)
- `KAKAO_CLIENT_SECRET=` 추가 (콘솔에서 활성화한 경우만)
- `KAKAO_REDIRECT_URI=https://adogs-ticket.shop/auth/kakao/callback` 추가
- `COOKIE_SECURE=true` 추가

완성본을 사장님께 드려서 GitHub Secrets의 `ENV_FILE`에 등록하게 한다. **서버 파일을 직접 고쳐도 다음 배포에 `ENV_FILE`로 덮어써지므로 Secrets 등록이 본체다.**

비밀값을 채팅에 그대로 노출하지 않도록, 기존 비밀값은 마스킹한 뼈대와 "기존 값 유지" 표시를 함께 전달한다.

- [ ] **Step 9: 프로덕션 DB를 백업한다**

마이그레이션 적용 전이다.

```bash
ssh -i ~/uk/dev-uk.key -p 61185 ubuntu@168.107.55.237 \
  'docker exec postgresql pg_dump -U flightapp -d flight-db > /home/ubuntu/flight-app/backup-before-008.sql && ls -lh /home/ubuntu/flight-app/backup-before-008.sql'
```

파일 크기가 0이 아닌지 확인한다.

- [ ] **Step 10: 마이그레이션을 수동으로 적용한다**

Task 2 Step 12에서 파일 승인을 받은 뒤다.

```bash
ssh -i ~/uk/dev-uk.key -p 61185 ubuntu@168.107.55.237 \
  'docker exec flight-backend alembic upgrade head && docker exec flight-backend alembic current'
```

Expected: `008 (head)`

적용 후 데이터를 확인한다.

```bash
ssh -i ~/uk/dev-uk.key -p 61185 ubuntu@168.107.55.237 \
  'docker exec postgresql psql -U flightapp -d flight-db -c "select name, email, role, organization_id from users order by role, name;" -c "select count(*) filter (where lookup_token is not null) as with_token, count(*) as total from guest_ticket_submissions;"'
```

Expected: 관리자 3명(`admin`), 단체 4명(`org`, `organization_id=1`), 제출 4건 모두 토큰 보유

- [ ] **Step 11: 코드를 배포하고 확인한다**

`main`에 머지하면 워크플로가 돈다. 배포 후 확인 항목이다.

1. `https://adogs-ticket.shop`에서 기존 계정으로 로그인
2. 개발자도구에서 쿠키 HttpOnly 확인
3. 관리자 메뉴 노출 확인
4. 단체 계정으로 제출 목록 확인 (어독스 것만 보여야 하는데 현재 제출 4건의 `organization_id`가 어떤 값인지 미리 확인해둔다)
5. 카카오 로그인 (사장님이 콘솔 등록을 마친 뒤)
6. `/apply`에서 e티켓 이미지 제출 → MinIO 내부 주소로 저장되는지 로그 확인

- [ ] **Step 12: 서버 작업 내용을 커밋한다**

서버 파일은 git에 없다. 대신 무엇을 바꿨는지 기록을 남긴다.

`docs/superpowers/specs/2026-07-26-role-model-and-kakao-auth-design.md`의 9.3 절 아래에 실제 적용 결과를 적고 커밋한다.

```bash
git add docs/
git commit -m "docs: MinIO 네트워크 작업 적용 결과 기록"
```

---

## Self-Review 결과

**스펙 커버리지 확인**

| 스펙 절 | 담당 태스크 |
|---|---|
| 2.1 users 컬럼 변경 | Task 2 |
| 2.2 역할 정의 | Task 2 (모델), Task 4 (판정) |
| 2.3 CHECK 제약 | Task 2 |
| 2.4 guest_ticket_submissions | Task 2 |
| 2.5 기존 행 lookup_token | Task 2 Step 8 |
| 3.1 JWT 주체 변경 | Task 3 |
| 3.2 의존성 네 개 | Task 4 |
| 3.3 scope_to_org | Task 4 |
| 4 카카오 로그인 | Task 5 |
| 5.1~5.3 쿠키·사일런트 리프레시·회전 제거 | Task 3 |
| 6 클레임 | Task 6 |
| 7 프론트엔드 | Task 8 |
| 8 기존 데이터 마이그레이션 | Task 2, Task 9 Step 10 |
| 9.1 마이그레이션 자동화 | Task 9 Step 2 |
| 9.2 docker-compose | Task 9 Step 1 |
| 9.3 MinIO 네트워크 | Task 9 Step 5~7 |
| 9.4 .env | Task 9 Step 8 |
| 9.5 nginx 변경 없음 | 해당 태스크 없음 (변경 불필요) |
| 9.6 MinIO 전용 계정 (선택) | 범위 밖으로 유지 |
| 10 에러 처리 | Task 5 (카카오·state), Task 6 (클레임) |
| 11 테스트 6가지 | Task 1~6 |
| 12 배포 순서 | Task 9 |
| 13 사장님 작업 | Task 9 Step 8, Step 11 |

스펙의 회원 생성 API 변경(`organization_id`, `role`)이 스펙 본문에 명시적 절 없이 7절 표에만 있었다. Task 7로 독립시켰다.

**타입 일관성 확인**

- `scope_to_org(query, user, model)` — Task 4에서 정의, Task 4에서만 사용. 인자 순서 일치
- `issue_tokens(db, response, user)` — Task 3에서 정의, Task 3(로그인)과 Task 5(카카오)에서 사용. 인자 순서 일치
- `KakaoProfile(id, nickname, email)` — Task 5에서 정의, 같은 태스크의 테스트에서 사용. 필드명 일치
- `ACCESS_COOKIE_NAME` / `REFRESH_COOKIE_NAME` — Task 3에서 정의, Task 4·6의 테스트에서 import. 이름 일치
- `make_user(role=..., organization_id=..., email=...)` — Task 1에서 정의, Task 2~7에서 사용. 인자 이름 일치
- `schemas.UserCreate`에 `organization_id: int`와 `role: str` — Task 2에서 정의, Task 7에서 사용. 필드명 일치
