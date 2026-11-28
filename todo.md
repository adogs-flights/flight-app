# 🚀 작업 계획 및 기록 (Harness Execution)

## [AWS-MIGRATION] AWS 이전 (2026-11-28)

[참조 하네스]: AGENTS.md, docs/vault-runtime.md, docs/backend.md, docs/security.md, issue.md
[상태]: **계획 수립 완료 · 사용자 승인 대기 중. 코드 미수정.**

[사용자 결정]
- 서버를 Oracle Cloud 단일 VM에서 AWS로 이전한다.
- **AWS 이전을 먼저 완료하고, 주 도메인 교체는 그 다음 별도 작업으로 한다**(아래 `[DOMAIN-SWITCH]` 항목).
- 아키텍처는 비용·적합도 비교 결과 1순위(EC2 Graviton 단일 노드 + CloudFront + S3 + SSM)로 시작한다.
- 이 작업에서 도메인은 `adogs-ticket.shop`을 그대로 유지한다. 검증 입구로만 임시 서브도메인 `aws.adogs-ticket.shop`을 쓰고 전환 후 제거한다. **새 도메인 이름은 이 작업의 선행 조건이 아니다.**

[미확정 입력 — 승인 시 함께 알려줘야 하는 것]
1. ~~OCI 호스트 접근 가능 여부~~ → **해결: A등급(이식).** 0단계 기록 참조.
2. ~~배포 방식~~ → **결정: GitHub OIDC + SSM Send-Command.** 인바운드 22번을 열지 않고 장기 자격증명도 저장하지 않는다.
3. **DB (미결)**: 1순위대로 인스턴스 내 PostgreSQL 컨테이너로 시작 vs 처음부터 RDS db.t4g.micro(월 +$20.9). `flight-db`가 9.2MB로 매우 작아 어느 쪽이든 이전은 수초면 끝난다.
4. **2단계 점검 시간대** — 데이터가 30MB라 전송은 수초이고 DNS 전파가 지배한다. Cloudflare 프록시라 전파가 거의 즉시이므로 중단은 분 단위로 예상된다.

[준수 보안 규칙]
- 시크릿은 **파일 마운트 방식을 유지**한다. `backend/runtime_secrets.py`의 계약(`/run` tmpfs 세대, uid 0, 0750/0640, `CONFIG_JSON` 단일 파일, 환경변수에 시크릿 미복사)을 그대로 보존한다. SSM 값을 컨테이너 환경변수로 내리지 않는다.
- **컨테이너의 IMDS 접근을 차단**한다. IMDSv2 강제 + `HttpPutResponseHopLimit=1` + 컨테이너 네트워크에서 `169.254.169.254` 차단(현 `imds-guard.py`와 같은 목적).
- **DDL 권한 분리를 유지**한다. 런타임 계정은 CRUD만, 마이그레이션 전용 자격증명만 DDL. 런타임 마운트로 Alembic을 실행하지 않는다.
- `BASE_URL`은 환경변수 고정값을 유지한다. 요청 `Host` 기반 동적 해석은 도입하지 않는다(호스트 헤더 인젝션 표면을 만들지 않는다).
- S3 버킷은 **퍼블릭 액세스 전면 차단**. 업로드 조회는 지금처럼 백엔드 경유를 유지한다(프리사인/CDN 직접 서빙은 범위 밖).
- 임시 서브도메인 `aws.adogs-ticket.shop`은 **외부 접근을 차단**하고 `noindex`를 적용한다. 검증용 복제 DB에 실제 사용자 데이터가 섞이거나 스테이징이 검색에 노출되지 않게 한다.
- 1단계에서 **구글 드라이브 웹훅은 등록하지 않는다.** 실제 드라이브 이벤트가 검증용 DB에 티켓을 만들지 않게 한다.
- 관리자 접근 제어(`user.role === 'admin'`)와 `/admin/ui` 미리보기 격리를 유지한다.

### 설계 요약

**아키텍처**: EC2 t4g.small(Graviton, arm64 이미지 그대로) 단일 노드에 nginx·정적 FE·백엔드·PostgreSQL 컨테이너. 업로드는 S3(MinIO 클라이언트가 S3 호환이라 `storage_service.py` 코드 변경 없음), 시크릿은 SSM 파라미터 스토어(표준·무료)에서 호스트가 읽어 `/run`에 세대 발행, 진입은 CloudFront(영구 무료 1TB 한도로 TLS·캐싱·대역폭 흡수) + Route 53 + ACM. 월 약 $22, 1년 Savings Plan 적용 시 약 $18.

