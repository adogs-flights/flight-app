# 역할 모델 정규화와 카카오 로그인 (A덩이)

- 작성일: 2026-07-26
- 상태: 설계 승인 대기
- 대응 요구사항: #1(계정으로 단체 선택), #4(일반인·단체·관리자 3단 분리)

## 0. 배경

사장님이 요청한 11개 기능을 기존 코드와 대조한 결과, 단일 스펙으로 다루기에 너무 크고 서로 물려 있었다. 다음 4덩이로 나누고, 각각 별도의 스펙과 구현 주기를 갖는다.

| 덩이 | 범위 | 요구사항 |
|---|---|---|
| **A (이 문서)** | 도메인·권한 기반 | #1, #4 |
| B | 신청 파이프라인 | #7, #9, #10, #11, #2 |
| C | 공개 진입 경험 | #3, #5, #6 |
| 정책 | 민감정보 취급 | #8 |

A를 먼저 하는 이유는 B와 C가 모두 역할 모델에 의존하기 때문이다. 나중에 하면 B·C를 되돌려야 한다.

### 대조 과정에서 확인한 사실

- #9(드라이브 폴더 생성)는 코드가 이미 있다. `gdrive_service.backup_guest_submission_to_drive()`가 `GDRIVE_UPLOAD_ADMIN_EMAIL` 미설정과 연동 계정 0건 때문에 조용히 건너뛰는 상태다. B에서 다룬다.
- #10(폼)은 `/apply`가 이미 그 역할이다. 출국일 항목만 빠져 있다. B에서 다룬다.
- #5(강아지 리스트)의 데이터 모델은 `NeedPost`로 이미 존재한다. C에서 공개만 열면 된다.
- #2(국가 색인)는 `Airport.country`에 국가가 있지만 게스트 제출 폼이 공항·국가를 받지 않아 색인 키가 없다. B에서 폼 확장과 함께 정한다.
- `users.organization` 값이 7명 전원 비어 있다. #1 정규화에서 옮길 기존 데이터가 없다.

### #8에 대한 결론

여권 원본은 앱에서 받지 않고 지메일·드라이브에 유지한다. 여권번호는 개인정보보호법상 고유식별정보여서 앱이 직접 수집하면 별도 동의·암호화 저장·접근기록 보관·파기 절차가 사업자 의무로 따라온다. 앱은 "어떤 서류가 어느 단계까지 처리됐는지"라는 상태만 보유하고 원본은 드라이브에 둔다. #7의 진행단계 기능이 그 역할을 한다.

## 1. 결정 사항

| 항목 | 결정 |
|---|---|
| 역할 모델 | `users.role` 컬럼(`general`/`org`/`admin`). 기존 `admin_users` 테이블은 **삭제** |
| 일반인 계정 | 선택적. 로그인 없이 제출 가능하고, 계정을 만들면 자기 신청 모음을 본다 |
| 일반인 로그인 | 카카오 로그인 |
| 단체·관리자 로그인 | 기존 이메일·비밀번호, 관리자 발급 유지 |
| 익명 제출과 계정 연결 | 조회링크에서 본인이 눌러 담는 방식(클레임) |
| 단체 조회 범위 | 하이브리드 — 티켓·강아지 리스트·일정은 전체 공유, 제출 서류·전화번호·e티켓은 자기 단체만 |
| 토큰 보관 | HttpOnly 쿠키 (localStorage 폐기) |
| 토큰 갱신 | 사일런트 리프레시. access 만료 시 401 대신 백엔드가 refresh를 검증해 재발급 |
| refresh 회전 | 사용하지 않음 |
| MinIO 연결 | 같은 도커 네트워크로 직접 연결 |
| postgres 포트 | 변경하지 않음 (다른 곳에서 관장) |

## 2. 데이터 모델

### 2.1 `users` 테이블

