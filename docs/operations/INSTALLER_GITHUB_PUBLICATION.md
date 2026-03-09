# Installer GitHub Publication

## Objetivo

Usar GitHub Raw como canal temporal para publicar el installer remoto:

```bash
curl -sSL https://raw.githubusercontent.com/ruzer/erp-gob-suite/main/installer/install_cli.sh | bash
erp-gob install demo
```

## URL pública objetivo

```text
https://raw.githubusercontent.com/ruzer/erp-gob-suite/main/installer/install_cli.sh
```

## Verificación de autosuficiencia del installer

El script remoto [installer/install_cli.sh](/Users/ruzer/ProyectosLocales/ERP/Sistema%20Unificado/erp-gob-suite/installer/install_cli.sh):

1. verifica dependencias mínimas
2. valida Docker, Docker Compose y Node
3. clona `erp-gob-suite`
4. instala el binario global `erp-gob`
5. valida `erp-gob version`

No requiere clonar el repositorio manualmente.

## Comando de instalación

```bash
curl -sSL https://raw.githubusercontent.com/ruzer/erp-gob-suite/main/installer/install_cli.sh | bash
erp-gob install demo
```

## Validación esperada

```bash
erp-gob version
erp-gob install demo
erp-gob validate
erp-gob smoke
```

## Bloqueo si el repositorio es privado

GitHub Raw solo funciona si:

1. el repositorio es público
2. la rama `main` contiene `installer/install_cli.sh`
3. la URL responde `200`

Si el repositorio sigue privado, GitHub Raw devolverá `404` aunque el archivo exista.

## Fallback si GitHub Raw no está disponible

Usar el canal oficial gestionado por infraestructura propia:

```bash
curl -sSL https://install.erp-gob.com | bash
erp-gob install demo
```

## Migración posterior a install.erp-gob.com

Cuando `install.erp-gob.com` esté desplegado:

1. mantener GitHub Raw solo como canal temporal
2. mover la documentación principal a `install.erp-gob.com`
3. mantener GitHub Raw únicamente como respaldo técnico
