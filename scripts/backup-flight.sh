#!/usr/bin/env bash
# 해봉티켓 야간 백업. systemd 타이머가 호출한다.
#
# 컨테이너 PostgreSQL과 로컬 업로드 디렉터리를 S3로 보낸다. 인스턴스
# 볼륨이 유일한 사본인 상태를 없애는 것이 목적이다.
#
#   - 덤프는 마이그레이션 자격증명(DDL 보유)이 아니라 읽기에 충분한
#     런타임 자격증명으로 뜬다. pg_dump는 SELECT 권한만 필요하다.
#   - 업로드는 변경분만 올린다(52개 20MB 수준이라 전체도 수초다).
#   - 실패하면 0이 아닌 코드로 끝나 systemd가 실패로 기록한다.
#   - 백업 파일은 S3 버킷의 _backup/ 접두사에만 쓴다.
set -euo pipefail

SECRETS=${SECRETS_OVERRIDE:-/run/haebong-secrets/flight/current}
APP_DIR=${APP_DIR_OVERRIDE:-/home/ubuntu/flight-app}
BUCKET=${BACKUP_BUCKET:-adogs-ticket-uploads}
REGION=${AWS_REGION:-ap-northeast-2}
STAMP=$(date -u +%Y%m%d-%H%M%S)

work=$(mktemp -d "${BACKUP_TMP_ROOT:-/tmp}/flight-backup.XXXXXX")
trap 'rm -rf "$work"' EXIT

database_url=$(python3 - "$SECRETS/CONFIG_JSON" <<'PY'
import json, sys
url = json.load(open(sys.argv[1]))["DATABASE_URL"]
# pg_dump는 SQLAlchemy 드라이버 접두사를 모른다.
print(url.replace("postgresql+psycopg2://", "postgresql://"))
PY
)

# 덤프는 컨테이너 안의 psql 클라이언트로 뜬다. 호스트 버전과
# 서버 버전이 어긋나 실패하는 일을 피하려는 것이다.
docker run --rm --network flight-app \
  -e PGCONNECT_TIMEOUT=10 \
  postgres:16-alpine \
  pg_dump "$database_url" --no-owner --no-privileges \
  | gzip -9 > "$work/flight-db.sql.gz"

# 빈 덤프를 백업으로 남기지 않는다.
test -s "$work/flight-db.sql.gz"
gzip -t "$work/flight-db.sql.gz"
# grep -q를 파이프라인에 쓰면 안 된다. 일치 즉시 종료해 zcat이 SIGPIPE로
# 죽고, pipefail이 그것을 파이프라인 실패로 전파한다. grep -c는 입력을
# 끝까지 읽으므로 이 문제가 없다.
tables=$(zcat "$work/flight-db.sql.gz" | grep -c "^CREATE TABLE" || true)
if [ "${tables:-0}" -lt 1 ]; then
  echo '덤프에 테이블 정의가 없다. 백업을 올리지 않았다.' >&2
  exit 1
fi

aws s3 cp "$work/flight-db.sql.gz" \
  "s3://$BUCKET/_backup/db/flight-db-$STAMP.sql.gz" --region "$REGION" --quiet

# 업로드 파일은 변경분만 동기화한다. 삭제는 반영하지 않는다(실수로 지운
# 파일이 백업에서도 사라지는 것을 막는다).
if [ -d "$APP_DIR/data/uploads" ]; then
  aws s3 sync "$APP_DIR/data/uploads" "s3://$BUCKET/_backup/uploads/" \
    --region "$REGION" --only-show-errors
fi

# 보존 기간이 지난 DB 덤프를 지운다. 업로드는 지우지 않는다.
cutoff=$(date -u -d "${BACKUP_RETENTION_DAYS:-30} days ago" +%Y%m%d 2>/dev/null \
         || date -u -v-"${BACKUP_RETENTION_DAYS:-30}"d +%Y%m%d)
aws s3 ls "s3://$BUCKET/_backup/db/" --region "$REGION" \
  | awk '{print $4}' | grep -E '^flight-db-[0-9]{8}-[0-9]{6}\.sql\.gz$' \
  | while read -r name; do
      day=$(echo "$name" | sed -E 's/^flight-db-([0-9]{8})-.*/\1/')
      if [ "$day" -lt "$cutoff" ]; then
        aws s3 rm "s3://$BUCKET/_backup/db/$name" --region "$REGION" --quiet
      fi
    done

echo "백업 완료: db/flight-db-$STAMP.sql.gz ($(du -h "$work/flight-db.sql.gz" | cut -f1), 테이블 $tables개)"
