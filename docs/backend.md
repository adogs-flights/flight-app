# Backend Technical Specification (Harness)

## 핵심 Tech Stack
- **Framework**: FastAPI
- **ORM**: SQLAlchemy
- **Database**: PostgreSQL (Production) / SQLite (Local)
- **Validation**: Pydantic v2 (Strict validation applied)
- **External Integration**: Google Drive API v3 (OAuth 2.0)
- **Linting**: Ruff (AI_HARNESS_RULES included)

## 핵심 Data Models

### 1. Ticket (항공권)
- `id`: Primary Key
- `google_sync`: GoogleDriveSync와 1:1 관계
- (기타 필드 생략...)

### 2. UserGoogleToken (구글 인증 정보)
- `user_id`: Foreign Key (User)
- `access_token`: 접근 토큰
- `refresh_token`: 갱신 토큰 (Offline access)
- `expires_at`: 만료 시간
- `root_folder_id`: 동기화 대상 루트 폴더 ID

### 3. GoogleDriveSync (동기화 이력)
- `ticket_id`: Foreign Key (Ticket)
- `google_folder_id`: 구글 드라이브 폴더 고유 ID
- `sync_source`: 'WEB' 또는 'DRIVE' (생성 주체)

## 주의 사항 (AI_HARNESS_RULES)

### 🚨 구글 API 및 동기화 (NEW)
1. **Background Tasks**: 구글 API 통신(폴더 생성/삭제)은 네트워크 지연을 방지하기 위해 반드시 FastAPI의 `BackgroundTasks`를 통해 처리한다.
2. **OAuth State Security**: `/connect` 시 반드시 유저 ID가 포함된 서명된 JWT를 `state` 파라미터로 사용하여 CSRF 및 사용자 오매칭을 방지한다.
3. **Lazy API Client**: 구글 서비스 객체(`build`)는 필요할 때만 생성(`get_drive_service`)하여 리소스를 낭비하지 않는다.

### 🚨 데이터 보호 및 마이그레이션 (CRITICAL)
1. **Alembic env.py 검증**: 마이그레이션 생성 전 `env.py`에 `import models`가 포함되어 있는지 반드시 확인한다.
2. **마이그레이션 수동 검토**: `op.drop_table` 등이 의도치 않게 포함되었는지 전수 검사한다.
3. **Base.metadata.create_all 사용 금지**: 오직 Alembic 마이그레이션을 통해서만 스키마를 변경한다.

### 🚨 테스트와 린트 (TICKET-CHECKLIST)
1. **org 사용자 픽스처**: `role="org"` 사용자는 `ck_users_org_requires_credentials_and_org` 제약 때문에 `organization_id` 없이 만들 수 없다. 테스트에서 단체를 먼저 만들고 연결한다.
2. **ruff 설정 부재**: 저장소에 ruff 설정 파일이 없고 ruff가 `requirements.txt`에도 없다. 기본 규칙으로 돌리면 기존 코드 전반에서 `UP017`(`datetime.timezone.utc`)이 잡히므로, 새 코드도 주변과 같은 `timezone.utc` 관례를 유지하고 린트 결과는 기존 건수와 비교해 보고한다.
3. **티켓 하위 리소스 권한**: 티켓의 민감 하위 리소스(출국 준비 추가정보·체크리스트)는 `routers/tickets.py`의 `_get_ticket_for_departure`(소유자·admin)를 재사용한다. 공용 `schemas.Ticket`에 실으면 티켓 목록을 공유받는 다른 단체까지 보게 되므로 별도 엔드포인트로만 내려준다.
