# 🚀 작업 계획 및 기록 (Harness Execution)

## [TICKET-CHECKLIST] 티켓별 출국 준비 체크리스트 (2026-11-25)

[참조 하네스]: AGENTS.md, docs/backend.md, docs/frontend.md, docs/security.md, issue.md
[준수 보안 규칙]:
- 체크리스트 조회·수정은 티켓 소유자와 `admin`만. 기존 `_get_ticket_for_departure` 게이트를 재사용하고 라우터는 `OrgUser`로 잠근다.
- 공용 `schemas.Ticket`에는 체크리스트를 노출하지 않는다(다른 단체가 티켓 목록에서 진행 상황을 보지 못하게 한다).
- 스키마 변경은 Alembic 마이그레이션으로만 한다. `Base.metadata.create_all` 미사용, `env.py`의 `import models` 및 `drop_table` 미포함 확인.
- `/admin/ui` 미리보기는 샘플 응답만 사용하고 실제 API로 변경 요청을 보내지 않는다.
[사용자 결정]: 기본 템플릿 + 항목 추가/수정 · 기한 없이 완료 여부만 · 소유자·admin만 열람 · 기존 출국 준비 추가정보는 읽기 전용 진행률로 함께 표시
[승인]: 사용자의 "브랜치 하나 파서 실행하자" 지시로 실행 승인됨. 작업 브랜치 `feature/ticket-departure-checklist`.

### 설계 요약
- 새 테이블 `ticket_checklist_items`(티켓 1:N). 항목은 `label`, `note`, `is_done`, `completed_at`, `sort_order`, `template_key`(기본 항목 식별용, 직접 추가한 항목은 `NULL`).
- 기본 항목은 `backend/static_data.py`의 `DEPARTURE_CHECKLIST_TEMPLATE`에 둔다(항공사 반려동물 동반 예약, 수출 검역증명서, 광견병 접종·항체, 마이크로칩, 도착국 입국 서류, 켄넬 규격, 현지 인수자 연락, 공항 미팅 시간·장소, 공항 인수 확인).
- 시드 시점: 티켓 생성 시 자동 생성 + 기존 티켓은 첫 조회 시 생성. 재생성 방지를 위해 `tickets.checklist_initialized_at` 컬럼을 둔다(항목을 모두 지워도 되살아나지 않게 한다).
- 기존 출국 준비 추가정보(주소·카카오 ID·여권·자리확약·e티켓)는 컬럼을 중복으로 만들지 않고, 조회 응답의 `documents` 파생값으로 읽기 전용 진행률만 보여준다.

### 백엔드
- [x] `backend/models.py`: `TicketChecklistItem` 모델과 `Ticket.checklist_items` 관계(`cascade="all, delete-orphan"`), `Ticket.checklist_initialized_at` 추가
- [x] `backend/static_data.py`: `DEPARTURE_CHECKLIST_TEMPLATE`(template_key·label·sort_order) 정의
- [x] `backend/schemas.py`: `TicketChecklistItemCreate/Update/TicketChecklistItem`, 진행률·문서 상태를 담는 `TicketChecklist` 응답 스키마 추가(공용 `Ticket` 스키마는 변경하지 않음)
- [x] `backend/routers/tickets.py`: `_get_ticket_for_departure` 재사용하여 `GET/POST /{id}/checklist`, `PUT/DELETE /{id}/checklist/{item_id}`, 기본 항목 복원 `POST /{id}/checklist/restore-template` 추가. `create_ticket`에서 템플릿 시드
- [x] `backend/alembic/versions/022_add_ticket_checklist.py`: 테이블 생성 + `tickets.checklist_initialized_at` 추가, `downgrade`로 되돌리기
- [x] `backend/tests/test_ticket_checklist.py`: 템플릿 시드, 항목 추가·완료·삭제, 전체 삭제 후 재시드 안 됨, 템플릿 복원, 타 단체·`general` 403

### 프론트엔드
- [x] `frontend/src/utils/ticketChecklistUtils.js`: 템플릿 메타(라벨·아이콘), 진행률 계산, 기존 추가정보 기반 문서 항목 파생
- [x] `frontend/src/components/modals/TicketChecklistSection.jsx`: 공통 primitives만 사용한 체크리스트 패널(완료 토글·항목 추가·수정·삭제·진행률·문서 상태). 조회 중에는 공통 `LoadingSkeleton` 사용, 실패 시 스켈레톤 종료 및 오류 표시
- [x] `frontend/src/components/modals/TicketDetailModal.jsx`: 소유자·admin에게만 섹션 노출, 공유 이미지 캡처 영역(`contentRef`) 밖에 배치
- [x] `frontend/src/components/ui/uiVariants.js`: 필요한 신규 스타일(체크박스 입력, 체크리스트 행·진행률 바)을 `usedBy`와 함께 등록하고 기존 variant는 재사용
- [x] `frontend/src/components/ui/BusinessComponentCatalog.jsx` + `previewData.js`: `TicketChecklistSection` 등록 및 체크리스트 샘플 응답 추가(실제 API 요청 없음)

