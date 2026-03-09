# ERP-GOB v1.17.0 Release Notes

## Resumen
v1.17.0 consolida la capa administrativa institucional sobre el baseline operativo v1.15.

Esta release integra backend, frontend y suite para dejar operables desde UI:
- areas institucionales
- tipos de procedimiento
- plantillas de checklist
- reglas de observabilidad
- tipos de activos
- importaciones masivas institucionales

## Alcance funcional
Capacidades institucionales activadas:
- Consola `/admin` conectada a endpoints reales
- Carga masiva desde UI contra `POST /admin/import`
- Catalogos administrativos gobernados por contrato `v1.17.0-draft`
- Contrato OpenAPI protegido en CI por `check_openapi_drift`
- Dashboard institucional unificado preservado

## Cambios backend
- Endpoints administrativos:
  - `GET/POST/PATCH /areas`
  - `GET/POST/PATCH /procedimientos/tipos`
  - `GET/POST/PATCH /checklists/plantillas`
  - `GET/PATCH /observabilidad/reglas`
  - `GET/POST/PATCH /activos/tipos`
  - `POST /admin/import`
- Contrato actualizado:
  - `openapi_v1.17.0_draft.json`
- CI contractual:
  - `scripts/check_openapi_drift.mjs`
  - `.github/workflows/openapi-contract-check.yml`
- Hardening posterior al smoke:
  - wiring de `PrismaModule` y `AuthModule` en modulos administrativos
  - orden de modulos estaticos antes de rutas dinamicas en `AppModule`
  - correccion de auditoria para `POST /admin/import`

## Cambios frontend
- Consola administrativa operativa:
  - `/admin/catalogos/areas`
  - `/admin/catalogos/tipos-procedimiento`
  - `/admin/checklists`
  - `/admin/observabilidad`
  - `/admin/catalogos/activos`
  - `/admin/importaciones`
- Import wizard con ejecucion real contra backend
- Tipos OpenAPI regenerados contra `v1.17.0-draft`

## Cambios suite
- Submodulos sincronizados con:
  - backend `f56d9fa`
  - frontend `93c9c18`
- Smoke TLS/OIDC validado por Caddy:
  - `erp.gob.local`
  - `api.erp.gob.local`
  - `auth.erp.gob.local`

## Gates ejecutados
Backend:
- `npm run build` PASS
- `npm run test -- --runInBand` PASS
- `prisma validate` PASS
- `full_clean` PASS x2

Frontend:
- `npm run api:generate` PASS
- `npm run lint` PASS
- `npm run typecheck` PASS
- `npm run test` PASS
- `npm run build` PASS

Suite:
- `docker compose up --build -d` PASS
- login OIDC real PASS
- smoke de endpoints administrativos PASS
- importacion real `POST /admin/import` PASS

## Smoke institucional validado
- `/login`
- `/api/auth/me`
- `/api/gateway/observabilidad/dashboard/resumen`
- `/api/gateway/areas`
- `/api/gateway/procedimientos/tipos`
- `/api/gateway/checklists/plantillas`
- `/api/gateway/activos/tipos`
- `/api/gateway/admin/import`

## Clasificacion
`PRODUCCION INSTITUCIONAL COMPLETA`

## Tags
- Backend: `v1.17.0`
- Frontend: `v1.17.0-front`
- Suite: `v1.17.0-suite`
