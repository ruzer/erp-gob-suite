#!/bin/sh
set -eu

root_dir="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
backup_dir="${1:-${root_dir}/backups/$(date +%F_%H%M%S)}"

mkdir -p "${backup_dir}"

set -a
. "${root_dir}/.env"
set +a

echo "[backup] destino: ${backup_dir}"

docker compose -f "${root_dir}/docker-compose.yml" exec -T postgres \
  pg_dump -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -Fc \
  > "${backup_dir}/postgres.dump"

docker run --rm \
  -v erp-gob-suite_minio_data:/source:ro \
  -v "${backup_dir}:/backup" \
  alpine sh -c 'cd /source && tar czf /backup/minio.tgz .'

cp "${root_dir}/.env" "${backup_dir}/env.snapshot"

echo "[backup] completado"
