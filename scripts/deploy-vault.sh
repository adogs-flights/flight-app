#!/usr/bin/env bash
set -euo pipefail
revision=${1:-}
[[ "$revision" =~ ^[a-f0-9]{40}$ ]] || exit 1
export FLIGHT_BACKEND_TAG="$revision"
export FLIGHT_RUNTIME_GID
FLIGHT_RUNTIME_GID=$(getent group flight-runtime | cut -d: -f3)
[[ "$FLIGHT_RUNTIME_GID" =~ ^[0-9]+$ ]]
runtime=/opt/project-management-runtime/current/ops/oci-runtime
sudo -n python3 "$runtime/imds-guard.py" --check
docker compose config --quiet
docker compose pull
# A reload failure must leave the current generation and running backend alone.
sudo -n systemctl start flight-secrets.service
sudo -n systemctl reload flight-secrets.service
sudo -n /opt/node24/bin/node "$runtime/service-readiness.mjs" flight
sudo -n /opt/node24/bin/node "$runtime/migrate-flight.mjs" "ghcr.io/adogs-flights/flight-backend:$revision"
# Validate the actual new image and file-only configuration before replacing the old app.
# Suppress exception output here; investigate privately if this startup probe fails.
if ! docker compose run --rm --no-deps --entrypoint python flight-backend -c 'import main; from database import engine; from sqlalchemy import text; connection = engine.connect(); connection.execute(text("SELECT 1")); connection.close()' >/dev/null 2>&1; then
  echo 'Flight runtime startup probe failed; existing backend was not stopped.' >&2
  exit 1
fi
# No runtime credentials or DDL credentials are injected through Compose env.
sudo -n systemctl stop flight-runtime.service
docker compose up -d --remove-orphans
sudo -n systemctl enable flight-secrets.service flight-runtime.service
sudo -n systemctl start flight-runtime.service
for attempt in $(seq 1 40); do
  if curl --fail --silent --max-time 5 -H 'Host: adogs-ticket.shop' http://127.0.0.1:18091/api/static/airlines >/dev/null; then
    exit 0
  fi
  sleep 3
done
echo 'Flight database-backed readiness failed; inspect privately before rollback.' >&2
exit 1
