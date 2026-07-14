# AI 작업 실패 패턴 및 재발 방지 가이드 (Harness Evolution)

## ❌ [Pattern 1] JSX/React 파싱 오류 (Parse Error)
- **증상**: `Unexpected token` 등 빌드 에러 발생.
- **방지**: 복잡한 레이아웃 변경 시 `replace` 대신 `write_file` 사용.

## ❌ [Pattern 2] 이미지 캡처 시 스타일 유실 및 여백 버그
- **증상**: 폰트 깨짐, 상단 여백 발생.
- **방지**: `fontEmbedCSS` 옵션 사용 및 캡처 전 스타일 정규화.

## ❌ [Pattern 3] OAuth 리다이렉트 후 인증 유실 (NEW)
- **🚩 증상**: 구글 로그인 후 돌아왔을 때 사용자가 로그아웃되어 있거나 "접근 권한 없음" 에러 발생.
- **🔍 원인**: 리다이렉트 주소가 HTTPS가 아니거나, 프론트엔드 도메인과 일치하지 않아 Bearer 토큰(JWT)이 유실됨.
- **✅ 방지 대책**:
    - 리다이렉트 시 `state` 파라미터에 유저 식별 정보를 서명하여 포함한다.
    - 백엔드 콜백 완료 후 명시적으로 프론트엔드의 특정 경로(예: `/my-tickets`)로 `RedirectResponse`를 보낸다.

## ❌ [Pattern 4] 구글 API 할당량 및 권한 오류 (NEW)
- **🚩 증상**: `403 Insufficient Permission` 또는 `Refresh Token` 만료 에러 발생.
- **🔍 원인**: 갱신 토큰(`refresh_token`)을 DB에 저장하지 않았거나, 요청한 Scope가 실제 API 호출과 다름.
- **✅ 방지 대책**:
    - OAuth 요청 시 `access_type="offline"` 및 `prompt="consent"`를 설정하여 반드시 `refresh_token`을 획득한다.
    - 토큰 만료 시 자동 갱신 로직이 서비스 레이어(`get_drive_service`)에 포함되어 있는지 확인한다.
