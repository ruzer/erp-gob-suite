#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
exec node "$ROOT_DIR/scripts/smoke_patrimonial_multi_area.mjs" "$@"
