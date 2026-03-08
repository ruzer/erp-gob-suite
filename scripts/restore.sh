#!/bin/sh
set -eu

if [ "$#" -lt 1 ]; then
  echo "uso: $0 <directorio-backup>"
  exit 1
fi

root_dir="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
backup_dir="$1"

if [ ! -f "${backup_dir}/postgres.dump" ]; then
  echo "backup postgres no encontrado en ${backup_dir}"
  exit 1
fi

if [ ! -f "${backup_dir}/minio.tgz" ]; then
  echo "backup minio no encontrado en ${backup_dir}"
  exit 1
fi

set -a
. "${root_dir}/.env"
set +a

echo "[restore] reiniciando servicios base"
docker compose -f "${root_dir}/docker-compose.yml" up -d postgres minio

echo "[restore] limpiando base de datos"
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
