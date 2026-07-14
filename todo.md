# 🚀 작업 계획 및 기록 (Harness Execution)

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
[참조 하네스]: docs/backend.md, issue.md (v1.6-v1.7)
[린트 검사 결과]: Pass