**왜 이 구성인가**: ALB($17.4+IPv4 $7.3)·NAT Gateway($43.1)·Aurora 최소 ACU($44~51) 같은 트래픽 무관 고정비를 전부 피한다. arm64 빌드 파이프라인·`docker compose` 구조·파일 마운트 시크릿 설계를 유지하므로 이전 작업 부피가 가장 작고, 실패 시 DNS만 되돌려 복귀할 수 있다.

**도메인을 건드리지 않는 이유**: 이 작업의 목표는 "같은 주소, 다른 서버"다. `BASE_URL`·`KAKAO_REDIRECT_URI`·og 태그·쿠키·푸시 구독·PWA 스코프를 전혀 바꾸지 않으므로 사용자 입장에서는 아무 일도 일어나지 않는다. 검증은 임시 서브도메인에서 끝내고, 전환은 기존 도메인의 DNS 한 번으로 완료한다.

### 0단계 · 사전 확인
- [x] **OCI 호스트 접근 확인 — A등급(이식 가능).** 2026-11-28: `ubuntu@158.180.94.64:58116` SSH·`sudo` 가능, `instance-20260211-1517`·`aarch64`. `/opt/project-management-runtime/current/ops/oci-runtime/`의 40개 파일 전부 읽기 가능하며 `imds-guard.py`·`migrate-flight.mjs`·`service-readiness.mjs`·`flight-secrets.service`·`flight-runtime.service`·`backup-flight-db.sh`·`provision-flight-roles.mjs`·`vault-*.mjs` 확인. `flight-secrets`/`flight-runtime` 유닛 모두 `enabled`. **AWS용 발행기는 신규 작성이 아니라 이식으로 진행한다.**
- [x] **용량 측정 완료 — 총 약 30MB.** `flight-db` 9.2MB(공유 PostgreSQL 내), 업로드 20MB(52개 항목, 최신 2026-11-21), 레거시 MinIO 약 784KB. **점검 시간은 DNS 전파가 지배하며 데이터 전송은 수초 수준이다.**
- [x] **호스트가 멀티테넌트 공유 플랫폼임을 확인.** flight 외에 `project-management`(DB 2.46GB), `youtube-sync`, `ilchul`, `conkiri`가 같은 호스트에서 동작하고 PostgreSQL·MinIO·Redis·RabbitMQ·MySQL과 관측 스택(prometheus·grafana·loki·tempo·pyroscope·cadvisor)을 공유한다(총 25개 이상 컨테이너). **이전은 "서버 교체"가 아니라 "타인 소유 공유 플랫폼에서 독립"하는 작업이다.** 따라서 1단계에 관측 스택 대체와 공유 자원에서 flight 몫만 분리하는 작업이 포함된다.
- [x] **운영용 AWS 계정 확보 완료 — `966203577238`.** 2026-11-28: 조직 미소속(`AWSOrganizationsNotInUseException`)이며 계정 활성화가 끝나 서울 리전 EC2 호출이 성공한다(`OptInRequired` 해소). 로컬 `default` 프로파일을 이 계정·`ap-northeast-2`로 설정함. 이전 경위: 2026-11-28 확인: 보유 계정 `858093957974`는 타인의 조직(`o-jhm010zse2`, 관리 계정 `572878595811`) 소속이며 SCP가 홈 리전 `ap-southeast-2` 외 모든 리전을 명시적으로 거부한다. 서울 리전은 계정 수준에서 `ENABLED_BY_DEFAULT`이므로 원인은 조직 정책이고 본인이 해제할 수 없다. 학습용 샌드박스로 판단되어 **운영에 사용하지 않는다** — 지연(왕복 130~160ms), 통제권 부재, 샌드박스 수명, 그리고 여권·이티켓 등 개인정보를 제3자 관리 조직 계정에 두는 문제 때문이다. 조직에 속하지 않은 단독 계정을 확보하고 리전은 `ap-northeast-2`로 확정한다
- [ ] 기존 서울 EC2(`13.125.219.53`, `known_hosts` 기록)가 어느 계정 소유인지 확인. 본인 단독 계정이면 신규 생성 없이 재사용 가능
- [x] **Budgets 예산 알림 설정 완료.** 2026-11-28: 월 $30 `haebong-monthly`, 실제 사용 50%·80%·100%와 예측 100%에서 `adogs.ticket@gmail.com`으로 알림. 리소스 생성 전에 설정함
- [x] **루트 MFA 활성화 완료** (`AccountMFAEnabled = 1`). 루트 액세스 키는 만들지 않았고 CLI 인증은 `aws login` 임시 자격증명을 사용한다
- [ ] 로컬 도구: AWS CLI 설치 완료(`aws-cli/2.42.5`). 인증은 `aws login`(콘솔 세션 기반 임시 자격증명)을 사용하며 장기 액세스 키를 디스크에 두지 않는다. **저장소가 public이므로 자격증명을 저장소에 넣지 않는다**
- [ ] 현재 OCI 요금 등급 확인(Always Free면 이전 후 비용이 0에서 증가하는 점을 명시적으로 합의)
- [ ] `adogs-ticket.shop` DNS 관리 위치 확인(Route 53 이전 여부는 선택. 네임서버 유지한 채 레코드만 바꿔도 된다)

