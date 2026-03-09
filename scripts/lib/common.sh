#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="$ROOT_DIR/.env"
log() { printf '[erp-gob] %s\n' "$*"; }
warn() { printf '[erp-gob][warn] %s\n' "$*" >&2; }
die() { printf '[erp-gob][error] %s\n' "$*" >&2; exit 1; }
require_cmd() { command -v "$1" >/dev/null 2>&1 || die "Falta comando requerido: $1"; }
load_env() {
  [ -f "$ENV_FILE" ] || die "No existe $ENV_FILE"
  set -a
  . "$ENV_FILE"
  set +a
}
