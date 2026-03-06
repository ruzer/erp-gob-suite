# ERP Gubernamental Suite

Suite fullstack reproducible del ERP (backend + frontend + infraestructura) para correr con Docker en cualquier máquina.

## Requisitos

- Docker 24+
- Docker Compose V2

## Estructura

- `backend/` submódulo de `erp-gob-abastecimiento`
- `frontend/` submódulo de `erp-gob-frontend`
- `docker/keycloak/realm-erp-dev.json` realm de desarrollo
- `docker/postgres/init.sql` inicialización base de PostgreSQL

## Quick Start

```bash
git clone <repo-suite>
cd erp-gob-suite
cp .env.example .env
docker compose up --build
```

## Inicio rápido (ES)

```bash
git clone <repo-suite>
cd erp-gob-suite
cp .env.example .env
docker compose up --build
```

## Accesos

- Frontend: http://localhost:13001
- Backend: http://localhost:13000
- Keycloak: http://localhost:8080
- MinIO Console: http://localhost:9001

## Login demo

- Usuario: `frontend.tester`
- Password: `Frontend123!`

## Notas operativas

- El backend ejecuta al inicio:
  - `prisma migrate deploy`
  - `prisma db seed`
- El realm de Keycloak se importa automáticamente al arrancar `keycloak`.