### 1단계 · AWS 구축 및 검증 (운영 영향 0, 기존 도메인 그대로)
인프라
- [ ] EC2 t4g.small + EBS gp3 30GB + 스왑 2GB, 보안 그룹(인바운드는 CloudFront 프리픽스 리스트와 운영자 경로만)
- [ ] IAM 인스턴스 프로파일: SSM 파라미터 읽기 + 해당 S3 버킷만
- [ ] S3 버킷 생성(퍼블릭 차단, 버전 관리)
- [ ] **업로드 저장 방식 교정 (2026-11-28 발견).** 운영 `flight-backend` 컨테이너에 `MINIO_*` 환경변수가 **하나도 없어** `storage_service.py`의 `USE_LOCAL_STORAGE` 분기가 타고 있다. 즉 여권·이티켓·구조견 사진이 오브젝트 스토리지가 아니라 **VM 로컬 디스크**(`/home/ubuntu/flight-app/data/uploads`, 20MB)에 저장된다. 코드 주석의 "운영에서는 키가 항상 설정되므로 이 경로를 타지 않는다"는 사실과 다르다. AWS에서는 S3 자격증명을 실제로 주입해 이 분기를 타지 않게 하고, 로컬 파일 20MB를 S3로 이관한다
- [ ] **레거시 MinIO 객체 처리 확인.** MinIO에 `eticket-images`(객체 1개) · `flight-logo`(696KB) 버킷이 남아 있으나 현재 앱은 자격증명이 없어 읽을 수 없다. 이 객체 키를 참조하는 DB 행이 있으면 **이미 운영에서 깨져 있는 상태**이므로, 이전 전에 참조 여부를 조회해 확인하고 필요하면 함께 S3로 옮긴다
- [ ] ACM 인증서(**`us-east-1`** 발급, `adogs-ticket.shop` + `aws.adogs-ticket.shop` SAN), CloudFront 배포
- [ ] SSM 파라미터에 `CONFIG_JSON` 이관(현 형식·키 집합 유지)
- [ ] 시크릿 발행기 systemd 유닛 이식(`flight-secrets`/`flight-runtime` 등가) + IMDS 차단 + 재부팅 후 자동 기동 확인
- [ ] `shared-infra`·`monitoring_net` 외부 네트워크 생성 또는 compose에서 정리
- [ ] OTEL 처리 방침 결정(ADOT 수집기 컨테이너 vs 비활성화). 미처리 시 내보내기 실패 로그가 쌓인다
- [ ] 야간 백업 작업: `pg_dump` → S3 + EBS 스냅샷 일정. **1순위 선택의 전제 조건이므로 이 단계에서 반드시 완성**

저장소 변경
- [ ] `docker-compose.yml`: 시크릿 바인드 경로, PostgreSQL 서비스 추가, 외부 네트워크 정리
- [ ] `nginx/conf.d/default.conf`: `server_name`에 기존 도메인 + 임시 서브도메인
- [ ] `.github/workflows/deploy.yml`: `ORACLE_*` → AWS 배포 경로, 헬스체크 Host·URL
- [ ] `scripts/deploy-vault.sh`: `oci-runtime` 경로 → AWS 등가 러너
- [ ] `ALLOWED_ORIGINS`에 임시 서브도메인 오리진 추가(이미 콤마 구분이라 환경변수만)

