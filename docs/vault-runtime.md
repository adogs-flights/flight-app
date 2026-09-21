# OCI Vault runtime

Production uses the existing single OCI VM. Only the host accesses OCI Vault with
its instance principal; containers cannot access IMDS. This does not isolate apps
from a compromised host root.

- Host `flight-secrets.service` publishes a complete generation on `/run` tmpfs.
- Backend reads `CONFIG_JSON` once through the read-only `/run/secrets/flight`
  mount. Missing/invalid files fail startup; there is no production env fallback.
- DB runtime identity has CRUD, not DDL. Session signing and existing OAuth/SMTP
  values are retained; moving them into Vault is not rotation of those values.
- Host-only `migrate-flight.mjs` backs up `flight-db`, fetches a separate root-only
  migration credential, and runs Alembic in the exact backend revision image.
  It removes only its own container and temporary migration-secret directory.
- CI no longer uses GitHub `ENV_FILE`. Host `.env` contains non-secret settings.
  New backend images receive immutable commit tags. Publisher reload/migration
  failures leave the running app in place; a new-image startup probe precedes
  replacement. Migration failures require operator inspection, not blind rollback.
- Docker restart is disabled for the backend. Enabled `flight-runtime.service`
  starts it only after the IMDS guard and Vault publisher/readiness checks.
  FE/nginx retain their existing restart policies.

Redeployment uses `bash scripts/deploy-vault.sh <40-character-main-revision>`.
Manual Compose commands additionally require `FLIGHT_BACKEND_TAG` and
`FLIGHT_RUNTIME_GID` (from `getent group flight-runtime`). Never restore the old
secret-bearing `.env` or run Alembic with the runtime mount.

Before retiring a previous credential, confirm other shared-infrastructure
consumers have moved. The old shared PostgreSQL administrator is not revoked as
part of Flight alone. The operator's ignored credential input is retained.

Verification checkpoint: four secret-reader tests and three deployment-order
fixtures pass. The existing guest submission test returns 422 instead of 201 on
unchanged main as well as this branch; it is not fixed by this Vault migration.
Live cutover, redeployment, and reboot checks must be reported separately.
