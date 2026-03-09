# Installer Remote Publication Checklist v1.19.1

## Objetivo

Publicar el instalador remoto oficial para permitir:

```bash
curl -sSL https://install.erp-gob.com | bash
erp-gob install demo
```

## Archivos a publicar

- `installer/install_cli.sh`
- opcionalmente `README.md` con la ruta oficial de instalación

## Opción A - Dominio propio

Publicar `installer/install_cli.sh` en:

- `https://install.erp-gob.com`

Requisitos:

1. `Content-Type: text/plain` o `application/x-sh`
2. TLS válido
3. redirección directa al script, sin HTML intermedio
4. disponibilidad pública

## Opción B - GitHub Raw

Publicar usando:

- `https://raw.githubusercontent.com/ruzer/erp-gob-suite/main/installer/install_cli.sh`

Requisitos:

1. repositorio público o acceso compatible con raw
2. rama `main` actualizada
3. archivo accesible por HTTP `200`

## Validación de publicación

Ejecutar:

```bash
curl -I https://install.erp-gob.com
curl -sSL https://install.erp-gob.com | head
```

o, si se usa GitHub Raw:

```bash
curl -I https://raw.githubusercontent.com/ruzer/erp-gob-suite/main/installer/install_cli.sh
curl -sSL https://raw.githubusercontent.com/ruzer/erp-gob-suite/main/installer/install_cli.sh | head
```

## Smoke mínimo posterior

```bash
curl -sSL <url-publica> | bash
erp-gob version
erp-gob install demo
erp-gob smoke
```

## Criterio de aceptación

- el script remoto responde `200`
- instala `erp-gob` globalmente
- `erp-gob version` responde `ERP-GOB Installer v1.19.1`
- `erp-gob install demo` completa instalación
- `erp-gob smoke` responde PASS
