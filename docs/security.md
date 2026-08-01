# Security & Privacy Specification (Harness)

## 🔐 Authentication & Authorization

### 1. JWT Security
- **Secret Management**: 환경변수 (`SECRET_KEY`) 기반 관리.
- **State Token (OAuth)**: 구글 연동 시 CSRF 공격 및 사용자 오매칭 방지를 위해 서명된 단기 JWT(`state`)를 사용한다.

### 2. 구글 토큰 보안 (NEW)
- **Token Storage**: 구글 Access/Refresh Token은 별도의 `user_google_tokens` 테이블에서 격리하여 관리한다.
- **Scope Restriction**: 사용자의 드라이브 전체 권한 대신, 앱이 생성한 파일 또는 특정 폴더에 한정된 권한(`drive.file`)만 요청한다.

- **State Binding (Kakao)**: 카카오 로그인의 `state`는 서명·만료·용도 검사만으로는 부족하다.
  `GET /api/auth/kakao/login-url`이 비로그인 공개 엔드포인트라 공격자도 유효한 `state`를
  발급받을 수 있고, 자기 계정으로 동의를 마쳐 얻은 `code`와 함께 피해자를 콜백 URL로 유인하면
  피해자를 공격자 계정으로 로그인시킬 수 있다(세션 고정). 이를 막기 위해 `state`의 `nonce`를
  `kakao_oauth_state` 쿠키(HttpOnly, SameSite=Lax, 10분)에도 심고 콜백에서 대조한다.
  불일치·누락은 위조 `state`와 동일하게 400으로 답해 어느 검사에서 걸렸는지 알리지 않으며,
  쿠키는 성공·실패 양쪽에서 즉시 소진한다.

### 3. RBAC (Role-Based Access Control)
- **Google Sync Control**: 본인의 구글 계정 및 동기화 폴더 설정은 본인(`Owner`)만 가능하다.
- **단체 업무 화면은 `OrgUser` 전용**: 카카오 셀프 가입으로 누구나 `general` 계정을 만들 수
  있으므로, 로그인 여부만 보는 `CurrentUser`는 더 이상 "믿을 수 있는 실무자"를 뜻하지 않는다.
  티켓·니드포스트·나눔신청 라우터는 전부 `OrgUser`로 잠근다. `general`이 접근해도 되는 것은
  `/users/me`, 비밀번호 변경, 그리고 본인 제출을 담는 claim뿐이다.
- **claim은 `general`만**: unclaim 경로가 없어 한 번 잘못 담기면 진짜 제출자가 영구히 막힌다.
  토큰이 새더라도 업무 계정이 남의 제출을 가져가지 못하도록 `org`/`admin`의 claim은 403이다.

## 🛡 Privacy Protection

### 1. External Integration
- **Webhook Validation**: 구글 드라이브로부터 수신되는 웹훅은 헤더(`X-Goog-*`) 정보를 통해 유효성을 1차 검증한다.
- **Sensitive Data**: 구글 API 통신 시 사용자 이메일 등 민감한 개인 정보는 필요한 경우가 아니면 포함하지 않는다.

### 2. 익명 제출 조회 토큰
- **`lookup_token` 최소 노출**: 익명 제출자의 전화번호·e티켓을 지키는 유일한 비밀이므로 공용
  응답 모델(`GuestTicketSubmission`)에 싣지 않는다. 제출 직후 본인에게 돌려주는
  `GuestTicketSubmissionCreated` 응답에만 포함한다.

## 🛡 AI Harness: Self-Evolving Rules
- 보안 관련 수정 발생 시 이 문서에 기록하고, OAuth 등 외부 연동 시 보안 취약점(리다이렉트 공격 등) 유무를 최우선으로 검사한다.
