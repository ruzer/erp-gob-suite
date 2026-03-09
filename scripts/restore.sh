#!/bin/sh
set -eu

if [ "$#" -lt 1 ]; then
  echo "uso: $0 <directorio-backup>"
  exit 1
fi

root_dir="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
backup_dir="$1"

env_value() {
  key="$1"
  node -e "
const fs = require('fs');
const file = process.argv[1];
const key = process.argv[2];
const lines = fs.readFileSync(file, 'utf8').split(/\\r?\\n/);
for (const line of lines) {
  if (!line || line.startsWith('#')) continue;
  const idx = line.indexOf('=');
  if (idx < 0) continue;
  if (line.slice(0, idx).trim() !== key) continue;
  process.stdout.write(line.slice(idx + 1));
  process.exit(0);
}
process.exit(1);
" "${root_dir}/.env" "$key"
}

if [ ! -f "${backup_dir}/postgres.dump" ]; then
  echo "backup postgres no encontrado en ${backup_dir}"
  exit 1
fi

if [ ! -f "${backup_dir}/minio.tgz" ]; then
  echo "backup minio no encontrado en ${backup_dir}"
  exit 1
fi

POSTGRES_USER="$(env_value POSTGRES_USER)"
POSTGRES_DB="$(env_value POSTGRES_DB)"

echo "[restore] reiniciando servicios base"
docker compose -f "${root_dir}/docker-compose.yml" stop proxy frontend backend >/dev/null 2>&1 || true
docker compose -f "${root_dir}/docker-compose.yml" up -d postgres minio

echo "[restore] limpiando base de datos"
docker compose -f "${root_dir}/docker-compose.yml" exec -T postgres \
  psql -U "${POSTGRES_USER}" -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${POSTGRES_DB}' AND pid <> pg_backend_pid();"
docker compose -f "${root_dir}/docker-compose.yml" exec -T postgres \
  psql -U "${POSTGRES_USER}" -d postgres -c "DROP DATABASE IF EXISTS ${POSTGRES_DB};"
docker compose -f "${root_dir}/docker-compose.yml" exec -T postgres \
  psql -U "${POSTGRES_USER}" -d postgres -c "CREATE DATABASE ${POSTGRES_DB};"

echo "[restore] restaurando postgres"
cat "${backup_dir}/postgres.dump" | docker compose -f "${root_dir}/docker-compose.yml" exec -T postgres \
  pg_restore -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" --clean --if-exists --no-owner --no-privileges

echo "[restore] restaurando minio"
docker run --rm \
  -v erp-gob-suite_minio_data:/target \
  -v "${backup_dir}:/backup:ro" \
  alpine sh -c 'rm -rf /target/* && cd /target && tar xzf /backup/minio.tgz'

echo "[restore] levantando stack completo"
docker compose -f "${root_dir}/docker-compose.yml" up -d

echo "[restore] completado"