| 변경 | 내용 |
|---|---|
| `role` 추가 | String, NOT NULL. `general` / `org` / `admin` |
| `organization_id` 추가 | `organizations.id` FK, NULL 허용 |
| `organization` 제거 | 기존 자유 문자열. 7명 전원 값이 비어 있어 손실 없음 |
| `kakao_user_id` 추가 | String, unique, NULL 허용, 인덱스 |
| `hashed_password` | NOT NULL → NULL 허용 |
| `email` | NOT NULL → NULL 허용 (unique 유지) |

`email`과 `hashed_password`를 NULL 허용으로 바꾸는 것은 카카오 가입자 때문이다. 카카오는 비밀번호를 주지 않고, 이메일은 선택 동의여서 받지 못할 수 있다.

### 2.2 역할 정의

- **`general`** — 카카오로 가입한 일반 봉사자. 계정 없이도 제출할 수 있고, 계정을 만들면 자기 신청 모음을 본다.
- **`org`** — 단체 담당자. 관리자가 이메일·비밀번호로 발급한다. `organization_id`를 반드시 가진다. 한 단체에 여러 계정을 둘 수 있다.
- **`admin`** — 운영자.

### 2.3 CHECK 제약

NULL 허용을 늘린 만큼 잘못된 조합을 DB에서 막는다.

| 제약 | 조건 |
|---|---|
| `ck_users_general` | `role='general'` → `kakao_user_id` NOT NULL |
| `ck_users_org` | `role='org'` → `email`, `hashed_password`, `organization_id` 모두 NOT NULL |
| `ck_users_admin` | `role='admin'` → `email`, `hashed_password` 모두 NOT NULL |

### 2.4 `guest_ticket_submissions` 테이블

| 변경 | 내용 |
|---|---|
| `user_id` 추가 | `users.id` FK, NULL 허용. 클레임되면 채워진다 |
| `lookup_token` 추가 | String, unique, NOT NULL. 랜덤 32자. 조회 화면의 열쇠 |

`lookup_token`을 제출 ID와 따로 두는 이유는, ID가 관리자 화면과 로그에 노출되기 때문이다. 조회 전용 열쇠를 분리하면 유출 범위가 좁아진다.

조회 화면 자체는 B에서 만들지만 컬럼은 A에서 넣는다. 프로덕션 마이그레이션을 두 번 돌리지 않기 위해서다.

### 2.5 기존 행에 대한 `lookup_token` 채우기

이미 있는 제출 4건에는 마이그레이션에서 랜덤 토큰을 생성해 채운 뒤 NOT NULL 제약을 건다.

## 3. 권한 판정

### 3.1 JWT 주체를 사용자 ID로 변경

현재 `auth.py:85`가 JWT `sub`에 이메일을 담고 그 이메일로 사용자를 찾는다. 이메일이 NULL일 수 있게 되므로 `sub`에 `user.id`(UUID)를 담고 ID로 조회한다.

`sub`를 만드는 곳이 두 군데다. **둘 다 고쳐야 한다.**

- `auth.py:133` — 로그인 시 access token 발급
- `auth.py:167` — refresh 시 access token 발급

**부작용**: 배포 시점에 이미 발급된 토큰이 모두 무효가 되어 로그인 중이던 사람은 다시 로그인해야 한다. 회원 7명이 대부분 개발·운영 계정이라 실질적 영향은 없다.

### 3.2 의존성 네 개

| 이름 | 통과 조건 | 용도 |
|---|---|---|
| `OptionalUser` | 로그인 없이 통과. 로그인 시 사용자, 아니면 `None` | 공개 화면. A에서 만들고 C에서 쓴다 |
| `CurrentUser` | 로그인 필수 (기존) | 내 신청 모음 |
| `OrgUser` | `role`이 `org` 또는 `admin` | 단체 업무 화면 |
| `AdminUser` | `role`이 `admin` (기존, 판정만 교체) | 회원·마스터·단체 관리 |

`get_current_admin_user`의 판정을 `current_user.admin_info.approved`(`auth.py:107`)에서 `current_user.role == 'admin'`으로 바꾼다. 함수 이름과 위치는 그대로 두어, 이 의존성을 쓰는 라우터는 손대지 않는다.

### 3.3 하이브리드 격리는 쿼리에서