검증용 데이터 및 접근 차단
- [ ] OCI `pg_dump` → AWS PostgreSQL 복원(스냅샷 시점), MinIO → S3 `mc mirror`
- [ ] `aws.adogs-ticket.shop` 외부 접근 차단(CloudFront 함수 기본 인증 또는 WAF IP 허용) + `noindex`
- [ ] 카카오·구글 콘솔에 임시 서브도메인 콜백 URI **임시 추가**(기존 것 유지, 전환 후 제거)
- [ ] 구글 드라이브 웹훅은 **등록하지 않음**

검증 항목
- [ ] 로그인(이메일·카카오), 티켓 CRUD, 업로드·조회(S3 경유), 메일 발송, 웹푸시, `/admin/ui` 관리자 접근
- [ ] Alembic 마이그레이션 실행 및 실패 시 기존 앱 보존 동작
- [ ] 인스턴스 재부팅 후 시크릿 세대 발행 → 백엔드 자동 기동(현재 OCI에서 미검증 항목이므로 여기서 확인)
- [ ] 컨테이너에서 IMDS 접근 불가 확인, 백엔드 환경변수에 시크릿 미노출 확인

### 1단계 검증 기록 (2026-11-28)

구축 완료: EC2 `i-037a39eaf90d1754a`(t4g.small, arm64), 탄력적 IP `43.200.17.212`,
보안 그룹 `sg-0a003ec2b1a867863`(Cloudflare 15개 대역의 443만, SSH 미개방),
IMDSv2 강제 + hop limit 1, S3 `adogs-ticket-uploads`(퍼블릭 차단·버전 관리),
ECR `flight-backend`(불변 태그)·`flight-frontend`, OIDC 역할 `haebong-github-deploy`,
시크릿 발행기 `haebong-secrets.service`, 기동 게이트 `haebong-runtime.service`.

검증 통과 항목:
- 시크릿 발행 권한 계약: `0750` 디렉터리 / `0640` 파일 / uid 0 / `g-XXXXXX` 세대. `flight-runtime` 그룹 읽기 성공, `nobody` 차단
- DB 권한 분리 실증: `adogs-pg`는 SELECT·INSERT 성공하고 CREATE·DROP 차단. `adogs-pg-mg`는 DDL 성공. 틀린 비밀번호는 scram 거부
- 데이터 이관 정확도: alembic `022`, 테이블 17개, users 8 / organizations 3 / rescue_dogs 2 / rescue_dog_records 2 / ticket_checklist_items 9 / refresh_tokens 160 — **원본과 전 항목 일치**
- 업로드 52개(20MB) 이관, DB가 참조하는 키 3개 모두 디스크에 존재
- 마이그레이션 자격증명 경로: `runtime_secrets` 세대 검증 통과 후 `adogs-pg-mg`로 DB 연결 성공
- ECR 수신: 인스턴스 프로파일로 로그인, 저장된 자격증명 없음
- TLS: Cloudflare Origin CA 인증서(SAN `*.adogs-ticket.shop`, 2041년까지), 인증서·키 짝 일치
- 외부 HTTPS 검증(본인 IP 임시 허용 후 제거): `/`, `/api/static/*`, `/privacy`, `/terms` 모두 200. `/api/tickets`·`/api/users/me` 비로그인 401. `POST /api/token` 틀린 자격증명 401
- 배포 스크립트 실패 경계 테스트 6/6 통과

배포 경로에서 발견해 고친 문제: OIDC 역할의 S3 쓰기 권한 누락, AWS 관리 문서 ARN의
계정 필드(비어 있어야 함), SSM이 `sh`로 실행하는 문제(bash shebang 필요),
오류 보고 쿼리의 JMESPath 한글 키(실제 실패 원인을 가렸다), 이미지 레지스트리
기본값이 GHCR을 가리킨 문제, 마이그레이션 시크릿을 평평한 디렉터리로 넘긴 문제,
`gosu`가 보조 그룹을 재설정해 `group_add`가 사라지는 문제, macOS `tar`의 `._*` 파일이
nginx `conf.d/*.conf`에 섞이는 문제, 인증서를 RTF로 저장해 PEM이 깨진 문제(발행기
검증을 강화해 거부하도록 했다), 인증서와 키가 서로 바뀌어 등록된 문제.

