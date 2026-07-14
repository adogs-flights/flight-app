# Security & Privacy Specification (Harness)

## 🔐 Authentication & Authorization

### 1. JWT Security
- **Secret Management**: 환경변수 (`SECRET_KEY`) 기반 관리.
- **State Token (OAuth)**: 구글 연동 시 CSRF 공격 및 사용자 오매칭 방지를 위해 서명된 단기 JWT(`state`)를 사용한다.

### 2. 구글 토큰 보안 (NEW)
- **Token Storage**: 구글 Access/Refresh Token은 별도의 `user_google_tokens` 테이블에서 격리하여 관리한다.
- **Scope Restriction**: 사용자의 드라이브 전체 권한 대신, 앱이 생성한 파일 또는 특정 폴더에 한정된 권한(`drive.file`)만 요청한다.

### 3. RBAC (Role-Based Access Control)
- **Google Sync Control**: 본인의 구글 계정 및 동기화 폴더 설정은 본인(`Owner`)만 가능하다.

## 🛡 Privacy Protection

### 1. External Integration
- **Webhook Validation**: 구글 드라이브로부터 수신되는 웹훅은 헤더(`X-Goog-*`) 정보를 통해 유효성을 1차 검증한다.
- **Sensitive Data**: 구글 API 통신 시 사용자 이메일 등 민감한 개인 정보는 필요한 경우가 아니면 포함하지 않는다.

## 🛡 AI Harness: Self-Evolving Rules
- 보안 관련 수정 발생 시 이 문서에 기록하고, OAuth 등 외부 연동 시 보안 취약점(리다이렉트 공격 등) 유무를 최우선으로 검사한다.
