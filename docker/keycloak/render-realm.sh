#!/bin/sh
set -eu

template="/opt/keycloak/realm/realm-erp.template.json"
output="/opt/keycloak/data/import/realm-erp-v1.14.json"

mkdir -p "$(dirname "${output}")"

escape() {
  printf '%s' "$1" | sed -e 's/[\/&]/\\&/g'
}

api_secret="$(escape "${KEYCLOAK_API_CLIENT_SECRET}")"
backend_secret="$(escape "${KEYCLOAK_BACKEND_CLIENT_SECRET}")"
app_url="$(escape "${APP_URL}")"
keycloak_public_url="$(escape "${KEYCLOAK_PUBLIC_URL}")"

tester_password="$(escape "${ERP_FRONTEND_TESTER_PASSWORD}")"
capturista_password="$(escape "${ERP_CAPTURISTA_PASSWORD}")"
revisor_password="$(escape "${ERP_REVISOR_PASSWORD}")"
finanzas_password="$(escape "${ERP_FINANZAS_PASSWORD}")"
oic_password="$(escape "${ERP_OIC_PASSWORD}")"
admin_password="$(escape "${ERP_ADMIN_PASSWORD}")"

sed \
  -e "s|__KEYCLOAK_API_CLIENT_SECRET__|${api_secret}|g" \
  -e "s|__KEYCLOAK_BACKEND_CLIENT_SECRET__|${backend_secret}|g" \
  -e "s|__APP_URL__|${app_url}|g" \
  -e "s|__KEYCLOAK_PUBLIC_URL__|${keycloak_public_url}|g" \
  -e "s|__TESTER_PASSWORD__|${tester_password}|g" \
  -e "s|__CAPTURISTA_PASSWORD__|${capturista_password}|g" \
  -e "s|__REVISOR_PASSWORD__|${revisor_password}|g" \
  -e "s|__FINANZAS_PASSWORD__|${finanzas_password}|g" \
  -e "s|__OIC_PASSWORD__|${oic_password}|g" \
  -e "s|__ADMIN_PASSWORD__|${admin_password}|g" \
  "${template}" > "${output}"

exec /opt/keycloak/bin/kc.sh start --import-realm
