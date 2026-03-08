# ERP-GOB v1.15.0 Release Notes

## Resumen
v1.15.0 consolida ERP-GOB como baseline institucional operable para el flujo completo de abastecimiento publico, inventario institucional y control patrimonial.

Esta release congela backend, frontend y suite reproducible sobre un baseline alineado, con contrato OpenAPI consolidado, consola administrativa inicial, toolkit de carga masiva, hardening operativo de la suite y validacion de backup/restore.

## Alcance funcional
Flujos cubiertos en baseline:
- Expediente
- Investigacion de mercado
- Checklist legal
- Necesidades
- Procedimiento
- Cuadro comparativo
- Orden
- Recepcion
- Inventario operativo
- Inventario patrimonial
- Factura
- Devengo
- Pago
- Observabilidad institucional
- Dashboard y analytics operativos
- Control OIC patrimonial

## Cambios backend
- Consolidacion contractual en `openapi_v1.15.0_draft.json`.
- Movimientos explicitos de inventario:
  - `POST/GET /inventario/salidas`
  - `POST/GET /inventario/transferencias`
  - `POST/GET /inventario/bajas`
- Auditorias de inventario:
  - `POST /inventario/auditorias`
  - `GET /inventario/auditorias/{id}`
  - `GET /inventario/auditorias/{id}/diferencias`
- Serializacion patrimonial:
  - `GET /activos/serie/{serial}`
  - `GET /activos/{id}/historial`
- Toolkit batch institucional:
  - importacion de productos
  - importacion de proveedores
  - importacion de inventario inicial
  - importacion de activos y resguardos

## Cambios frontend
- Consola administrativa institucional inicial:
  - `/admin/catalogos`
  - `/admin/configuracion`
  - `/admin/checklists`
  - `/admin/observabilidad`
  - `/admin/inventario`
- UI completa para inventario institucional:
  - `/inventario/salidas`
  - `/inventario/transferencias`
  - `/inventario/bajas`
  - `/inventario/auditorias`
  - `/inventario/movimientos`
  - `/inventario/almacenes`
  - `/inventario/ubicaciones`
  - `/inventario/activos/{id}/historial`
- Integracion patrimonial y control OIC dentro de navegacion principal.
- Tipos OpenAPI regenerados contra contrato v1.15.

## Cambios suite
- Submodulos sincronizados a `main` de backend y frontend.
- Restore endurecido:
  - detiene servicios que mantienen conexiones activas
  - termina sesiones PostgreSQL antes de `DROP DATABASE`
- Runner de migraciones canonicas endurecido:
  - aplica migraciones solo sobre base vacia
  - omite reaplicacion sobre base restaurada
  - falla explicitamente ante esquema parcial
- Schedulers no idempotentes deshabilitados por defecto en suite:
  - `INSIGHT_SCHEDULER_ENABLED=false`
  - `PROVEEDOR_SCORE_INTEGRATION_ENABLED=false`

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
- Smoke autenticado PASS
- Backup PASS
- Restore PASS
- Backend healthy post-restore PASS

## Smoke institucional validado
- Login OIDC con PKCE
- `/api/auth/me` autenticado
- `/dashboard`
- `/expedientes/{id}/workspace`
- `/observabilidad`
- `/inventario/patrimonial/control`
- `/api/gateway/observabilidad/dashboard/resumen`
- `/api/gateway/activos`
- `/api/gateway/resguardos`

## Riesgos residuales conocidos
- El contrato OpenAPI v1.15 ya es consolidado, pero la configuracion normativa aun requiere UI administrativa adicional para llegar a produccion institucional completa sin acompanamiento tecnico.
- El sistema queda clasificado como baseline institucional operable; la siguiente fase debe cerrar administracion normativa, catalogos maestros y carga masiva institucional con trazabilidad completa.

## Tags
- Backend: `v1.15.0`
- Frontend: `v1.15.0-front`
- Suite: `v1.15.0-suite`