**2단계 전 반드시 확인할 제약**: 현재 Cloudflare SSL/TLS 모드가 **Flexible**이다.
Flexible은 오리진에 평문 80으로 접속하는데 새 인스턴스는 443만 받는다. 따라서
**DNS 전환과 SSL 모드 전환(Full strict)을 동시에** 해야 한다. 순서가 어긋나면
사이트가 끊긴다. 기존 OCI 오리진은 평문 80만 받으므로 모드를 미리 올릴 수도 없다.

### 2단계 · 운영 전환 (짧은 점검, 주소는 그대로)
- [ ] DNS TTL 사전 인하, 점검 공지
- [ ] OCI 쓰기 차단 → 최종 `pg_dump` → AWS 복원, MinIO 증분 미러
- [ ] `adogs-ticket.shop` DNS를 CloudFront로 전환
- [ ] 구글 드라이브 웹훅을 AWS 쪽으로 재등록(주소는 동일 도메인이므로 채널 재생성만)
- [ ] 임시 서브도메인 제거 및 임시 콜백 URI 정리
- [ ] `BASE_URL`·`KAKAO_REDIRECT_URI`·og 태그는 **변경하지 않는다** → 로그인·메일·푸시·PWA 모두 그대로, 사용자 영향 0
- [ ] 롤백 경로: DNS 되돌리기 + OCI 쓰기 재개(단일 동작)
- [ ] 안정화 확인 후 OCI 자원 정리 시점 합의(**즉시 삭제하지 않고 일정 기간 보존**)

### 검증
- [ ] 프론트엔드 변경 후 `frontend`에서 `npm run lint`, `node --test tests/*.test.mjs`, `npm run build`
- [ ] 백엔드 `ruff check`(저장소에 ruff 설정·의존성이 없으므로 기존 관례대로 임시 설치해 실행하고 신규 지적만 보고) 및 `pytest`
- [ ] AI Auditor(`.agents/skills/ai_audit.py`) 부재 시 실행 불가 사실을 기록하고 린트·테스트·빌드 결과와 구분해 보고
- [ ] 검증 결과는 로컬 검증 / CI / 운영 배포 확인으로 구분해 기록
- [ ] 임시 스크립트·스냅샷·검증 산출물 정리

---

## [BACKUP] 야간 백업 구축 (2026-11-28)

[참조 하네스]: AGENTS.md, docs/vault-runtime.md
[상태]: **완료 — 복원까지 검증.**

[배경 — 내가 빠뜨린 항목]
`[AWS-MIGRATION]` 1단계 체크리스트에 "야간 백업 작업: pg_dump → S3 + EBS 스냅샷
일정. **1순위 선택의 전제 조건이므로 이 단계에서 반드시 완성**"이라고 적어두고
실제로 만들지 않았다. 컨테이너 DB를 고른 근거가 "백업을 직접 만든다"였는데,
그 전제가 충족되지 않은 상태로 운영을 전환했다. 확인 결과 systemd 타이머·cron·
백업 스크립트가 모두 없었고 S3에도 백업 객체가 없었다. **EBS 볼륨이 유일한
사본인 상태로 며칠 돌 수 있었다.**

[구성]
- `scripts/backup-flight.sh` — 컨테이너 PostgreSQL을 `pg_dump`로 뜨고(런타임
  자격증명으로 충분하다. DDL 권한이 필요 없다) gzip 후 S3 `_backup/db/`로 보낸다.
  업로드는 `aws s3 sync`로 `_backup/uploads/`에 변경분만 올린다. **삭제는 반영하지
  않는다** — 실수로 지운 파일이 백업에서도 사라지는 것을 막는다
- 안전장치: 빈 덤프·깨진 gzip·테이블 정의 없는 덤프를 올리지 않는다
- 보존: DB 덤프 30일. 업로드는 지우지 않는다
- `haebong-backup.timer` — 매일 19:00 UTC(한국 새벽 4시대), `Persistent=true`로
  인스턴스가 꺼져 있던 동안의 실행을 따라잡는다

[구축 중 고친 문제 둘]
1. **`zcat | grep -q` + `pipefail`** — `grep -q`가 일치 즉시 종료해 `zcat`이
   SIGPIPE로 죽고, `pipefail`이 그것을 파이프라인 실패로 전파했다. 덤프가
   정상인데 "테이블 정의가 없다"고 판정했다. `grep -c`로 바꿨다(입력을 끝까지 읽음)
