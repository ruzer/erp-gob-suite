# Installer Public Deployment Report

## URL final

```text
https://raw.githubusercontent.com/ruzer/erp-gob-suite/main/installer/install_cli.sh
```

## Versión suite

- `v1.19.2-suite`

## Estado del repositorio

- `ruzer/erp-gob-suite` ahora es `PUBLIC`

## Comandos ejecutados

```bash
curl -I https://raw.githubusercontent.com/ruzer/erp-gob-suite/main/installer/install_cli.sh

curl -sSL https://raw.githubusercontent.com/ruzer/erp-gob-suite/main/installer/install_cli.sh | bash

erp-gob version
erp-gob install demo
erp-gob validate
erp-gob smoke
```

## Resultados

- URL RAW -> `200`
- `erp-gob version` -> PASS
- `erp-gob install demo` -> PASS
- `erp-gob validate` -> PASS
- `erp-gob smoke` -> PASS

## Confirmación de instalación pública

El installer remoto puede ejecutarse desde una máquina limpia usando GitHub Raw como canal temporal:

```bash
curl -sSL https://raw.githubusercontent.com/ruzer/erp-gob-suite/main/installer/install_cli.sh | bash
erp-gob install demo
```

## Observaciones operativas

- el validador reportó `5432` en uso como advertencia no bloqueante
- la instalación remota fue probada en un entorno temporal aislado para no contaminar la instalación local existente
- el comando instalado siguió siendo `erp-gob`
