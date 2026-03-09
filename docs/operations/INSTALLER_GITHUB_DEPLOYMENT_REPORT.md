# Installer GitHub Deployment Report

## URL final evaluada

```text
https://raw.githubusercontent.com/ruzer/erp-gob-suite/main/installer/install_cli.sh
```

## Versión suite

- `v1.19.2-suite`

## Comandos ejecutados

```bash
curl -I https://raw.githubusercontent.com/ruzer/erp-gob-suite/main/installer/install_cli.sh
./erp-gob version
./erp-gob validate
./erp-gob smoke
```

## Resultado

- `./erp-gob version` -> PASS
- `./erp-gob validate` -> PASS
- `./erp-gob smoke` -> PASS
- `curl -I <raw-url>` -> `404`

## Confirmación de funcionamiento

El installer funciona correctamente como CLI y como bootstrap local.

La publicación por GitHub Raw no quedó funcional en el momento de esta verificación porque la URL pública devuelve `404`.

## Causa probable

Una de estas dos condiciones sigue presente:

1. el repositorio no es público
2. el acceso Raw no está habilitado para ese contenido

## Conclusión

- estado del código: listo
- estado del canal GitHub Raw: no publicado operativamente
- canal recomendado mientras tanto: `install.erp-gob.com`