### 검증
- [x] 백엔드: `ruff check`, `pytest tests/test_ticket_checklist.py` 및 기존 테스트, 마이그레이션 수동 검토(`drop_table` 없음, `import models` 확인)
- [x] 프론트엔드: `npm run lint`, `node --test tests/*.test.mjs`, `npm run build`
- [x] 소유자·admin 접근과 타 단체 차단, `/admin/ui` 미리보기의 변경 요청 0건 확인
- [x] 에이전트가 띄운 서버·임시 산출물 정리, AI Auditor(`.agents/skills/ai_audit.py`) 부재 사실 기록

AI Auditor: `.agents/skills/ai_audit.py`가 저장소에 없어 실행하지 못함. 아래는 실제 실행한 로컬 검사 결과이며 AI Auditor 통과를 의미하지 않음.

검증 결과:
- 린트 검사 결과: Pass. 프론트엔드 `npm run lint` 오류 0, 경고 18개로 변경 전과 동일하며 신규 파일에서 발생한 경고는 0개.
- 백엔드 ruff: 저장소에 ruff 설정도 ruff 의존성도 없어 `venv`에 ruff를 설치해 기본 규칙으로 실행함(`requirements.txt`는 변경하지 않음). 신규/수정 파일의 지적은 기존 코드와 같은 `UP017`(`datetime.timezone.utc`) 4건뿐이며, 저장소 전체 UP017은 19건 → 23건. 주변 코드 관례를 유지하기 위해 `timezone.utc`를 그대로 사용함.
- 백엔드 테스트: 신규 `tests/test_ticket_checklist.py` 18개 전부 통과. 전체 스위트 186 passed / 1 failed이며, 실패한 `test_claim.py::test_create_guest_submission_generates_lookup_token`은 HEAD 워크트리에서도 동일하게 실패하는 기존 실패로 이번 변경과 무관함을 확인함.
- 프론트엔드 테스트: `node --test tests/*.test.mjs` 15/15 통과(신규 `tests/ticket-checklist.test.mjs` 6개 포함). `npm run build` 통과, 운영 `dist/sw.js` 사전 캐시 10개 항목 유지.
- 마이그레이션: scratchpad 전용 sqlite에 `alembic upgrade head`로 021 → 022 적용, `downgrade 021`로 테이블·컬럼 제거 후 재적용까지 확인. 생성 인덱스 3개(`ticket_id`, `is_done`, `created_by_id`)와 `tickets.checklist_initialized_at` 확인. `drop_table`/`drop_column`은 `downgrade`에만 존재하며 `env.py`의 `import models`도 확인함. 사용자의 `backend/data/flight.db`는 건드리지 않음.
- 실제 앱 검증(scratchpad DB + 로컬 8000/5173): 체크리스트 이전에 만든 티켓을 상세 모달에서 열자 기본 9개 항목이 생성되고 '제출 서류 2/5'(주소·여권 ✓)가 읽기 전용으로 표시됨. 체크박스 완료 시 진행률·막대·완료일 반영, 항목 추가(메모 포함) 후 맨 뒤 배치, 인라인 수정 시 메모 보존, 공용 티켓 응답에 체크리스트 키 없음을 확인함.
- API 직접 검증: 빈 라벨 422, 항목 전체 삭제 후 재조회해도 기본 항목이 되살아나지 않음, `restore-template`이 지워진 기본 항목만 복원하고 완료 상태를 보존함. 백엔드 액세스 로그에서 브라우저가 호출한 체크리스트 요청은 전부 200/201이고 5xx는 0건.
- 반응형: 약 500px 폭에서 서류 칩 줄바꿈, 항목 행 가로 넘침 없음, 수정·삭제 버튼 유지 확인. 브라우저 콘솔 오류 0건.
- `/admin/ui` 미리보기: admin 계정으로 '출국 준비 체크리스트 · TicketChecklistSection'을 열어 샘플 데이터(1/3 완료, 제출 서류 2/5, 복원 링크)가 렌더되는 것을 확인했고, 완료 토글·기본 항목 복원·항목 추가 폼을 눌러도 백엔드 액세스 로그에 체크리스트 요청 0건(로그인 외 변경 요청 0건)임을 확인함.
- 정리: 에이전트가 띄운 8000/5173 서버 종료, 검증용 sqlite·쿠키·시드 스크립트·`frontend/dev-dist`·비교용 worktree 삭제. CI·운영 배포는 실행하지 않음.
- 남은 사항: 삭제 확인 대화상자(`window.confirm`)가 브라우저 자동화를 멈추게 해 항목 삭제는 API로만 검증함. 백엔드 `venv`에 설치한 ruff는 그대로 두었으므로 필요하면 제거하거나 개발 의존성으로 고정하면 된다.

