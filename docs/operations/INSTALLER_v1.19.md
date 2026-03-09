# Installer v1.19

## Objetivo

La capa de instalación v1.19 convierte ERP-GOB en una suite instalable con un flujo guiado y repetible para entornos `demo`, `piloto` y `prod`.

## Comando principal

```bash
./erp-gob install demo
```

## Fases del instalador

1. Generación de `.env`
2. Configuración de hosts locales
3. Inicialización de submódulos
4. Arranque de `docker compose`
5. Bootstrap institucional
6. Validación de instalación
7. Smoke post-install

## Perfiles

### demo

- credenciales amigables
- branding demo
- módulos completos activos
- orientado a evaluación funcional

### piloto

- secretos fuertes
- configuración institucional intermedia
- orientado a validación en dependencia real

### prod

- secretos fuertes
- branding institucional
- parámetros más estrictos
- orientado a operación controlada

## Bootstrap institucional

El bootstrap crea o actualiza:

- institución
- configuración institucional
- plantilla normativa inicial
- unidad administrativa base
- área base

## Validación

`./erp-gob validate` verifica:

- contenedores esperados
- disponibilidad de login
- disponibilidad de host API

## Smoke

`./erp-gob smoke` valida:

- página de login
- `redirect_uri` OIDC correcto
- redirección de rutas protegidas sin sesión

## Upgrade

```bash
./erp-gob upgrade
```

Realiza:

1. backup
2. actualización de código y submódulos
3. rebuild de la suite
4. bootstrap
5. validate
6. smoke

## Salidas

- `.env`
- `installer-output/install-summary.json`
- `installer-output/hosts.patch` si no se puede escribir `/etc/hosts`