2. **`NoNewPrivileges=yes` + AppArmor** — 이 옵션이 켜져 있으면 `docker run`이
   컨테이너에 AppArmor 프로필을 적용할 수 없어 `cannot change profile for the
   next exec call`로 거부된다. root로 도커를 호출하는 oneshot 유닛이라 실익이
   없어 제거했다

[검증]
- 타이머 `enabled`/`active`, 예정 실행 확인
- **예정을 기다리지 않고 즉시 실행**해 성공 확인: `28K, 테이블 17개`
- S3 확인: DB 덤프 2건, 업로드 52개·20.7MB
- **복원 검증**: 최신 덤프를 임시 데이터베이스 `restore_probe`로 복원해
  `alembic 022` / users 8 / tickets 75 / 테이블 17개 확인 후 정리.
  운영 DB는 건드리지 않았다

[남은 일]
- [ ] EBS 스냅샷 일정(AWS Backup 또는 DLM). 현재는 S3 백업만 있다. 볼륨 전체
      복구가 필요한 경우를 대비하려면 추가해야 한다
- [ ] 업로드 파일을 S3를 **1차 저장소**로 쓰도록 전환(`MINIO_*` 설정).
      현재는 로컬 디스크가 1차이고 S3는 백업 사본이다

---

## [PUSH-ENABLE] 웹푸시 활성화 (2026-11-28)

[참조 하네스]: AGENTS.md, docs/pwa-web-push.md, docs/security.md
[상태]: **완료 — 실제 알림 수신 확인.**

[배경]
도메인 교체 계획을 세울 때 "교체하면 웹푸시 구독이 전부 무효가 되니 사용자에게
재구독 안내가 필요하다"고 판단했으나, **운영에 웹푸시가 설정돼 있지 않았다.**
`CONFIG_JSON`에 `VAPID_*`가 없었고(`runtime_secrets.py`의 `OPTIONAL_NAMES`라 없어도
기동됨) `push_subscriptions`도 0건이었다. 코드는 완성돼 있고 설정만 비어 있던
상태다. `watch_folder`가 호출되지 않는 것과 같은 패턴이다 — **코드의 존재를 운영
동작의 근거로 삼으면 안 된다는 교훈.**

[작업]
- VAPID 키 쌍 생성(P-256). `web_push_provider.WebPushSettings.from_env`의 검증
  조건(개인키 32바이트, 공개키가 개인키에서 파생된 값과 일치, `VAPID_SUBJECT`가
  `mailto:` 또는 `https:`)을 생성 시점에 미리 통과시켰다
- **값은 `CONFIG_JSON`에 병합했다.** `read_runtime`이 `CONFIG_JSON` 하나만 읽으므로
  별도 SSM 파라미터로는 앱이 보지 못한다. 처음 별도 파라미터로 넣었다가 정정하고
  임시 파라미터는 삭제했다
- 발행기로 세대 발행 후 백엔드 재기동. 프론트엔드는 런타임에
  `/api/push/public-key`로 공개키를 받으므로 **재빌드가 불필요했다**

[검증]
- `WebPushSettings.enabled` → True, `subject` → `mailto:adogs.ticket@gmail.com`
- `/api/push/public-key`가 생성한 공개키와 일치하는 값 반환
- `POST /api/push/subscriptions` 비로그인 401
- 실제 브라우저에서 구독 등록 성공(Apple 푸시 서비스 1건) 및 **알림 수신 확인**
- 백엔드 로그에 발송 오류 0건

[알림이 발송되는 상황]
| 상황 | 수신자 | 이동 경로 |
|---|---|---|
| 티켓에 새 신청 | 티켓 소유자 + 소유 단체 회원 전원 | `/mytickets` |
| 신청 결과 결정(승인·미선정) | 신청자 | `/myapplications` |

이동 경로는 `App.jsx`의 실제 라우트(`mytickets`, `myapplications` — 하이픈 없음)와
일치한다. 발송은 `BackgroundTasks`로 처리되어 응답을 지연시키지 않고 이메일도
함께 간다. 404/410 응답 시 구독 행을 자동 삭제하는 처리가 이미 있다.

---

## [DOMAIN-SWITCH] 주 도메인 교체 (2026-11-28)

[상태]: **실행 완료 — `haebongticket.com`으로 전환. 검증 기록은 아래.**

