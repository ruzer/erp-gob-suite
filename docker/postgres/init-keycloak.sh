#!/bin/sh
set -eu

psql -v ON_ERROR_STOP=1 --username "${POSTGRES_USER}" --dbname postgres <<-SQL
DO \$\$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = '${KEYCLOAK_DB_USER}'
  ) THEN
    EXECUTE format('CREATE ROLE %I WITH LOGIN PASSWORD %L', '${KEYCLOAK_DB_USER}', '${KEYCLOAK_DB_PASSWORD}');
  ELSE
    EXECUTE format('ALTER ROLE %I WITH LOGIN PASSWORD %L', '${KEYCLOAK_DB_USER}', '${KEYCLOAK_DB_PASSWORD}');
  END IF;
END
\$\$;
SQL

db_exists="$(psql -v ON_ERROR_STOP=1 --username "${POSTGRES_USER}" --dbname postgres -tAc "SELECT 1 FROM pg_database WHERE datname = 'keycloak'")"

if [ "${db_exists}" != "1" ]; then
  psql -v ON_ERROR_STOP=1 --username "${POSTGRES_USER}" --dbname postgres -c "CREATE DATABASE keycloak OWNER \"${KEYCLOAK_DB_USER}\";"
fi

psql -v ON_ERROR_STOP=1 --username "${POSTGRES_USER}" --dbname postgres <<-SQL
GRANT ALL PRIVILEGES ON DATABASE keycloak TO "${KEYCLOAK_DB_USER}";
SQL
