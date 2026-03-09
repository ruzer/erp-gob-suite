#!/usr/bin/env bash
set -euo pipefail

REPO_URL="${ERP_GOB_REPO_URL:-https://github.com/ruzer/erp-gob-suite.git}"
REF="${ERP_GOB_REF:-main}"
INSTALL_HOME="${ERP_GOB_HOME:-${HOME}/.local/share/erp-gob-suite}"

echo "[erp-gob] Descargando suite desde ${REPO_URL} (${REF})"

if [ -d "${INSTALL_HOME}/.git" ]; then
  git -C "${INSTALL_HOME}" fetch --tags origin
  git -C "${INSTALL_HOME}" checkout "${REF}"
  git -C "${INSTALL_HOME}" pull --ff-only origin "$(git -C "${INSTALL_HOME}" rev-parse --abbrev-ref HEAD 2>/dev/null || echo main)" || true
else
  mkdir -p "$(dirname "${INSTALL_HOME}")"
  git clone "${REPO_URL}" "${INSTALL_HOME}"
  git -C "${INSTALL_HOME}" checkout "${REF}"
fi

git -C "${INSTALL_HOME}" submodule update --init --recursive
bash "${INSTALL_HOME}/install.sh"

echo "[erp-gob] CLI listo. Siguiente paso:"
echo "erp-gob install demo"
