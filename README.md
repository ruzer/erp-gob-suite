# ERP-GOB

![Installer](https://img.shields.io/badge/installer-ready-green)
![License](https://img.shields.io/badge/license-MIT-blue)

## Quick install

```bash
curl -sSL https://raw.githubusercontent.com/ruzer/erp-gob-suite/main/installer/install_cli.sh | bash
erp-gob install demo
```

Installer y suite pública del ERP-GOB para despliegue institucional con Docker.

Canal oficial previsto:

```bash
curl -sSL https://install.erp-gob.com | bash
erp-gob install demo
```

## Commands

```bash
erp-gob install demo
erp-gob validate
erp-gob smoke
erp-gob smoke-patrimonial
erp-gob upgrade
erp-gob version
```

Comando avanzado disponible:

```bash
erp-gob bootstrap --dry-run
```

Smoke funcional patrimonial:

```bash
erp-gob smoke-patrimonial
```

Valida compra multi-area patrimonial serializada: crea el caso minimo, confirma recepcion por API, verifica dos bienes creados y comprueba que `GET /activos/{id}/historial` conserva area/necesidad/proveedor de origen.

## Requirements

- Docker
- Docker Compose
- Node >= 18
- `git`
- `curl`

## Profiles

- `demo`
- `piloto`
- `prod`

Ejemplo con parámetros explícitos:

```bash
erp-gob install \
  --profile piloto \
  --institution-name "Secretaría de Administración de Oaxaca" \
  --tenant-key oaxaca \
  --state Oaxaca
```

## Documentation

- `docs/releases`
- `docs/operations`
- `docs/security`

## Operación

El instalador:
- genera `.env`
- configura hosts locales para el tenant elegido
- inicializa submódulos
- levanta la suite
- ejecuta bootstrap institucional
- valida instalación
- ejecuta smoke post-install

Accesos esperados:
- aplicación: `https://<tenant>.erp.gob.local`
- API: `https://api.erp.gob.local`
- Keycloak: `https://auth.erp.gob.local`

Login demo:
- usuario: `frontend.tester`
- password: `Frontend123!`

## Publicación del installer

Artefactos de publicación remota:
- `installer/publish/Caddyfile`
- `installer/publish/update_installer.sh`

Canales previstos:
- `https://raw.githubusercontent.com/ruzer/erp-gob-suite/main/installer/install_cli.sh`
- `https://install.erp-gob.com`

## Estructura

- `erp-gob`
- `install.sh`
- `installer/install_cli.sh`
- `scripts/erp-gob-cli.mjs`
- `scripts/bootstrap_institution.mjs`
- `profiles/demo.env`
- `profiles/piloto.env`
- `profiles/prod.env`
- `docker-compose.yml`

## Notas

- El backend aplica migración canónica y seed institucional al arrancar.
- El bootstrap institucional agrega institución, branding, plantilla normativa base, unidad administrativa y área inicial.
- Si el instalador no puede escribir `/etc/hosts`, genera `installer-output/hosts.patch`.
- El instalador remoto deja evidencia en `installer-output/install.log` y `installer-output/install-report.json`.