[사용자 결정]
- 새 도메인은 **`haebongticket.com`**(가비아 등록, 2026-11-28 생성). DNS는 Cloudflare로 이전했다.
- 기존 `adogs-ticket.shop`은 폐기하지 않고 301 리다이렉트로 유지한다.
- 구글 클라우드 프로젝트는 새로 만들지 않고 **기존 프로젝트에 소유자로 추가**받는 경로(A′)를 택했다. `client_id`가 유지되므로 기존 사용자의 드라이브 연동이 끊기지 않는다.
- 이메일은 Gmail SMTP를 유지한다. SES 전환은 임계 경로가 아니므로 하지 않았다.

### 실행 기록

사전 작업(사용자): Cloudflare에 영역 추가 및 가비아 네임서버 변경, A 레코드
`43.200.17.212`(프록시), SSL/TLS Full (strict), 새 도메인용 Origin 인증서 발급,
카카오 콘솔 Redirect URI 추가, 구글 OAuth 클라이언트에 새 도메인 URI·JS 원본 추가,
구글 동의 화면 승인된 도메인 추가, Search Console TXT 소유 확인.

구성 변경:
- 발행기 `publish-secrets.py`에 `TLS_CERT_NEW`·`TLS_KEY_NEW` 슬롯 추가. 두 도메인의
  Origin 인증서를 같은 세대에 발행하고 nginx가 SNI로 구분해 제시한다
- `nginx/conf.d/flight-tls.inc` 분리. `ssl_session_cache`는 공유 영역 이름이 중복되어 쓰지 않는다
- 기존 도메인은 301, `www`도 캐노니컬 하나로 모은다
- **리다이렉트 예외**: 기존 도메인의 `/api/gdrive/webhook`은 그대로 처리한다. 구글
  드라이브 감시 채널이 아직 기존 주소를 가리키고 구글은 리다이렉트를 따라가지 않아
  전부 넘기면 알림이 조용히 유실된다. 채널이 새 주소로 갱신된 뒤 예외를 제거한다
- 호스트 `.env`의 `BASE_URL`·`ALLOWED_ORIGINS`·`KAKAO_REDIRECT_URI` 전환(이전 값 백업).
  `ALLOWED_ORIGINS`에 기존 도메인을 남긴 이유는 전환 직후 캐시된 페이지가 기존
  오리진으로 요청할 수 있기 때문이다

검증: 프론트엔드 린트 오류 0·경고 18(기존과 동일), 프론트엔드 테스트 15/15,
백엔드 `test_kakao_login.py` 11/11, `npm run build` 통과(PWA 사전 캐시 10개 유지).
병행 서빙 단계에서 두 도메인 모두 `/`·`/api/static/*`·`/privacy` 200,
SNI별로 올바른 인증서 제시 확인.

`AI Auditor`(`.agents/skills/ai_audit.py`)는 저장소에 없어 실행하지 못했다.
위 결과는 실제 실행한 로컬 검사이며 AI Auditor 통과를 의미하지 않는다.

### 전환 후 검증 (2026-11-28)

- 캐노니컬 `haebongticket.com`: `/`·`/api/static/airlines`·`/api/organizations/1/logo`·`/privacy`·`/terms` 모두 200
- `adogs-ticket.shop` → 301, **경로 보존** 확인(`/my-tickets` → `/my-tickets`). `www`도 301
- `/api/users/me` 401(인증 보호 유지), `canonical`·`og:url` 태그 반영 확인
- 백엔드가 구성한 외부 연동 주소 전부 새 도메인: `BASE_URL`, `KAKAO_REDIRECT_URI`,
  구글 `REDIRECT_URI`, 구글 `WEBHOOK_URL`

**배포 과정에서 발견해 고친 버그**: nginx 설정은 바인드 마운트라 파일만 바뀌고
프로세스는 메모리의 옛 설정을 계속 쓴다. compose 정의가 그대로면
`docker compose up -d`가 nginx 컨테이너를 재생성하지 않아, 백엔드는 `BASE_URL`이
반영됐는데 기존 도메인이 301을 주지 않는 상태가 됐다. `deploy-aws.sh`에
`nginx -t` → `nginx -s reload`를 추가하고 테스트에 순서 검증을 넣었다.

### 사실 정정 — 드라이브 감시(watch)는 현재 비활성