## [PWA-PUSH] vite dev에서 서비스 워커 등록 (2026-11-22)

[참조 하네스]: AGENTS.md, docs/pwa-web-push.md, docs/frontend.md, docs/security.md
[준수 보안 규칙]: 프론트엔드에 VAPID 비밀키 미포함, 운영 secret 공급 경로(`FLIGHT_SECRET_DIRECTORY`) 변경 없음, dev 워커가 인증 API·업로드 응답을 캐시하지 않음
[승인]: 사용자의 "로컬 dev에서도 테스트되게 devOptions 추가" 요청으로 실행 승인됨.

- [x] `frontend/vite.config.js`의 `VitePWA`에 `devOptions: { enabled: true, type: 'module' }` 추가
- [x] `push.js`의 "로컬에서는 빌드 미리보기를 사용해 주세요" 안내와 dev 워커 부재 주석 갱신
- [x] 플러그인이 만드는 `frontend/dev-dist/`를 `frontend/.gitignore`에 추가
- [x] `docs/pwa-web-push.md` 로컬 검증 절차에 dev 등록·미사전캐시·`dev-dist` 제외 기록
- [x] 린트, Node 테스트, 빌드 및 dev 등록 경로 검증, 임시 산출물 정리

AI Auditor: `.agents/skills/ai_audit.py`가 저장소에 없어 실행하지 못함. 아래는 실제 실행한 로컬 검사 결과이며 AI Auditor 통과를 의미하지 않음.

검증 결과:
- 린트 검사 결과: Pass (`npm run lint` 오류 0, 기존 경고 18개로 변경 전과 동일).
- `node --test tests/*.test.mjs`: 9/9 통과. `npm run build`: 통과, 운영 `dist/sw.js`의 사전 캐시 10개 항목 유지.
- dev 서버(5199) 검증: `index.html`에 `vite-plugin-pwa:register-dev-sw` 주입, HMR 핸드셰이크 응답 `{mode: script, scope: "/", inlinePath: "/dev-sw.js?dev-sw", swType: module}`, `/registerSW.js`가 `scope: '/'`로 등록 → `push.js`의 `getRegistration('/')`와 일치.
- `/dev-sw.js?dev-sw`는 `src/sw.js`를 ES 모듈로 서빙하며 `precacheAndRoute([])`로 치환되어 dev 모듈을 사전 캐시하지 않음.
- 에이전트가 실행한 5199 dev 서버 종료, 임시 스크립트·응답 파일 삭제 완료. 실제 브라우저 Push 수신은 VAPID 키 설정 후 사용자 검증 필요. CI·운영 배포는 실행하지 않음.


## [UI-CATALOG] 공통 스켈레톤과 화면별 로딩 적용 (2026-10-07)

[참조 하네스]: AGENTS.md, docs/frontend.md, docs/security.md
[준수 보안 규칙]: 기존 인증·관리자 접근 제어 유지, 데이터 조회와 변경 API 보존, 미리보기에서 실제 API 요청 금지
[승인]: 사용자의 공통 UI 생성 및 각 페이지 적용 요청으로 실행 승인됨.

- [x] 기본 스켈레톤 및 카드·달력·표·소개·상태·패널별 공통 레이아웃과 usedBy 등록
- [x] 페이지 및 조회 모달 로딩에 적용하고 오류·빈 목록·저장 진행 상태 유지
- [x] `/admin/ui`에서 실제 공통 스켈레톤을 선택·미리보기
- [x] 린트, Node 테스트, 빌드 및 샘플 API 기반 로딩 전환·반응형 검증
- [x] 브라우저·개발 서버·임시 산출물 정리

AI Auditor: `.agents/skills/ai_audit.py`가 없어 실행 불가. 로컬 검사 결과를 별도로 기록한다.

