# ERP-GOB v1.18.0

## Resumen

Release de plataforma que introduce soporte multi-institucion y plantillas normativas sin romper compatibilidad con v1.17.

## Cambios principales

- Soporte de instituciones con configuracion aislada por tenant.
- Resolucion de contexto institucional por subdominio, header `x-erp-tenant` y realm OIDC.
- Plantillas normativas administrables por API.
- Relacion de checklist con plantilla normativa.
- Configuracion activa enriquecida con institucion, normativa, branding y parametros.
- UI administrativa para instituciones.
- Branding dinamico en frontend.
- Gateway tenant-aware.
- Suite multi-host con soporte para:
  - `erp.gob.local`
  - `oaxaca.erp.gob.local`
  - `edomex.erp.gob.local`
  - `demo.erp.gob.local`

## Validacion

- Backend gates PASS
- Frontend gates PASS
- Smoke suite PASS
- HTTPS tenant routing PASS

## Impacto

ERP-GOB pasa de sistema institucional unico a plataforma multi-institucion configurable.
