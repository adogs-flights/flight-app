# 해봉티켓 PWA / Web Push

## 구조와 이벤트

기존 React Router/AuthContext/쿠키 API 클라이언트 및 FastAPI 인증 의존성을 사용한다.
서비스 워커는 `vite-plugin-pwa`의 `injectManifest`로 빌드한다. 기존 로고를 비율 유지 후
흰 여백으로 정사각형 처리한 192/512px PNG를 사용한다. 공개 빌드 자산만 사전 캐시하며,
API·업로드 파일·OAuth 응답은 캐시하지 않는다. 오프라인 업무 처리 기능은 제공하지 않는다.
새 워커는 기존 탭을 모두 닫은 뒤 활성화되어 작성 중인 폼을 강제로 새로고침하지 않는다.

```text
신청 라우터 (DB commit 이후)
  → NotificationService.enqueue(user_id, NotificationMessage)
  → BackgroundTasks → deliver_notification (독립 SessionLocal)
  → NotificationService.send_to_user
  → PushProvider.send
  → WebPushProvider → pywebpush + VAPID
```

- 새 나눔 신청: 실제 티켓 소유자에게 `/mytickets` 알림. 같은 단체 동료는 신청 열람 권한이
  없어 Push 수신 대상에 추가하지 않는다. 기존 단체 이메일 알림은 유지한다.
- 승인/거절: 신청자에게 `/myapplications` 알림. 승인으로 자동 거절된 대기 신청자도 포함한다.
  같은 상태로 다시 저장하면 추가 발송하지 않는다. 기존 결과 이메일도 commit 이후로 옮겨
  외부 발송 실패가 신청 결과를 바꾸지 않게 한다.
- 개인 연락처, 신청 메시지, 티켓 제목은 잠금 화면 Push 본문에 넣지 않는다.

`PushProvider`는 `SENT/EXPIRED/FAILED` 결과로 기술별 오류를 숨긴다. 서비스는 사용자의
모든 구독에 발송하고 만료 결과만 삭제한다. HTTP 404/410은 만료, 429/5xx/네트워크 오류는
실패로 처리해 구독을 보존한다. 실패는 민감한 endpoint/키/예외 본문 없이 로그에 남긴다.
현재 자동 재시도·내구성 큐는 없다. 응답 후 프로세스가 종료되면 작업이 유실될 수 있으며,
202 응답은 접수만 의미한다. 사용자별 여러 기기에 순차 발송하며 요청별 10초 timeout을 둔다.

## DB / API

단일 migration head는 `017 → 018`이다. `push_subscriptions`에는 UUID id, user_id FK,
unique endpoint, p256dh, auth, created_at, updated_at을 저장한다. 사용자 삭제는 ORM cascade와
DB `ON DELETE CASCADE`를 지원한다. 운영 PostgreSQL과 로컬 SQLite upsert를 각각 사용한다.

| API | 인증 / 의미 |
| --- | --- |
| GET /api/push/public-key | 공개키만 반환. 미설정 시 503 |
| GET /api/push/status | 로그인 필요. enabled만 반환 |
| POST /api/push/subscriptions | 로그인 사용자에 구독 등록/upsert, 204 |
| POST /api/push/subscription-status | endpoint가 현재 사용자에 등록되어 있는지 확인 |
| DELETE /api/push/subscriptions | JSON `{ "endpoint": "…" }`, 현재 사용자 소유만 삭제, 204 |
| POST /api/push/test | 로그인한 사용자에게 백그라운드 테스트 발송 요청, 202 |

등록은 브라우저 `PushSubscription.toJSON()` 형식이며 `user_id` 입력을 허용하지 않는다.
같은 endpoint의 명시적 재등록은 현재 로그인 사용자에게 소유권을 이전한다.
로그아웃 시 현재 브라우저 구독을 해제하고 이미 표시된 알림도 닫는다. 다른 기기의 구독은 유지한다.
서버 등록 실패 시 새 브라우저 구독은 해제한다. 키를 교체하면 사용자는 알림을 껐다 켜 재등록해야 한다.
브라우저가 구독을 갱신하거나 제거한 경우 설정 화면에서 상태를 확인하고 다시 등록한다.

endpoint는 HTTPS 및 알려진 Chrome/Firefox/Safari/Edge Push 호스트로 제한하고 HTTP redirect를
따르지 않는다. 별도 Push 서비스를 쓰는 브라우저 지원 시 `validate_endpoint` allowlist를 검토한다.
알림 클릭은 동일 origin의 `/notifications`, `/myapplications`, `/mytickets`만 허용한다.

## 설정

개발 환경에서는 백엔드 프로세스에 다음 환경변수를 설정한다. 프론트엔드에는 넣지 않는다.

```dotenv
VAPID_PUBLIC_KEY=<P-256 uncompressed public point의 base64url>
VAPID_PRIVATE_KEY=<32-byte private scalar의 base64url>
VAPID_SUBJECT=mailto:admin@example.com
```

키는 같은 P-256 키쌍이어야 한다. 아래 코드는 개발자가 로컬에서 한 번 실행해 생성할 수 있다.
출력에는 비밀키가 포함되므로 공유·Git 등록하지 말고 비밀 저장소에 보관한다.

```bash
backend/venv/bin/python - <<'PY'
import base64
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat
key = ec.generate_private_key(ec.SECP256R1())
encode = lambda value: base64.urlsafe_b64encode(value).decode().rstrip('=')
print('VAPID_PUBLIC_KEY=' + encode(key.public_key().public_bytes(Encoding.X962, PublicFormat.UncompressedPoint)))
print('VAPID_PRIVATE_KEY=' + encode(key.private_numbers().private_value.to_bytes(32, 'big')))
PY
```

