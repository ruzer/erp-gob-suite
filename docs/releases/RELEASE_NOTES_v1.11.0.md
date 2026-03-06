# ERP Gubernamental Suite v1.11.0

## Alcance
Release candidate de suite reproducible con backend, frontend, Keycloak, Postgres, Redis y MinIO.

## Componentes incluidos
- Backend `v1.11.0-rc.1`
- Frontend `v1.11.0-rc.1-front`
- Stack Docker universal con un comando de arranque.

## Capacidades funcionales
- Flujo contractual completo.
- Observabilidad institucional operativa.
- Flujo financiero operativo (Factura -> Devengo -> Pago).

## Ejecución
```bash
docker compose up --build
```

## Verificación mínima
- Frontend: `http://localhost:13001/login`
- Backend metrics: `http://localhost:13000/metrics`
- Keycloak realm: `http://localhost:8080/realms/erp/.well-known/openid-configuration`