"티켓은 공유, 개인정보는 자기 단체만"은 통과/차단으로 표현할 수 없다. 같은 목록 API가 호출자에 따라 다른 행을 돌려줘야 한다.

`scope_to_org(query, user)` 헬퍼 하나를 둔다.

- `admin` → 그대로 통과
- `org` → `organization_id`가 자기 단체인 행만
- 그 외 → 빈 결과

적용 대상은 세 곳이다.

- `GET /api/guest-submissions` (목록)
- `GET /api/guest-submissions/{id}` (상세)
- `GET /api/guest-submissions/{id}/image` (e티켓 이미지)

티켓·강아지 리스트에는 걸지 않는다. 판정 규칙이 한 함수에만 있어 정책 변경 시 한 곳만 고친다.

## 4. 카카오 로그인

Redirect URI를 백엔드가 아니라 프론트 라우트로 등록한다. 302 리다이렉트가 없다.

1. 프론트가 카카오 인증 페이지로 이동한다. `state`는 백엔드가 발급한 단기 JWT
2. 카카오가 프론트 콜백 라우트(`/auth/kakao/callback`)로 `code`를 돌려준다
3. 프론트가 `code`와 `state`를 `POST /api/auth/kakao`로 한 번 넘긴다
4. 백엔드가 나머지 전부를 처리한다 — `state` 검증, 카카오 토큰 교환, `/v2/user/me` 조회, 사용자 조회 또는 `role='general'`로 생성, 우리 토큰 발급, 쿠키 설정
5. 프론트는 응답을 받고 그 자리에서 로그인 완료

`state`에 단기 JWT를 쓰는 것은 `docs/security.md`의 기존 구글 연동 규칙과 동일하다.

**카카오 액세스 토큰은 저장하지 않는다.** 로그인 확인에만 쓰고 버린다. 보관하지 않으면 유출될 것도 없다. #7 마지막 단계에서 앱이 직접 카톡 메시지를 보내려면 저장이 필요해지는데, B에서 따로 판단한다.

