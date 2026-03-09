#!/usr/bin/env bash
set -euo pipefail

REPO_OWNER="${REPO_OWNER:-ruzer}"
REPO_NAME="${REPO_NAME:-erp-gob-suite}"
REF="${REF:-main}"
VERSION="${VERSION:-v1.19.1-suite}"
INSTALLER_SOURCE_URL="${INSTALLER_SOURCE_URL:-https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${REF}/installer/install_cli.sh}"
INSTALLER_ROOT="${INSTALLER_ROOT:-/opt/erp-gob-installer}"
PUBLISH_ROOT="${PUBLISH_ROOT:-/var/www/installer}"
PUBLISHED_NAME="${PUBLISHED_NAME:-install_cli.sh}"
SERVICE_NAME="${SERVICE_NAME:-caddy}"
LOG_FILE="${LOG_FILE:-/var/log/erp-gob-installer-update.log}"

log() {
  printf '%s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*" | tee -a "${LOG_FILE}"
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing required command: $1" >&2
    exit 1
  }
}

require_command curl
require_command install
require_command sha256sum

if [ "$(id -u)" -ne 0 ]; then
  echo "Run as root to publish the installer." >&2
  exit 1
fi

mkdir -p "${INSTALLER_ROOT}" "${PUBLISH_ROOT}" "$(dirname "${LOG_FILE}")"

tmp_file="$(mktemp)"
trap 'rm -f "${tmp_file}"' EXIT

log "Downloading installer from ${INSTALLER_SOURCE_URL}"
curl -fsSL "${INSTALLER_SOURCE_URL}" -o "${tmp_file}"

install -m 0755 "${tmp_file}" "${INSTALLER_ROOT}/install_cli.sh"
install -m 0644 "${tmp_file}" "${PUBLISH_ROOT}/${PUBLISHED_NAME}"
ln -sfn "${PUBLISH_ROOT}/${PUBLISHED_NAME}" "${PUBLISH_ROOT}/install.sh"

sha256sum "${INSTALLER_ROOT}/install_cli.sh" | awk '{print $1"  install_cli.sh"}' > "${INSTALLER_ROOT}/checksums.txt"
printf '%s\n' "${VERSION}" > "${INSTALLER_ROOT}/VERSION"

if command -v systemctl >/dev/null 2>&1 && systemctl is-active --quiet "${SERVICE_NAME}"; then
  log "Reloading ${SERVICE_NAME}"
  systemctl reload "${SERVICE_NAME}"
fi

log "Installer published successfully"
log "Version: $(cat "${INSTALLER_ROOT}/VERSION")"
log "Checksum: $(cat "${INSTALLER_ROOT}/checksums.txt")"