검증 결과:
- 린트 검사 결과: Pass (오류 0, 기존 경고 17; 변경한 기존 JS/JSX 파일의 경고는 HEAD와 동일한 8개).
- `node --test tests/*.test.mjs`: 9/9 통과. `npm run build`: 통과 (번들 크기·PWA 옵션 경고 있음).
- 지연 샘플 API로 앱 초기 인증, 달력·리스트, 나눔·내 티켓·구해요·공개 게시판·신청·관리자·제출 검토·단체 소개·제출 상태·알림 설정·신청 단체 조회의 로딩 및 완료 전환 확인.
- 달력 42칸, 티켓 6개 자리표시자 및 로딩 종료 후 빈 결과 확인. 달력·게시판·제출 검토·제출 상태의 오류 전환, 신청자 목록과 e티켓 모달의 완료 전환, 검토 이미지 조회 실패 안내 확인.
- `/admin/ui`의 13개 레이아웃을 390px/1440px에서 확인: 자리표시자 영역 가로 넘침·포커스 가능한 가짜 컨트롤 없음. 동작 줄이기 설정에서 애니메이션 `none`, 기본 설정에서 `pulse` 확인.
- 일반 계정의 `/admin/ui` → `/board` 이동 확인. 샘플 업무 API 변경 요청 0, 페이지 JS 예외 0. 별도로 기존 로컬 OTEL 전송의 CORS 오류를 관찰했으며 스켈레톤 기능 오류와 구분함.
- 브라우저·에이전트가 실행한 4177 서버 종료, 검증 이미지·로그 삭제 완료. CI·운영 배포는 실행하지 않음.

## [UI-CATALOG] 공통 UI와 관리자 미리보기 (2026-10-05)

[참조 하네스]: AGENTS.md, docs/frontend.md, docs/security.md
[준수 보안 규칙]: 관리자 접근 제어 유지, 미리보기의 실제 API 변경 요청 차단

- [x] 기존 디자인을 보존하면서 기본 UI를 공통 컴포넌트와 스타일 정의로 연결
- [x] `/admin/ui`에 실제 공통 요소·업무 컴포넌트를 샘플 데이터로 렌더링
- [x] 공통 UI 사용·등록 규칙 및 기존 Gemini 지침을 `AGENTS.md`에 모으고 상대 심볼릭 링크 연결
- [x] 프론트엔드 린트: 오류 0개, 기존 `react-hooks/set-state-in-effect` 경고 17개 (이전 커밋과 비교 확인)
- [x] Node 테스트 9개 및 프로덕션 빌드 통과
- [x] 샘플 API 기반 브라우저 검증: 257개 스타일, 업무 컴포넌트 16개, 관리자 권한, 실제 화면의 폼·검색·파일 업로드 및 모바일 너비 확인
- [x] 브라우저·미리보기 서버 종료 및 검증 임시 파일 정리

AI Auditor: `.agents/skills/ai_audit.py`가 저장소에 없어 실행하지 못함. 위 결과는 실제 실행한 로컬 검사 결과이며 AI Auditor 통과를 의미하지 않음.

## [v1.1.3] 정적 HTML 전환 및 구글 소유권 인증 (Completed)
- [x] `privacy.html`, `terms.html` 정적 파일 생성 (public/)
- [x] Google 사이트 인증 파일 생성 (`google365faeee479720af.html`)
- [x] `Footer.jsx` 링크 수정 (`Link` -> `a` 태그)
- [x] 기존 SPA 내 약관 페이지 및 라우트 삭제
- [x] 린트 검사 및 최종 확인

---

## [v1.7] 동기화 연속성 강화 및 역방향 반영 (Completed)
- [x] **1. 데이터베이스 내 동기화 데이터 보존 로직 (backend/routers/gdrive.py)**
  - [x] access_token을 nullable로 변경하여 루프 시 데이터 보존 가능하게 함.
  - [x] disconnect_google_drive: 데이터베이스 비우지 않고 상태만 변경하도록.
- [x] **2. 동기화 재구성(Reconciliation) 로직 구현 (backend/services/gdrive_service.py)**
  - [x] sync_drive_to_web: 폴더명 변경 감지 및 데이터베이스 상태 동기화 로직 추가.
- [x] **3. 역방향 업데이트(Reverse Update)**
  - [x] backend/routers/gdrive.py: 폴더 삭제 시 초기 상태로 동기화 해제 처리.
- [x] **4. 스키마 업데이트**
  - [x] User 모델 및 schemas.py(전체) 필드 추가.
  - [x] 기존 DB 모델명 유지 로직 추가.
- [x] **5. 검증**
  - [x] ruff check를 통해 코드 품질 관리.

---
---

## [v1.8] frontend/src/App.jsx Conflict 해결 (Completed)
- [x] `frontend/src/App.jsx` 충돌 마커 제거 및 양쪽 라우트/컴포넌트 통합
  - [x] `VolunteerGuideView`, `KakaoCallback`, `GeneralHome` import 통합
  - [x] 공개 라우트 (`/apply`, `/guide`, `/auth/kakao/callback`) 배치
  - [x] `!user` (비로그인) 시 LandingPage/LoginScreen 라우팅 및 `user.role === 'general'` 사용자 GeneralHome 라우팅 적용
- [x] 프론트엔드 린트 검사 (`npm run lint`) 수행

---
[참조 하네스]: docs/frontend.md, docs/security.md, docs/superpowers/specs/2026-07-26-role-model-and-kakao-auth-design.md
[린트 검사 결과]: Pass
