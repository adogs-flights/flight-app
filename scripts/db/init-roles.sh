#!/bin/sh
# PostgreSQL 최초 초기화 시 한 번만 실행된다(docker-entrypoint-initdb.d).
#
# OCI 공유 PostgreSQL의 권한 분리를 그대로 옮긴다.
#   flightapp     부트스트랩 수퍼유저. 이 스크립트와 역할 생성에만 쓴다.
#   adogs-pg      런타임. CRUD만 가능하고 DDL 권한이 없다.
#   adogs-pg-mg   마이그레이션. 스키마 소유자로 DDL을 수행한다.
#
# 비밀번호는 환경변수가 아니라 발행된 시크릿 세대 파일에서 읽는다.
set -eu

SECRETS=/run/secrets/flight/current
RUNTIME_PASSWORD=$(cat "$SECRETS/DB_PASSWORD")
MIGRATION_PASSWORD=$(cat "$SECRETS/DB_MIGRATION_PASSWORD")

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<SQL
-- 역할 생성. NOINHERIT로 두어 권한이 묵시적으로 번지지 않게 한다.
CREATE ROLE "adogs-pg-mg" LOGIN NOINHERIT PASSWORD '${MIGRATION_PASSWORD}';
CREATE ROLE "adogs-pg"    LOGIN NOINHERIT PASSWORD '${RUNTIME_PASSWORD}';

-- public 스키마에 아무나 테이블을 만들지 못하게 한다.
REVOKE CREATE ON SCHEMA public FROM PUBLIC;

-- 스키마 소유권은 마이그레이션 역할에만 준다. 런타임은 사용만 한다.
ALTER SCHEMA public OWNER TO "adogs-pg-mg";
GRANT USAGE ON SCHEMA public TO "adogs-pg";

-- 마이그레이션 역할이 앞으로 만드는 객체에 런타임 CRUD 권한을 자동 부여한다.
ALTER DEFAULT PRIVILEGES FOR ROLE "adogs-pg-mg" IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO "adogs-pg";
ALTER DEFAULT PRIVILEGES FOR ROLE "adogs-pg-mg" IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO "adogs-pg";

-- 런타임이 데이터베이스에 접속만 할 수 있게 하고 생성 권한은 주지 않는다.
REVOKE ALL ON DATABASE "flight-db" FROM PUBLIC;
GRANT CONNECT ON DATABASE "flight-db" TO "adogs-pg", "adogs-pg-mg";
SQL

echo "역할 초기화 완료: adogs-pg(CRUD) / adogs-pg-mg(DDL)"