프로젝트는 `.env`를 자동 로드하지 않으므로 개발 서버를 시작하는 셸에 export해야 한다.
설정 누락·잘못된 키쌍은 개발/운영 모두 알림만 비활성화하며 주요 서비스는 계속 동작한다.

운영은 기존 `FLIGHT_SECRET_DIRECTORY`의 검증된 `current/CONFIG_JSON` 세대에 위 세 이름을
**선택 필드**로 추가해 공급한다. 기존 6개 필수 필드와 파일 소유권/권한 검증은 유지하며,
VAPID가 없는 기존 세대도 그대로 유효하다. 운영 환경변수로 비밀키를 우회 주입하지 않는다.
OCI Vault/호스트 publisher에서 이 선택 필드를 공급하도록 운영 설정 작업이 별도로 필요하다.
세대는 프로세스 내 캐시되므로 변경 후 기존 배포 절차에 따른 재생성이 필요하다.
이 PR은 운영 secret/publisher/DB/컨테이너를 변경하거나 배포하지 않는다.

## 로컬 검증

격리된 개발 DB를 지정한다. 서버 시작 시 기존 동작대로 migration과 seed가 실행된다.

```bash
cd backend
venv/bin/pip install -r requirements.txt
export DATABASE_URL=sqlite:////tmp/flight-pwa-local.db
export SECRET_KEY=<개발용-긴-랜덤-값>
export COOKIE_SECURE=false
# VAPID 세 변수도 이 셸에 export
venv/bin/alembic heads
venv/bin/uvicorn main:app --port 8000
```

다른 터미널에서:

```bash
cd frontend
npm install
npm run build
npm run preview -- --host 127.0.0.1
```

`http://localhost:4173`에서 로그인 → 알림 설정 → 알림 받기 → 테스트 알림 보내기 순서로 확인한다.
preview의 `/api`는 8000번 백엔드로 연결된다. 일반 `npm run dev`에서는 워커를 등록하지 않는다.
실기기는 HTTPS 환경을 사용한다. iPhone/iPad는 홈 화면에 설치해 실행한 앱에서 권한을 요청한다.
권한은 버튼 클릭에서만 요청하며 차단 상태에서는 브라우저/OS 설정 변경 안내를 표시한다.

```bash
cd backend
venv/bin/pytest
venv/bin/python -m compileall -q models.py main.py runtime_secrets.py routers services
venv/bin/alembic heads
cd ../frontend
npm run build
npm run lint
node --test tests/push.test.mjs
```

테스트는 실제 Push 서버에 접속하지 않는다. FakeProvider 단위 테스트와 암호화/HTTP 경계 mock,
API 인증/소유권/입력 검증, 결과 이벤트/commit 실패, 독립 세션, SQLite migration 왕복,
워커 클릭 경로와 창 재사용을 검증한다. 실제 OS 알림 수신·설치·운영 PostgreSQL 적용은 별도 검증이다.

## 향후 확장

- FCM: `PushProvider` 구현체 추가, provider factory와 기기 목적지 저장소에 token/provider 구분을
  추가한다. NotificationMessage/비즈니스 라우터는 유지한다. 현재는 Firebase SDK를 사용하지 않는다.
- Queue: `NotificationService.enqueue`를 publisher 어댑터로 교체하고 `user_id`와 message 필드를
  직렬화한다. Worker는 별도 세션으로 기존 `send_to_user`를 실행한다. Redis/RabbitMQ 도입 시
  재시도·중복 방지·실패 큐 정책을 함께 정한다. 원자적 발행 보장이 필요하면 outbox를 추가한다.
- 여러 사용자/단체 전송은 권한에 맞는 사용자 ID 목록을 구한 뒤 같은 서비스에 위임할 수 있다.
  현재 필요 없는 조직 broadcast/Event Bus/DDD 계층은 도입하지 않았다.

## 구현 시 검증 기록

- `npm install`, `npm run build`: 통과. 번들 크기와 PWA 플러그인 내부 deprecated 옵션 경고는 남는다.
- `node --test tests/push.test.mjs`: 4개 통과.
- `pytest`: 126개 통과 / 기존 실패 1개. 추가한 34개 테스트는 모두 통과. 기존 실패는
  `test_claim.py::test_create_guest_submission_generates_lookup_token`이며 현재 필수인
  kakao_id/eticket_image 대신 과거 예약번호 입력을 전송해 422가 발생한다.
- `npm run lint`: 기존 `SubmissionStatusView.jsx:7`의 미사용 `formatDate` 1개 오류와 17개 경고.
  새 알림 코드의 lint 오류는 없다.
- 위 pytest/lint 실패는 변경 전 `origin/main` (`9893cc9`) 별도 체크아웃에서도 재현했다.
- Python compile/import, Alembic 단일 head `018`, 격리 SQLite upgrade/downgrade/re-upgrade 통과.
- npm audit는 26개 취약점(낮음 1 / 보통 15 / 높음 10)을 보고했다. 의존성 전체 강제 업데이트는
  이 변경에 포함하지 않았다. 실제 브라우저 Push 수신, 운영 DB 적용/배포는 미검증이다.

참고: [Vite PWA injectManifest](https://vite-pwa-org.netlify.app/guide/inject-manifest),
[pywebpush](https://github.com/web-push-libs/pywebpush),
[Apple Web Push](https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers).
