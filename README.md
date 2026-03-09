# ERP Gubernamental Suite

Suite fullstack reproducible del ERP-GOB para despliegue institucional con Docker.

## Requisitos

- Docker 24+
- Docker Compose V2
- `git`
- `curl`

## Instalación guiada

```bash
git clone <repo-suite>
cd erp-gob-suite
./erp-gob install demo
```

El instalador:
- genera `.env`
- configura hosts locales para el tenant elegido
- inicializa submódulos
- levanta la suite
- ejecuta bootstrap institucional
- valida instalación
- ejecuta smoke post-install

## Perfiles disponibles

- `demo`
- `piloto`
- `prod`

Puedes sobreescribir parámetros:

```bash
./erp-gob install \
  --profile piloto \
  --institution-name "Secretaría de Administración de Oaxaca" \
  --tenant-key oaxaca \
  --state Oaxaca
```

## Comandos del instalador

```bash
./erp-gob install
./erp-gob validate
./erp-gob smoke
./erp-gob bootstrap --dry-run
./erp-gob upgrade
```

## Accesos esperados

- Aplicación: `https://<tenant>.erp.gob.local`
- API: `https://api.erp.gob.local`
- Keycloak: `https://auth.erp.gob.local`

Ejemplo de tenant:
- `https://demo.erp.gob.local`

## Login demo

- Usuario: `frontend.tester`
- Password: `Frontend123!`

## Estructura

- `backend/` submódulo de `erp-gob-abastecimiento`
- `frontend/` submódulo de `erp-gob-frontend`
- `profiles/` perfiles demo/piloto/prod
- `scripts/erp-gob-cli.mjs` CLI principal
- `scripts/bootstrap_institution.mjs` bootstrap institucional

## Notas operativas

- El backend aplica migración canónica y seed institucional al arrancar.
- El bootstrap institucional agrega:
  - institución
  - configuración/branding
  - plantilla normativa base
  - unidad administrativa
  - área inicial
- Si el instalador no puede escribir `/etc/hosts`, genera `installer-output/hosts.patch`.
