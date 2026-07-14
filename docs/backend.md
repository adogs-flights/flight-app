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
