# ERP-GOB v1.19.1 - Global CLI Installer

## Novedades

- CLI global `erp-gob`
- comando `erp-gob version`
- instalador remoto
- preflight checks
- logs estructurados de instalacion
- soporte perfiles demo, piloto y prod

## Uso

```bash
curl -sSL https://install.erp-gob.com | bash
erp-gob install demo
```

## Comandos disponibles

```bash
erp-gob version
erp-gob install demo
erp-gob install piloto
erp-gob install prod
erp-gob validate
erp-gob smoke
erp-gob upgrade
```

## Alcance

Esta release convierte el installer de ERP-GOB en un CLI distribuible desde la suite sin modificar backend, frontend, contrato OpenAPI ni logica de negocio.
