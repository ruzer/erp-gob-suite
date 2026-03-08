# SECURITY_BASELINE_v1.14

## Objetivo

Definir la configuracion minima de seguridad operativa requerida para ejecutar ERP-GOB v1.14 en entorno institucional controlado.

## Controles base

### Identidad y acceso

- OIDC con Keycloak
- frontend publico con PKCE
- backend validando `issuer`, `audience` y JWKS
- usuarios institucionales iniciales:
  - `capturista`
  - `revisor`
  - `finanzas`
  - `oic`
  - `admin`

### Transporte

- terminacion TLS por reverse proxy
- dominios publicos de referencia:
  - `erp.gob.local`
  - `api.erp.gob.local`
  - `auth.erp.gob.local`

### Sesion y CSRF

- cookies `httpOnly`
- `sameSite=lax`
- `FRONTEND_CSRF_MODE=enforce`

### Secretos

- no usar `change_me`
- no usar passwords por defecto
- variables sensibles obligatorias en `.env`:
  - `POSTGRES_PASSWORD`
  - `MINIO_ROOT_PASSWORD`
  - `KEYCLOAK_ADMIN_PASSWORD`
  - `KEYCLOAK_API_CLIENT_SECRET`
  - `KEYCLOAK_BACKEND_CLIENT_SECRET`

### Storage

- MinIO no expuesto directamente al exterior
- documentos privados
- descarga por URL firmada

### Auditoria

- bitacora institucional
- `correlation_id`
- timeline y observabilidad

## Prohibiciones operativas

- no usar `start-dev` fuera de laboratorio
- no usar `db push --accept-data-loss`
- no publicar consola MinIO a internet
- no publicar secretos en repositorio ni en logs

## Criterio minimo para release segura

El release v1.14 solo debe declararse aceptable si:

- auth funciona con TLS
- CSRF esta en `enforce`
- secretos fueron rotados
- smoke test end-to-end pasa
- backup y restore se probaron
