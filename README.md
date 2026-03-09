# ERP Gubernamental Suite

Suite fullstack reproducible del ERP-GOB para despliegue institucional con Docker.

## Requisitos

- Docker 24+
- Docker Compose V2
- `git`
- `curl`

## Instalación rápida

```bash
curl -sSL https://install.erp-gob.com | bash
erp-gob install demo
```

Canal temporal equivalente:

```bash
curl -sSL https://raw.githubusercontent.com/ruzer/erp-gob-suite/main/installer/install_cli.sh | bash
erp-gob install demo
```

## INSTALL FROM INTERNET

```bash
curl -sSL https://raw.githubusercontent.com/ruzer/erp-gob-suite/main/installer/install_cli.sh | bash
erp-gob install demo
```

Si el repositorio sigue privado y GitHub Raw responde `404`, usa el canal oficial:

```bash
curl -sSL https://install.erp-gob.com | bash
erp-gob install demo
```

## Instalación guiada

```bash
git clone <repo-suite>
cd erp-gob-suite
./install.sh
erp-gob install demo
```

El instalador:
- genera `.env`
- configura hosts locales para el tenant elegido
- inicializa submódulos
- levanta la suite
- ejecuta bootstrap institucional
- valida instalación
- ejecuta smoke post-install

## Publicación del instalador remoto

Los artefactos de publicación del installer viven en:

- `installer/publish/Caddyfile`
- `installer/publish/update_installer.sh`

Despliegue esperado del script remoto:

- `https://install.erp-gob.com`
- `https://install.erp-gob.com/install.sh`
- `https://install.erp-gob.com/installer/install_cli.sh`
- `https://install.erp-gob.com/version`

## Perfiles disponibles

- `demo`
- `piloto`
- `prod`

Puedes sobreescribir parámetros:

```bash
erp-gob install \
  --profile piloto \
  --institution-name "Secretaría de Administración de Oaxaca" \
  --tenant-key oaxaca \
  --state Oaxaca
```

## Comandos del instalador

```bash
erp-gob install demo
erp-gob validate
erp-gob smoke
erp-gob bootstrap --dry-run
erp-gob upgrade
erp-gob version
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
- El instalador remoto deja evidencia en `installer-output/install.log` y `installer-output/install-report.json`.
