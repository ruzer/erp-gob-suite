#!/usr/bin/env bash
set -euo pipefail

REPO_URL="${ERP_GOB_REPO_URL:-https://github.com/ruzer/erp-gob-suite.git}"
REF="${ERP_GOB_REF:-v1.19.1-suite}"
INSTALL_HOME="${ERP_GOB_HOME:-${HOME}/.local/share/erp-gob-suite}"
OUTPUT_DIR="${ERP_GOB_OUTPUT_DIR:-$(pwd)/installer-output}"
LOG_FILE="${OUTPUT_DIR}/install.log"
REPORT_FILE="${OUTPUT_DIR}/install-report.json"
VERSION="v1.19.1"
PROFILE_HINT="${ERP_GOB_PROFILE_HINT:-cli-bootstrap}"

log() {
  mkdir -p "${OUTPUT_DIR}"
  printf '%s INFO %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*" | tee -a "${LOG_FILE}"
}

warn() {
  mkdir -p "${OUTPUT_DIR}"
  printf '%s WARN %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*" | tee -a "${LOG_FILE}" >&2
}

die() {
  mkdir -p "${OUTPUT_DIR}"
  printf '%s ERROR %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*" | tee -a "${LOG_FILE}" >&2
  cat > "${REPORT_FILE}" <<EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "version": "${VERSION}",
  "host": "$(hostname)",
  "profile": "${PROFILE_HINT}",
  "result": "FAILURE",
  "error": "$*"
}
EOF
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || die "Falta dependencia requerida: $1"
}

detect_os() {
  case "$(uname -s)" in
    Linux) echo "linux" ;;
    Darwin) echo "darwin" ;;
    *) die "Sistema operativo no soportado: $(uname -s)" ;;
  esac
}

check_node() {
  local version major
  version="$(node -v)"
  major="${version#v}"
  major="${major%%.*}"
  [ "${major}" -ge 18 ] || die "Node.js >= 18 es requerido. Detectado: ${version}"
}

check_docker() {
  docker --version >/dev/null 2>&1 || die "Docker no está disponible"
  docker info >/dev/null 2>&1 || die "Docker daemon no está corriendo"
  docker compose version >/dev/null 2>&1 || die "Docker Compose no está disponible"
}

check_ports() {
  local hard_ports="80 443"
  local soft_ports="8080 9000 5432"
  local busy_hard="" busy_soft=""

  require_command lsof

  for port in ${hard_ports}; do
    if lsof -nP -iTCP:"${port}" -sTCP:LISTEN >/dev/null 2>&1; then
      busy_hard="${busy_hard} ${port}"
    fi
  done

  for port in ${soft_ports}; do
    if lsof -nP -iTCP:"${port}" -sTCP:LISTEN >/dev/null 2>&1; then
      busy_soft="${busy_soft} ${port}"
    fi
  done

  if [ -n "${busy_hard}" ]; then
    die "Puertos ocupados:${busy_hard}. Libéralos antes de instalar."
  fi

  if [ -n "${busy_soft}" ]; then
    warn "Puertos detectados en uso (no bloqueantes):${busy_soft}"
  fi
}

write_success_report() {
  cat > "${REPORT_FILE}" <<EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "version": "${VERSION}",
  "host": "$(hostname)",
  "profile": "${PROFILE_HINT}",
  "result": "SUCCESS"
}
EOF
}

mkdir -p "${OUTPUT_DIR}"
: > "${LOG_FILE}"
log "Inicio de instalacion remota del CLI ERP-GOB"
os_name="$(detect_os)"
log "Sistema operativo detectado: ${os_name}"

require_command git
require_command curl
require_command bash
require_command node
check_node
check_docker
check_ports

log "Descargando suite desde ${REPO_URL} (${REF})"

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
"${ERP_GOB_BIN_DIR:-/usr/local/bin}/erp-gob" version >/dev/null 2>&1 || die "La validación del CLI instalado falló"
write_success_report

log "ERP-GOB CLI instalado correctamente"
echo "ERP-GOB CLI instalado correctamente"
echo "Siguiente paso:"
echo "erp-gob install demo"