`gdrive_service.watch_folder`는 정의만 있고 **호출되는 곳이 없다.**
`/setup-folder`는 루트 폴더 ID만 저장하고 감시 채널을 등록하지 않으며,
웹훅 핸들러에도 "단방향 연동을 위해 동기화 로직은 주석 처리함"이라고 적혀 있다.
즉 **드라이브 → 웹 자동 티켓 생성은 운영에서 동작하지 않는다**(`issue.md` v1.6에
구현됐다고 적혀 있으나 이후 단방향으로 되돌린 것으로 보인다).

따라서 도메인 교체로 인해 **감시 채널이 끊길 위험은 없었다.** 등록된 채널이
없으므로 만료될 것도 없다. 구글 Cloud Console 도메인 확인은 완료해 두었고,
나중에 이 기능을 되살릴 때의 선행 조건으로 유효하다.

### 남은 일
- [x] 구글 Cloud Console **도메인 확인**에 `haebongticket.com` 등록 (Search Console TXT 확인 포함 완료)
- [ ] nginx의 `/api/gdrive/webhook` 리다이렉트 예외 제거. 감시 기능이 비활성이라 받는 것이 없는 경로를 보호하고 있다. 드라이브 → 웹 동기화를 되살릴 계획이 없으면 지금 제거해도 된다
- [ ] 카카오톡·SNS 공유 캐시 재수집(디버거로 og 갱신)
- [ ] 기존 도메인 OAuth URI·JS 원본 정리(전환 안정화 후)
- [ ] OCI 자원 정리(flight 관련만. 호스트에 타 서비스가 함께 있다)

[사용자 결정]
- 새 도메인을 앞으로 **주 주소(캐노니컬)로** 쓴다.
- 기존 `adogs-ticket.shop`은 폐기하지 않고 301 리다이렉트로 유지한다.

[선행 조건]
- `[AWS-MIGRATION]` 완료 및 안정화
- 새 도메인 확정, 등록기관 확인, Route 53 호스티드 존
- SES: 새 도메인 인증 + SPF·DKIM·DMARC + 샌드박스 해제 신청(**리드타임이 길어 AWS 이전 중에 미리 착수하는 것이 좋다**)

[사용자 영향 — 사전 공지 필수]
주 주소를 바꾸면 아래는 피할 수 없다. 이것이 이 작업을 AWS 이전과 분리한 이유다.
- **웹푸시 구독 전부 무효.** `endpoint`가 오리진 단위라 `push_subscriptions` 행은 남지만 발송이 실패한다. 마이그레이션 수단이 없어 사용자가 직접 재구독해야 한다
- **설치된 PWA 재설치 필요.** `vite.config.js`의 `id: '/'`·`scope: '/'`·`display: standalone`이 기존 오리진에 묶여 있다
- **전원 1회 재로그인.** 쿠키에 `domain=` 속성이 없어 호스트 한정이다(`auth.py:88`, `:100`)
- 카카오톡·SNS에 캐시된 공유 미리보기가 구 도메인을 가리킨다

### 작업
- [ ] 공지 및 앱 내 배너(주소 변경, 알림 재설정, 앱 재설치, 재로그인)
- [ ] ACM 인증서에 새 도메인 추가, CloudFront 대체 도메인 이름 추가, Route 53 레코드
- [ ] `nginx server_name`에 새 도메인 추가, `ALLOWED_ORIGINS`에 새 오리진 추가
- [ ] `BASE_URL`을 새 도메인으로. 영향 사용처 4곳: `routers/auth.py:748`, `routers/ticket_applications.py:55`, `routers/guest_submissions.py:72`, `services/gdrive_service.py:26`
- [ ] `KAKAO_REDIRECT_URI`를 새 도메인으로(`services/kakao_service.py:17`), 카카오 콘솔에 양쪽 등록
- [ ] 구글: 새 도메인 소유 확인 → OAuth 콜백·Drive 웹훅 재등록(웹훅은 1개만 등록 가능하므로 새 도메인으로 고정)
- [ ] `frontend/index.html`: `og:url`·`og:image`·`og:image:secure_url`·`twitter:image` 5곳 교체, **`canonical` 태그 추가**(현재 없음), 새 도메인용 사이트 소유 확인 파일 배치
- [ ] `adogs-ticket.shop` → 새 도메인 301(CloudFront 함수)
- [ ] SES 발신 도메인 전환
- [ ] 카카오톡·SNS 공유 캐시 재수집
- [ ] 롤백 경로: 환경변수 되돌리기 + 301 제거

---

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
