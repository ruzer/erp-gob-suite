# GA_v1.14.0

## Objetivo

Declarar el baseline institucional v1.14 del ERP-GOB como release operable, congelada y alineada entre backend, frontend y suite reproducible.

## Alcance de cierre

- backend y frontend consolidados desde ramas operativas a baseline de release
- suite sincronizada con submodulos y endurecida para operacion controlada
- seed institucional base
- proxy TLS local de referencia
- backup y restore scriptados
- documentacion de seguridad, monitoreo y go-live

## Cambios de consolidacion

- eliminacion del fallback `prisma db push --accept-data-loss` en suite
- endurecimiento de variables `.env.example`
- `FRONTEND_CSRF_MODE=enforce`
- Keycloak realm templated con secretos y usuarios institucionales
- proxy HTTPS local para:
  - `https://erp.gob.local`
  - `https://api.erp.gob.local`
  - `https://auth.erp.gob.local`
- seed institucional v1.14 con:
  - areas
  - productos
  - proveedores
  - usuarios
  - roles base
- scripts:
  - `scripts/backup.sh`
  - `scripts/restore.sh`

## Estado esperado del sistema

El release v1.14 debe quedar:

- congelado en ramas `release/*` y posteriormente en `main`
- validado con build, test, `prisma validate` y smoke test
- preparado para piloto institucional controlado

## Bloqueadores que deben quedar en cero antes de tag final

- arboles sucios
- submodulos desalineados
- fallas de auth OIDC
- fallas en backup/restore
- smoke test fallido
- gaps criticos de seguridad P0

## Tag objetivo

- backend: `v1.14.0`
- frontend: `v1.14.0-front`
- suite: `v1.14.0-suite`
