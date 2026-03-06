# GA v1.9.0 (Suite)

## Alcance funcional

La suite `erp-gob-suite` distribuye el ERP Gubernamental completo y reproducible con Docker para operacion en cualquier maquina:

- Backend `erp-gob-abastecimiento`
- Frontend `erp-gob-frontend`
- PostgreSQL
- Redis
- MinIO
- Keycloak

## Flujos soportados

- Flujo contractual completo (expediente -> investigacion -> checklist -> necesidades -> procedimiento -> cuadro -> orden -> recepcion -> inventario)
- Operacion de proveedores compliance
- Operacion de catalogo de productos

## Endpoints (familias)

- `/expedientes/*`
- `/investigacion-mercado/*`
- `/procedimientos/*`
- `/cuadros/*`
- `/ordenes/*`
- `/recepciones/*`
- `/inventory/*`
- `/proveedores/*`
- `/productos/*`

## Arquitectura

- Frontend Next.js desacoplado
- BFF gateway `/api/gateway/*`
- Backend NestJS modular contract-first
- Autenticacion OIDC con Keycloak

## Docker reproducible

```bash
git clone https://github.com/ruzer/erp-gob-suite.git
cd erp-gob-suite
cp .env.example .env
docker compose up --build
```

## URLs

- Frontend: http://localhost:13001
- Backend: http://localhost:13000
- Keycloak: http://localhost:8080
- MinIO: http://localhost:9001

## Login demo

- Usuario: `frontend.tester`
- Password: `Frontend123!`

## Declaratoria

Se declara **Suite GA v1.9.0** como distribucion reproducible oficial del ERP Gubernamental.
