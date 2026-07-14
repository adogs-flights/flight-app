# 프로젝트 이슈 및 로드맵

## [v1.6] 구글 드라이브 양방향 동기화 모듈 구현 (Completed)

### ✈️ 개요
사용자의 구글 드라이브 폴더 구조와 앱의 티켓 데이터를 실시간으로 동기화하는 모듈을 구축했습니다. 보안 강화된 OAuth 인증과 시니어 사용자를 배려한 원클릭 폴더 설정 기능을 포함합니다.

### 🛠️ 주요 구현 기능
1. **보안 OAuth 2.0 핸들러**: JWT 기반 `state` 토큰을 사용하여 리다이렉트 시 사용자 식별 및 CSRF 공격을 완벽 차단.
2. **사용자 친화적 설정 (UX)**: 복잡한 폴더 ID 입력 대신 "전용 동기화 폴더 자동 생성" 기능 도입.
3. **양방향 동기화 엔진**:
   - [Web → Drive]: 티켓 생성/삭제 시 백그라운드 태스크로 드라이브 폴더 자동 생성 및 휴지통 이동.
   - [Drive → Web]: 드라이브 내 특정 폴더 감시(Watch) 및 이름 규칙(`YYYYMMDD_...`) 기반 자동 티켓 생성.
4. **UI 통합**: '내 티켓' 페이지 내 동기화 대시보드 및 티켓 카드별 드라이브 바로가기 링크 제공.

### 📄 파일별 수정 상세 내역

#### **1. Backend: Infra & Models**
- **`backend/requirements.txt`**: `google-api-python-client`, `google-auth-oauthlib` 등 구글 API 연동 라이브러리 추가.
- **`backend/models.py`**:
    - `UserGoogleToken`: 구글 Access/Refresh 토큰 및 `root_folder_id` 저장 테이블 추가.
    - `GoogleDriveSync`: 티켓과 구글 폴더 간의 1:1 매핑 이력 관리 테이블 추가.
    - `User`, `Ticket` 모델에 각각 구글 연동 관계(Relationship) 설정.
- **`backend/alembic/versions/003_add_gdrive_sync_tables.py`**: 신규 테이블 및 컬럼 생성을 위한 DB 마이그레이션 스크립트 작성.
- **`backend/schemas.py`**: `GoogleDriveSync`, `UserGoogleToken` Pydantic 모델 정의 및 `Ticket` 모델에 동기화 정보 필드 추가.

#### **2. Backend: Service & Logic**
- **`backend/services/gdrive_service.py` (신설)**:
    - `parse_flight_folder_name`: 폴더명 정규식 파싱 및 익일 도착 자동 계산 로직.
    - `create_gdrive_folder` / `delete_gdrive_folder`: 백그라운드 전용 드라이브 조작 로직.
    - `watch_folder`: 구글 Push Notification 채널 등록.
    - `create_root_sync_folder` / `find_folder_by_name`: 사용자 편의를 위한 폴더 자동 생성 및 검색 로직.
- **`backend/routers/gdrive.py` (신설)**:
    - `/api/gdrive/connect`: `state` 토큰을 포함한 구글 인증 URL 생성.
    - `/api/gdrive/callback`: 인증 완료 후 사용자를 식별하여 토큰 저장 및 프론트엔드 리다이렉트.
    - `/api/gdrive/setup-folder`: 전용 동기화 폴더 설정 엔드포인트.
    - `/api/gdrive/status`: 현재 연동 및 폴더 설정 상태 조회.

#### **3. Backend: API Integration**
- **`backend/routers/tickets.py`**:
    - `create_ticket`, `delete_ticket` 호출 시 구글 드라이브 작업을 `BackgroundTasks`로 예약.
    - 티켓 목록 조회 API에 `joinedload`를 적용하여 `google_sync` 데이터를 한 번에 가져오도록 최적화.
- **`backend/main.py`**: 구글 드라이브 라우터 등록 및 전반적인 린트(Ruff) 에러 수정.

#### **4. Frontend: UI/UX**
- **`frontend/src/utils/api.js`**: `gdriveApi` 객체를 신설하여 연동 관련 비동기 통신 함수 정리.
- **`frontend/src/pages/MyTicketsView.jsx`**:
    - `GoogleDriveSyncPanel` 컴포넌트 추가: 연동 상태에 따라 '연결하기', '폴더 만들기', '설정 완료' 상태를 직관적으로 제공.
    - OAuth 리다이렉트 파라미터 감지 및 성공 알림 처리.
- **`frontend/src/components/TicketCard.jsx`**: 
    - 구글 드라이브와 연결된 티켓에 **[📁 Drive]** 뱃지 추가.
    - 뱃지 클릭 시 해당 구글 폴더로 즉시 이동하는 외부 링크 연동.

### 💡 향후 과제
- 구글 웹훅 알림의 `expiration`(만료 시간) 도래 시 자동 갱신 로직 추가 필요.
- 드라이브에서 폴더명 변경 시 티켓 정보에 실시간 반영되는 기능 고도화.
