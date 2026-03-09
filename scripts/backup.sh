#!/bin/sh
set -eu

root_dir="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
backup_dir="${1:-${root_dir}/backups/$(date +%F_%H%M%S)}"

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

mkdir -p "${backup_dir}"
POSTGRES_USER="$(env_value POSTGRES_USER)"
POSTGRES_DB="$(env_value POSTGRES_DB)"

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
