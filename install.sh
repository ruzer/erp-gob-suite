#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
TARGET_DIR="${ERP_GOB_BIN_DIR:-/usr/local/bin}"
TARGET_BIN="${TARGET_DIR}/erp-gob"
SOURCE_BIN="${ROOT_DIR}/erp-gob"

if [ ! -x "${SOURCE_BIN}" ]; then
  echo "[erp-gob][error] CLI local no encontrado o no ejecutable: ${SOURCE_BIN}" >&2
  exit 1
fi

mkdir -p "${TARGET_DIR}" 2>/dev/null || true

if [ -e "${TARGET_BIN}" ] || [ -L "${TARGET_BIN}" ]; then
  echo "[erp-gob] Reinstalando CLI en ${TARGET_BIN}"
else
  echo "[erp-gob] Instalando CLI en ${TARGET_BIN}"
fi

if [ -w "${TARGET_DIR}" ]; then
  ln -sf "${SOURCE_BIN}" "${TARGET_BIN}"
else
  if ! command -v sudo >/dev/null 2>&1; then
    echo "[erp-gob][error] Se requiere sudo para instalar en ${TARGET_DIR}" >&2
    exit 1
  fi
  sudo ln -sf "${SOURCE_BIN}" "${TARGET_BIN}"
fi

"${TARGET_BIN}" version
echo "ERP-GOB CLI v1.19.1 installed"
