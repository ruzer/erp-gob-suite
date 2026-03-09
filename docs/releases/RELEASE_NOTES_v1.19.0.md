# Release Notes v1.19.0

## Resumen

ERP-GOB v1.19 agrega una capa de instalacion automatica para convertir la suite en un producto desplegable con un solo comando desde el repositorio.

## Cambios principales

- CLI instalador `erp-gob`
- perfiles de despliegue `demo`, `piloto` y `prod`
- bootstrap institucional automatico
- validacion automatica post-instalacion
- smoke test post-install
- script de upgrade de version
- soporte multi-tenant dinamico en proxy y origenes permitidos

## Flujo de instalacion

```bash
./erp-gob install demo
```

El instalador:

1. genera `.env`
2. inicializa submodulos
3. levanta la suite con Docker
4. ejecuta bootstrap institucional
5. valida instalacion
6. ejecuta smoke test post-install

## Comandos disponibles

- `./erp-gob install demo`
- `./erp-gob install --profile piloto --yes`
- `./erp-gob validate`
- `./erp-gob smoke`
- `./erp-gob bootstrap --dry-run`
- `./erp-gob upgrade`

## Validacion ejecutada

- `./erp-gob install demo` PASS
- `./erp-gob validate` PASS
- `./erp-gob smoke` PASS
- `./erp-gob upgrade` PASS
- `./erp-gob validate` PASS
- `./erp-gob smoke` PASS

## Resultado

La suite queda en baseline instalable orientado a producto, con instalacion guiada, bootstrap institucional y verificacion automatica posterior al despliegue.
