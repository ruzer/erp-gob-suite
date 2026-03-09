# ERP-GOB v1.19.1 - Global CLI Installer

## Novedades

- CLI global `erp-gob`
- comando `erp-gob version`
- instalador remoto para bootstrap del CLI
- preflight checks antes de instalar
- logs estructurados de instalación
- soporte de perfiles `demo`, `piloto` y `prod`

## Uso

```bash
curl -sSL https://install.erp-gob.com | bash
erp-gob install demo
```

## Validación mínima

```bash
erp-gob version
erp-gob validate
erp-gob smoke
```

## Artefactos principales

- `erp-gob`
- `install.sh`
- `installer/install_cli.sh`
- `installer/publish/Caddyfile`
- `installer/publish/update_installer.sh`
