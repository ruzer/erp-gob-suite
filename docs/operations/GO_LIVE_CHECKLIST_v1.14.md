# GO_LIVE_CHECKLIST_v1.14

## Previo al despliegue

- [ ] backend en `main`
- [ ] frontend en `main`
- [ ] suite en `main`
- [ ] submodulos sincronizados
- [ ] tags de release listos
- [ ] arbol limpio en los tres repos

## Seguridad

- [ ] `.env` productivo cargado con secretos reales
- [ ] sin valores `change_me`
- [ ] proxy TLS activo
- [ ] Keycloak funcionando con hostname correcto
- [ ] CSRF en `enforce`
- [ ] MinIO privado

## Base de datos

- [ ] `prisma migrate deploy` ejecutado
- [ ] `npx prisma db seed` ejecutado
- [ ] sin `db push`
- [ ] backup previo realizado

## Validacion tecnica

- [ ] backend build PASS
- [ ] backend test PASS
- [ ] `prisma validate` PASS
- [ ] frontend `api:generate` PASS
- [ ] frontend lint PASS
- [ ] frontend typecheck PASS
- [ ] frontend test PASS
- [ ] frontend build PASS

## Validacion funcional minima

- [ ] login OIDC
- [ ] dashboard
- [ ] workspace
- [ ] expediente -> investigacion -> checklist
- [ ] necesidades -> procedimiento -> cuadro
- [ ] orden -> recepcion -> inventario
- [ ] factura -> devengo -> pago
- [ ] observabilidad
- [ ] inventario patrimonial

## Recuperacion

- [ ] `scripts/backup.sh` ejecutado
- [ ] `scripts/restore.sh` probado en ambiente de ensayo
- [ ] rollback documentado

## Cierre

- [ ] smoke test desde clon limpio PASS
- [ ] incidentes abiertos = 0 criticos
- [ ] UAT firmado
- [ ] aprobacion de liberacion registrada
