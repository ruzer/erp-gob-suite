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
- `curl -I <raw-url>` -> `200`
- `curl -sSL <raw-url> | bash` -> PASS
- `erp-gob install demo` -> PASS

## Confirmación de funcionamiento

El installer funciona correctamente como CLI y como bootstrap remoto usando GitHub Raw como canal temporal.

## Conclusión

- estado del código: listo
- estado del canal GitHub Raw: publicado y operativo
- canal recomendado temporal: GitHub Raw
- canal recomendado final: `install.erp-gob.com`