### 신규 엔드포인트

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/api/auth/kakao/login-url` | `state`가 포함된 카카오 인증 URL 반환 |
| POST | `/api/auth/kakao` | `code`·`state`를 받아 로그인 완료, 쿠키 설정 |

## 5. 사일런트 리프레시

### 5.1 현재 상태

`/api/auth/refresh`는 구현돼 있으나 **프론트에서 아무도 호출하지 않는다.** `api.js`에 요청 인터셉터만 있고 응답 인터셉터가 없다. 지금은 access token이 만료되면 401이 나고 사용자가 튕긴다. 사일런트 리프레시가 없는 것이 아니라 리프레시 자체가 죽어 있다.

### 5.2 쿠키로 옮긴다

백엔드가 요청을 받는 순간 refresh token을 들고 있어야 401 없이 재발급할 수 있다. 지금은 localStorage에 있어 백엔드가 볼 수 없다.

| 쿠키 | 속성 |
|---|---|
| `access_token` | HttpOnly, Secure, SameSite=Lax, Path=/ |
| `refresh_token` | HttpOnly, Secure, SameSite=Lax, Path=/api/auth |

동작 순서는 이렇다.

1. access 쿠키 확인 → 유효하면 그대로 처리
2. 만료됐으면 refresh 쿠키 검증
3. 이상 없으면 새 access token을 만들어 `Set-Cookie`로 갱신하고 **원래 요청을 정상 처리**
4. refresh까지 만료됐거나 위조면 그때만 401

`Authorization: Bearer` 헤더도 계속 받아들인다. API 문서 화면에서 테스트할 때 필요하다. 쿠키를 먼저 보고 없으면 헤더를 본다.

부수 효과로 보안이 개선된다. localStorage는 XSS가 한 번 통하면 토큰을 그대로 가져갈 수 있는데, HttpOnly 쿠키는 자바스크립트가 읽지 못한다.

`Secure` 쿠키는 Cloudflare가 브라우저와 HTTPS로 통신하므로 정상 동작한다. 오리진 구간이 HTTP인 것과는 무관하다.

### 5.3 refresh 회전을 끈다

`auth.py:171-172`가 현재 refresh token 회전을 한다(기존 토큰 삭제 후 재발급). 이것이 사일런트 리프레시와 만나면 사용자를 로그아웃시킨다. 화면 하나가 API를 3개 동시에 부르면 만료된 토큰 3개가 같이 들어오는데, 첫 번째가 회전시키는 순간 나머지 두 개가 든 refresh token은 없는 토큰이 된다.

refresh token은 만료까지 재사용을 허용하고 로그아웃 시 삭제한다. 회전의 목적은 유출 피해 축소인데, HttpOnly 쿠키로 옮기면 유출 경로 자체가 좁아진다.

## 6. 클레임

`POST /api/guest-submissions/{id}/claim`

- 로그인 필요 (`CurrentUser`)
- 본문에 `lookup_token`
- 토큰이 맞고 `user_id`가 비어 있으면 그 계정에 귀속
- 이미 주인이 있으면 409
- 토큰 불일치는 404 — 제출이 존재하는지조차 알려주지 않는다

## 7. 프론트엔드

| 파일 | 변경 |
|---|---|
| `utils/api.js` | 요청 인터셉터 제거, `withCredentials: true` 추가 |
| `contexts/AuthContext.jsx` | `localStorage` 코드 전부 제거. 로그인 상태는 `GET /api/users/me` 성공 여부로 판단. 카카오 로그인 함수 추가. 개발용 mock 사용자에 `role` 추가 |
| `pages/LoginScreen.jsx` | 카카오 로그인 버튼 |
| `App.jsx` | `/auth/kakao/callback` 라우트 추가 |
| `pages/AdminView.jsx` | 회원 등록 폼의 단체 자유 입력을 드롭다운으로, 역할 선택 추가 |

### 권한 판정 교체 (6곳)

`user.admin_info?.approved` → `user.role === 'admin'`

- `App.jsx:44`
- `components/layout/Header.jsx:42`
- `components/layout/Sidebar.jsx:34`
- `components/modals/NeedPostDetailModal.jsx:11`
- `components/modals/TicketDetailModal.jsx:15`
- `pages/AdminView.jsx:119`

`admin_users` 테이블을 삭제하므로 여섯 곳을 한 번에 바꾼다.

프론트 딥링크는 이미 동작한다. `frontend/Dockerfile`이 `serve -s`로 서빙하므로 SPA fallback이 있다.

## 8. 기존 데이터 마이그레이션 (008)

### 8.1 계정 분류 (확정)

| 이름 | 이메일 | role | 단체 |
|---|---|---|---|
| 관리자 | admin@adogs.com | `admin` | — |
| 장욱 | janguk95@naver.com | `admin` | — |
| 최윤지 | ynco32@gmail.com | `admin` | — |
| 어독스 | adogsyou@gmail.com | `org` | 어독스 (id=1) |
| ADOGS | adogs-ticket@gmail.com | `org` | 어독스 (id=1) |
| 혜인맘 | stat79@naver.com | `org` | 어독스 (id=1) |
| 샘플단체 | kalepassh@gmail.com | `org` | 어독스 (id=1) |

`organizations` 테이블에는 현재 `id=1, name=어독스, slug=adogs` 한 행만 있다.

### 8.2 마이그레이션 순서

CHECK 제약을 먼저 걸면 기존 행이 위반하므로 순서를 지킨다.

1. `role`, `organization_id`, `kakao_user_id` 컬럼 추가 (`role` 기본값 `org`)
2. 8.1 표대로 `UPDATE`
3. `hashed_password`, `email`을 NULL 허용으로 변경
4. `organization` 컬럼 제거
5. CHECK 제약 3개 추가
6. `guest_ticket_submissions`에 `user_id`, `lookup_token` 추가 → 기존 4건에 랜덤 토큰 채우기 → NOT NULL 적용
7. `admin_users` 테이블 삭제

`downgrade()`에 역방향을 모두 작성한다. `admin_users` 재생성 후 `role='admin'`인 사용자를 되돌려 넣는 것까지 포함한다.

`docs/backend.md`의 삭제 전수 검사 규칙에 따라, 이 마이그레이션 파일은 생성 후 전체를 사장님께 보여드리고 승인받은 다음 실행한다.

## 9. 인프라

### 9.1 마이그레이션 자동 실행이 없다

`backend/Dockerfile`의 CMD는 uvicorn만 띄우고 `deploy.yml`에도 alembic 단계가 없다. 프로덕션이 007까지 올라간 것은 수동 실행 결과다. 이 상태로 A를 배포하면 `role` 컬럼이 없는 DB에 그 컬럼을 조회하는 코드가 떠서 앱이 즉시 죽는다.

`deploy.yml`에 컨테이너 기동 전 마이그레이션 단계를 넣는다.

```
docker compose run --rm flight-backend alembic upgrade head
docker compose up -d --remove-orphans
```

**이번 008은 자동에 맡기지 않는다.** 테이블 삭제가 있으므로 백업 → 파일 승인 → 수동 적용 → 코드 배포 순서로 간다. 자동화 단계는 그 이후를 위한 것이다.

### 9.2 `docker-compose.yml`

| 변경 | 이유 |
|---|---|
| `flight-db`에 healthcheck 추가 | 마이그레이션 자동화에 DB 준비 확인이 필요하다 |
| `flight-backend`의 `depends_on`을 `condition: service_healthy`로 | 지금은 DB가 뜨기만 하면 백엔드가 출발해 마이그레이션이 연결 실패로 깨질 수 있다 |

postgres 포트는 변경하지 않는다.

### 9.3 MinIO를 같은 도커 네트워크로

현재 백엔드는 공용 도메인 `s3-bucket.conkiri.com`을 거쳐 nginx를 왕복한다. minio 컨테이너가 `flight-app` 네트워크에 없어서다.

**주의할 점이 있다.** `/home/ubuntu/minio/docker-compose.yml`은 minio 서비스를 `app-network`에만 연결하는데, 실행 중인 컨테이너는 `app-network`와 `ilchul-network` 둘 다에 붙어 있다. `ilchul-network` 연결은 수동으로 한 것이고 compose에 없다. 이 상태에서 재생성하면 ilchul 프로젝트의 연결이 사라진다.

작업 순서는 이렇다.

1. `/home/ubuntu/minio/docker-compose.yml`에 `flight-app`과 `ilchul-network`를 **함께** 명시 (git 추적 파일이 아니므로 서버에서 직접 편집)
2. minio 스택 재생성. 수 초의 다운타임이 있고 conkiri·ilchul도 영향을 받으므로 사전에 알린다
3. `.env` 값 변경: `MINIO_ENDPOINT=minio:9000`, `MINIO_SECURE=false`

저장된 오브젝트는 같은 인스턴스라 그대로 유지된다.

### 9.4 `.env`

`.env`는 매 배포마다 GitHub Secrets의 `ENV_FILE`에서 생성된다(`deploy.yml:128`). 서버 파일을 직접 고쳐도 다음 배포에 사라지므로 **Secrets 등록이 본체다.**

기존 키에 더해 다음이 필요하다.

```
KAKAO_REST_API_KEY=            # 카카오 개발자 콘솔에서 발급
KAKAO_CLIENT_SECRET=           # 콘솔에서 활성화한 경우만
KAKAO_REDIRECT_URI=https://adogs-ticket.shop/auth/kakao/callback
COOKIE_SECURE=true
```

기존 MinIO 키는 값만 바꾼다 (9.3 참조).

완성본은 현재 서버 `.env`를 읽어 위 항목을 반영해 만들어 드린다.

### 9.5 nginx는 변경하지 않는다

확인 결과 고칠 것이 없다. 프론트가 `serve -s`로 서빙되어 SPA 딥링크가 동작하고, `Set-Cookie`는 `proxy_pass` 기본 동작으로 통과하며, 업로드 한도 50M도 이미 설정돼 있다.

### 9.6 선택 항목 — MinIO 전용 계정

지금 flight-app은 conkiri 프로젝트의 루트 관리자 자격증명(`conkiri-admin`)을 공용한다. `eticket-images` 버킷만 접근 가능한 전용 계정으로 분리할 수 있다. 필수는 아니고 별도 작업으로 해도 된다.

## 10. 에러 처리

### 카카오 이메일이 기존 단체 계정과 같은 경우

**자동으로 합치지 않는다.** 별개 계정으로 둔다. 카카오가 준 이메일이 검증된 것인지 보장할 수 없어, 이메일만 보고 병합하면 남의 단체 계정을 가져갈 길이 열린다. 합쳐야 하면 관리자가 확인하고 수동으로 처리한다.

### 그 외

| 상황 | 응답 |
|---|---|
| 카카오가 이메일을 주지 않음 | 정상 처리 (`email`은 NULL) |
| 클레임인데 이미 주인이 있음 | 409 |
| 클레임인데 `lookup_token` 불일치 | 404 |
| `state` 검증 실패 | 400 |
| 카카오 API 응답 실패 | 502 |
| refresh까지 만료 | 401 |

## 11. 테스트

프로젝트에 테스트가 없고 pytest도 설치돼 있지 않다(`GEMINI.md`가 언급하는 `pyproject.toml`도 실제로는 없다). 인증과 권한을 바꾸는 작업이므로 pytest와 httpx를 추가하고 SQLite로 도는 테스트를 쓴다.

1. **역할별 접근 통제** — `general`이 단체 화면을, `org`가 관리자 화면을 열지 못한다
2. **단체 격리** — 단체 A가 단체 B로 지정된 제출을 목록·상세·이미지 어디서도 볼 수 없다
3. **사일런트 리프레시** — 만료된 access 쿠키 + 유효한 refresh 쿠키로 요청하면 401이 아니라 200이 오고 새 쿠키가 내려온다
4. **동시 요청** — 만료된 상태로 여러 요청이 동시에 들어와도 로그아웃되지 않는다
5. **클레임** — 정상, 중복, 토큰 불일치
6. **마이그레이션 왕복** — `upgrade` → `downgrade` → `upgrade`로 `admin_users` 삭제와 복원을 증명한다

6번은 프로덕션에서 테이블을 지우는 마이그레이션이므로 특히 중요하다.

## 12. 배포 순서

1. 프로덕션 DB 백업 (`pg_dump`)
2. 마이그레이션 파일 전체를 사장님께 보여드리고 승인
3. 백업 복원 절차 확인
4. MinIO 네트워크 작업 (9.3)
5. `ENV_FILE` 시크릿 갱신 (카카오 키 포함, MinIO 값 변경)
6. 마이그레이션 수동 적용
7. 코드 배포
8. 실제 확인 — 카카오 로그인, 기존 이메일 로그인, 사일런트 리프레시, 단체 격리

MinIO 네트워크 작업이 `ENV_FILE` 갱신보다 먼저다. `.env`가 `minio:9000`을 가리키는데 네트워크가 아직 붙어 있지 않으면 e티켓 업로드가 실패한다. `.env`는 배포(7단계) 시점에 적용되므로 4번과 5번 사이에 서비스가 깨지는 구간은 없다.

## 13. 사장님이 해주셔야 하는 일

1. **카카오 개발자 콘솔** — 앱 생성, REST API 키 발급, Redirect URI `https://adogs-ticket.shop/auth/kakao/callback` 등록
2. **GitHub Secrets** — 제가 만들어 드리는 `.env` 완성본을 `ENV_FILE`에 등록
3. **마이그레이션 파일 승인** — 테이블 삭제가 포함되어 있다

## 14. 범위 밖

- #7 진행단계 화면과 상태머신 (B)
- 조회링크 화면 자체 (B, 컬럼만 A에서 준비)
- 드라이브 폴더 생성 활성화 (B)
- 단체 관리자 알림 (B)
- 국가 색인 (B)
- 랜딩페이지, 비로그인 강아지 리스트, 3버튼 IA (C)
- postgres 외부 노출 차단
- MinIO 전용 계정 분리 (9.6, 선택)
