#!/usr/bin/env bash
# 해봉티켓 운영 배포. 인스턴스에서 SSM Send-Command로 실행된다.
#
# OCI의 deploy-vault.sh를 AWS로 옮긴 것이다. 안전장치를 그대로 유지한다.
#   1. 시크릿 발행이 성공해야 다음으로 넘어간다.
#   2. 새 이미지로 기동 프로브를 먼저 돌려 본 뒤에 기존 앱을 교체한다.
#   3. 어느 단계가 실패하든 돌고 있는 백엔드를 먼저 내리지 않는다.
#   4. 마이그레이션은 DDL 권한이 있는 전용 자격증명으로만 수행한다.
set -euo pipefail

revision=${1:-}
[[ "$revision" =~ ^[a-f0-9]{40}$ ]] || {
  echo '40자 커밋 해시가 필요하다' >&2
  exit 1
}

# 경로는 테스트에서 주입할 수 있게 재정의를 허용한다. 운영에서는 기본값을 쓴다.
APP_DIR=${APP_DIR_OVERRIDE:-/home/ubuntu/flight-app}
SECRETS=${SECRETS_OVERRIDE:-/run/haebong-secrets/flight/current}
MIGRATION_TMP_ROOT=${MIGRATION_TMP_ROOT:-/run}
REGISTRY=966203577238.dkr.ecr.ap-northeast-2.amazonaws.com
REGION=ap-northeast-2

cd "$APP_DIR"
export FLIGHT_BACKEND_TAG="$revision"
export FLIGHT_RUNTIME_GID
FLIGHT_RUNTIME_GID=$(getent group flight-runtime | cut -d: -f3)
[[ "$FLIGHT_RUNTIME_GID" =~ ^[0-9]+$ ]]

# 비밀 없는 설정만 .env에 둔다. 시크릿 담긴 .env를 되살리지 않는다.
test -f .env

# 인스턴스 프로파일로 ECR에 로그인한다. 저장된 자격증명은 없다.
aws ecr get-login-password --region "$REGION" \
  | docker login --username AWS --password-stdin "$REGISTRY" >/dev/null

docker compose config --quiet
docker compose pull --quiet flight-backend flight-frontend

# 시크릿 세대를 새로 발행한다. 실패하면 기존 세대와 앱이 그대로 남는다.
sudo -n systemctl start haebong-secrets.service
sudo -n systemctl reload-or-restart haebong-secrets.service
test -f "$SECRETS/CONFIG_JSON"

# 마이그레이션은 DDL 전용 자격증명으로, 배포할 바로 그 이미지에서 실행한다.
# 런타임 마운트(FLIGHT_SECRET_DIRECTORY)로는 실행하지 않는다.
migration_dir=$(mktemp -d "$MIGRATION_TMP_ROOT/flight-migration.XXXXXX")
trap 'rm -rf "$migration_dir"' EXIT

# runtime_secrets.read_generation_file은 평평한 디렉터리를 받지 않는다.
# 발행된 세대와 똑같은 구조와 권한을 만들어야 한다.
#   <루트>              디렉터리 · uid 0 · 0750
#   <루트>/current      심볼릭 링크 → g-XXXXXX
#   <루트>/g-XXXXXX     디렉터리 · uid 0 · 루트와 같은 gid · 0750
#   <루트>/g-XXXXXX/<파일>  일반 파일 · uid 0 · 같은 gid · 0640 · nlink 1
# 컨테이너는 root로 실행되므로 소유권은 root:root로 통일한다.
python3 - "$SECRETS/CONFIG_JSON" "$SECRETS/DB_MIGRATION_PASSWORD" "$migration_dir" <<'PY'
import json, os, secrets, string, sys, urllib.parse as up

config_path, password_path, root = sys.argv[1:4]
url = json.load(open(config_path))["DATABASE_URL"]
password = open(password_path).read().strip()
parsed = up.urlsplit(url)
host = parsed.hostname or "flight-db"
port = f":{parsed.port}" if parsed.port else ""
netloc = f"adogs-pg-mg:{up.quote(password, safe='')}@{host}{port}"
migration_url = up.urlunsplit(parsed._replace(netloc=netloc))

os.chmod(root, 0o750)
name = "g-" + "".join(secrets.choice(string.ascii_letters + string.digits) for _ in range(6))
generation = os.path.join(root, name)
os.mkdir(generation, 0o750)
os.chmod(generation, 0o750)
target = os.path.join(generation, "DATABASE_URL")
fd = os.open(target, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o640)
with os.fdopen(fd, "w") as handle:
    handle.write(migration_url)
os.chmod(target, 0o640)
os.symlink(name, os.path.join(root, "current"))
PY

docker run --rm --network flight-app \
  -v "$migration_dir:/run/secrets/migration:ro" \
  -e FLIGHT_MIGRATION_SECRET_DIRECTORY=/run/secrets/migration \
  --entrypoint alembic \
  "$REGISTRY/flight-backend:$revision" upgrade head

# 배포할 이미지와 파일 기반 설정만으로 실제로 기동되는지 먼저 확인한다.
# 이 프로브가 실패하면 기존 백엔드는 건드리지 않는다.
if ! docker compose run --rm --no-deps --entrypoint python flight-backend -c \
  'import main; from database import engine; from sqlalchemy import text; c = engine.connect(); c.execute(text("SELECT 1")); c.close()' \
  >/dev/null 2>&1; then
  echo '새 이미지 기동 프로브 실패. 기존 백엔드를 교체하지 않았다.' >&2
  exit 1
fi

sudo -n systemctl stop haebong-runtime.service
docker compose up -d --remove-orphans
sudo -n systemctl enable haebong-secrets.service haebong-runtime.service >/dev/null
sudo -n systemctl start haebong-runtime.service

# nginx 설정은 바인드 마운트라 파일만 바뀌고 프로세스는 옛 설정을 계속 쓴다.
# compose 정의가 그대로면 up -d가 이 컨테이너를 재생성하지 않으므로
# 명시적으로 다시 읽혀야 한다. 설정이 깨졌으면 reload 전에 멈춘다.
docker exec flight-nginx nginx -t
docker exec flight-nginx nginx -s reload

# 로컬 평문 종단으로 DB까지 닿는 준비 상태를 확인한다.
for attempt in $(seq 1 40); do
  if curl --fail --silent --max-time 5 \
       -H 'Host: haebongticket.com' \
       http://127.0.0.1:18091/api/static/airlines >/dev/null; then
    echo "배포 완료: $revision"
    exit 0
  fi
  sleep 3
done

echo 'DB 기반 준비 상태 확인 실패. 롤백 전에 상태를 직접 점검하라.' >&2
exit 1
