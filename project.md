# Project: Flight-App (강아지 이동 봉사 매칭 플랫폼)

## ✈️ 개요
본 프로젝트는 출국을 앞둔 티켓 소유자와 강아지 이동 봉사가 필요한 보호자를 연결하는 플랫폼입니다. 모바일 최적화된 UI와 엄격한 보안 하네스를 통해 안전하고 편리한 매칭 경험을 제공합니다.

## 📋 핵심 하네스 문서 (Docs)
작업 시 아래 문서를 반드시 먼저 참조하여 프로젝트 제약을 준수하십시오.

1. **[Backend Spec](./docs/backend.md)**: FastAPI 스택, DB 모델, 정적 데이터 명세. (AI_HARNESS_RULES 포함)
2. **[Frontend Spec](./docs/frontend.md)**: React 구조, 모바일 UI 규칙, 컴포넌트 가이드. (AI_HARNESS_RULES 포함)
3. **[Security Spec](./docs/security.md)**: 인증/인가 정책, 개인정보 보호 및 RBAC 규칙.

## 🚀 아키텍처
- **Backend**: FastAPI + SQLAlchemy + Pydantic v2
- **Frontend**: React (Vite) + Context API + Vanilla CSS
- **Database**: PostgreSQL (v1.4 Migration Completed)

## 📌 주요 데이터 모델
- **Ticket**: 티켓 소유자의 비행 정보.
- **NeedPost**: 이동 봉사가 필요한 게시글.
- **TicketApplication**: 티켓에 대한 봉사 신청 정보.
- **Airport / Airline (Master)**: 공항/항공사 중앙 마스터 테이블. (색상 및 활성 상태 관리)

## ⚙️ 주요 기능
- **일정 관리**: 달력 및 리스트 뷰를 통한 티켓 관리 및 필터링.
- **구해요 게시판**: 봉사가 필요한 일정 공유.
- **관리자 대시보드**: 회원 관리 및 공항/항공사 마스터 데이터 관리. (실시간 미리보기 포함)

## 📅 로드맵 및 이슈
현재 진행 상황 및 향후 계획은 **[issue.md](./issue.md)**를 참조하십시오.
현재 작업 중인 실시간 체크리스트는 **[todo.md](./todo.md)**를 참조하십시오.
