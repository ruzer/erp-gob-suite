# SECURITY_HARDENING_v1.12

## Objetivo

Auditar el estado de seguridad operativa del sistema ERP-GOB y definir el cierre minimo necesario para declarar un baseline seguro de despliegue controlado.

Alcance revisado:

- `erp-gob-abastecimiento`
- `erp-gob-frontend`
- `erp-gob-suite`
- Autenticacion OIDC con Keycloak
- Gateway BFF
- Validacion JWT
- Storage documental en MinIO
- Bitacora y trazabilidad de procesos criticos

Fecha de corte: 2026-03-07

## Resumen Ejecutivo

El sistema tiene una base razonable de seguridad de aplicacion:

- OIDC con PKCE en frontend.
- Rotacion de refresh token habilitada en Keycloak.
- Validacion de issuer/audience/JWKS en backend.
- Gateway con cookies `httpOnly`, `sameSite=lax` y correlacion institucional.
- Documentos servidos por URL firmada, no por bucket publico.
- Bitacora institucional y `correlation_id` en dominios criticos.

Sin embargo, el baseline actual sigue siendo de tipo `dev/prod-like`, no de produccion formal. Los principales bloqueadores son operativos:

1. Secretos por defecto y credenciales demo visibles en archivos versionados.
2. Keycloak en modo `start-dev` y realm con `sslRequired=none` en la suite.
3. Suite sin reverse proxy HTTPS formal.
4. CSRF del frontend en modo `warn`, no `enforce`.
5. MinIO expuesto con consola publica y credenciales por defecto en la suite.
6. Arranque de backend en suite con fallback a `prisma db push --accept-data-loss`.

Conclusion:

- `APTO` para desarrollo, pruebas internas y piloto controlado en red cerrada.
- `NO APTO` para exposicion institucional formal o internet hasta cerrar los hallazgos P0.

## Estado por Control

| Area | Estado | Evidencia actual | Cierre requerido |
| --- | --- | --- | --- |
| Secrets | AMBAR | No se observan `.env` productivos versionados, pero si multiples defaults y credenciales demo en `compose`, `realm` y docs. | Rotacion obligatoria y eliminacion de defaults operativos. |
| Keycloak | AMBAR | PKCE, refresh rotation y expiracion corta bien configurados; suite usa `start-dev`, `sslRequired=none`, secretos `change_me`. | Realm y clientes separados para produccion, TLS y rotacion real. |
| TLS | ROJO | Toda la suite opera por HTTP plano. No existe reverse proxy HTTPS formal en `erp-gob-suite`. | Terminar TLS con proxy y forzar URLs publicas HTTPS. |
| JWT | AMBAR | Backend valida `issuer`, `audience` y JWKS; frontend refresca y verifica audiencia. | Endurecer issuer/audience a valores unicos de produccion y monitorear rotacion de llaves. |
| Storage | AMBAR | MinIO usa URLs firmadas; no se detecto publicacion publica del bucket en codigo. Consola y API S3 estan expuestas en suite. | Bucket privado forzado, puertos internos y credenciales rotadas. |
| Auditoria | VERDE | `AuditInterceptor` global, `@Audit(...)` en controladores criticos y uso de `bitacora`/`correlation_id` en servicios. | Completar retencion, export a SIEM y politica de redaccion. |

## 1. Secrets

### Hallazgos

Se localizaron credenciales por defecto o demo en archivos versionados:

- `erp-gob-suite/docker-compose.yml`
- `erp-gob-suite/.env.example`
- `erp-gob-suite/docker/keycloak/realm-erp-dev.json`
- `erp-gob-abastecimiento/core/backend/.env.example`
- `erp-gob-frontend/.env.example`
- `erp-gob-frontend/docker-compose.fullstack.yml`

Patrones observados:

- `KEYCLOAK_API_CLIENT_SECRET=change_me`
- `MINIO_ROOT_PASSWORD=minio123`
- `minioadmin` / `minioadmin`
- `admin` / `admin`
- usuario demo `frontend.tester` con password conocida para entorno local

No se detectaron `.env` productivos versionados en los repos revisados. En el workspace existe `core/backend/.env.local`, pero no esta versionado. Eso es correcto, siempre que siga fuera de Git.

### Riesgo

- Reutilizacion accidental de secretos de desarrollo en entornos compartidos.
- Escalada trivial si un despliegue institucional se levanta con defaults.
- Exposicion de credenciales demo en un repositorio publico o semipublico.

### Cierre requerido

P0:

1. Prohibir despliegues con valores por defecto:
   - `change_me`
   - `admin`
   - `minioadmin`
   - `minio123`
2. Rotar antes de RC operativo:
   - `KEYCLOAK_API_CLIENT_SECRET`
   - `KEYCLOAK_ADMIN_PASSWORD`
   - `MINIO_ROOT_PASSWORD`
   - `POSTGRES_PASSWORD`
3. Mantener solo placeholders en `.env.example`, no valores operativos reutilizables.
4. Agregar escaneo automatico de secretos en CI (`gitleaks` o equivalente).

P1:

1. Mover secretos a gestor externo o variables inyectadas por plataforma.
2. Formalizar politica de rotacion trimestral de secretos de clientes y storage.

## 2. Keycloak

### Estado actual verificado

En `erp-gob-suite/docker/keycloak/realm-erp-dev.json`:

- `accessTokenLifespan = 600`
- `ssoSessionIdleTimeout = 28800`
- `ssoSessionMaxLifespan = 43200`
- `revokeRefreshToken = true`
- `refreshTokenMaxReuse = 0`
- `erp-frontend`:
  - cliente publico
  - `standardFlowEnabled = true`
  - PKCE `S256`
  - `directAccessGrantsEnabled = false`
- `erp-api` y `erp-backend`:
  - clientes confidenciales
  - `secret = change_me`

En frontend:

- Login OIDC usa Authorization Code + PKCE.
- `erp-frontend` puede usar `fallbackClientId` / `fallbackClientSecret` desde rutas server-side.

### Hallazgos

1. La suite corre Keycloak con `start-dev`.
2. El realm dev usa `sslRequired = none`.
3. Los clientes confidenciales usan secreto por defecto `change_me`.
4. `redirectUris` y `webOrigins` estan limitados a localhost, correcto para dev, insuficiente para productivo.
5. `fullScopeAllowed = true` en clientes confidenciales, lo cual es permisivo.

### Riesgo

- Aceptar trafico sin TLS invalida el valor de cookies y tokens fuera de red cerrada.
- `fullScopeAllowed` amplia claims y permisos sin necesidad.
- Un secreto de cliente conocido permite mint o refresh indebido de tokens si el endpoint es alcanzable.

### Cierre requerido

P0:

1. Crear realm institucional separado de `realm-erp-dev.json`.
2. Configurar Keycloak productivo con:
   - `sslRequired = external`
   - `start`, no `start-dev`
3. Rotar secretos de `erp-api` y `erp-backend`.
4. Restringir `redirectUris` y `webOrigins` a dominios reales del frontend.
5. Revisar necesidad de `fallbackClientSecret` en frontend server-side; si no es indispensable, retirarlo en produccion.

P1:

1. Pasar `fullScopeAllowed` a `false`.
2. Definir client scopes minimos por dominio.
3. Formalizar rotacion de llaves de firma del realm con ventana de convivencia.

## 3. TLS Readiness

### Estado actual

En `erp-gob-suite/docker-compose.yml`:

- Frontend expuesto en `http://localhost:13001`
- Backend expuesto en `http://localhost:13000`
- Keycloak expuesto en `http://localhost:8080`
- MinIO expuesto en `http://localhost:9000` y consola `http://localhost:9001`

No existe reverse proxy HTTPS ni configuracion de certificados en la suite.

En frontend:

- Cookies OIDC se marcan `secure` solo cuando `NODE_ENV=production`.
- `NEXT_PUBLIC_APP_ORIGIN` y `KEYCLOAK_PUBLIC_URL` hoy estan en HTTP para la suite local.

### Riesgo

- Tokens y cookies expuestos a sniffing fuera de red local.
- No puede declararse cumplimiento operativo ni hardening de sesion sin HTTPS real.

### Cierre requerido

P0:

1. Introducir reverse proxy HTTPS para frontend y Keycloak.
2. No exponer backend directamente a internet; dejarlo detras de red privada o proxy interno.
3. Forzar variables publicas:
   - `APP_URL=https://erp.gob.mx`
   - `NEXT_PUBLIC_APP_ORIGIN=https://erp.gob.mx`
   - `KEYCLOAK_PUBLIC_URL=https://sso.erp.gob.mx`
   - `APP_ALLOWED_ORIGINS=https://erp.gob.mx`
4. Ejecutar frontend y gateway con `NODE_ENV=production`.

### Configuracion de referencia

```nginx
server {
  listen 443 ssl http2;
  server_name erp.gob.mx;

  ssl_certificate     /etc/letsencrypt/live/erp/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/erp/privkey.pem;
  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
  add_header X-Content-Type-Options "nosniff" always;
  add_header X-Frame-Options "SAMEORIGIN" always;
  add_header Referrer-Policy "strict-origin-when-cross-origin" always;

  location / {
    proxy_pass http://frontend:3001;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto https;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }
}
```

## 4. JWT Validation

### Estado actual verificado

Backend:

- `KeycloakAuthGuard` valida:
  - presencia de Bearer token
  - `issuer`
  - `audience`
  - expiracion
  - firma RSA via JWKS si falla la libreria de Keycloak
- JWKS se consulta en:
  - `/realms/{realm}/protocol/openid-connect/certs`
- Cache local de llaves: 5 minutos

Frontend:

- `/api/auth/me` y `/api/gateway/*` validan audiencia esperada.
- Si el token expira o no trae audiencia correcta, intentan refresh.

### Hallazgos

1. El backend acepta multiples issuers en CSV:
   - `http://keycloak:8080/...`
   - `http://localhost:8080/...`
   Esto es razonable en Docker dev, pero demasiado amplio para produccion.
2. El backend acepta multiples audiencias:
   - `account`
   - `erp-api`
   Correcto para compatibilidad, pero conviene reducirlo en produccion.
3. La verificacion por JWKS existe, pero no hay politica operativa documentada para rotacion de llaves ni monitoreo de fallos de firma.

### Riesgo

- Validacion demasiado permisiva entre hostname interno y externo.
- Mayor superficie para tokens emitidos para audiencias no estrictamente necesarias.

### Cierre requerido

P0:

1. En produccion fijar:
   - `KEYCLOAK_ISSUER=https://sso.erp.gob.mx/realms/erp`
   - `KEYCLOAK_AUDIENCE=erp-api`
2. Mantener solo un issuer publico canónico.
3. Confirmar que todos los tokens de `erp-frontend` incluyan audiencia `erp-api`.

P1:

1. Documentar ventana de rotacion JWKS y prueba de convivencia de llaves.
2. Monitorear incremento de `401 invalid issuer` y `401 invalid audience`.

## 5. CSRF y Sesion

### Estado actual

El gateway del frontend implementa:

- validacion de origen/referer
- header `x-csrf-protection`
- `correlation_id`
- refresh controlado de sesion

Pero `.env.example` y `erp-gob-suite/.env.example` dejan:

- `FRONTEND_CSRF_MODE=warn`

### Riesgo

- En `warn`, la solicitud mutable continua aunque falle la comprobacion CSRF.

### Cierre requerido

P0:

1. En cualquier entorno distinto de local:
   - `FRONTEND_CSRF_MODE=enforce`
2. Verificar que el frontend siempre envie `x-csrf-protection: 1` en mutaciones.

## 6. Storage y MinIO

### Estado actual verificado

Backend:

- `MinioStorageService` usa cliente S3 con credenciales server-side.
- Descarga mediante `getSignedUrl(...)`.
- TTL por defecto de URL firmada:
  - `MINIO_PRESIGN_EXPIRES=900`

No se encontro codigo que exponga el bucket documental como publico ni uso de `setBucketPolicy` para acceso anonimo.

### Hallazgos

1. La privacidad hoy depende de:
   - que el bucket no sea publicado manualmente
   - que solo se acceda via URL firmada
2. La suite expone:
   - API S3 `:9000`
   - consola MinIO `:9001`
3. Credenciales por defecto siguen visibles en compose y ejemplos.

### Riesgo

- Si alguien cambia la policy del bucket o reutiliza defaults, los documentos quedan expuestos.
- La consola publica incrementa superficie operativa y riesgo de administracion insegura.

### Cierre requerido

P0:

1. Mantener bucket `erp-documentos` en modo privado estricto.
2. No publicar `9000/9001` fuera de red administrativa.
3. Rotar credenciales MinIO.
4. Mantener descarga solo por URL firmada de corta vida.

P1:

1. Activar versionado de bucket.
2. Evaluar cifrado SSE y politica de retencion.
3. Agregar bootstrap de policy privada explicita.

### Politica de referencia

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Deny",
      "Principal": "*",
      "Action": ["s3:GetObject", "s3:ListBucket"],
      "Resource": [
        "arn:aws:s3:::erp-documentos",
        "arn:aws:s3:::erp-documentos/*"
      ]
    }
  ]
}
```

## 7. Auditoria Operativa

### Estado actual verificado

Cobertura de auditoria:

| Dominio | Estado | Evidencia |
| --- | --- | --- |
| Expediente | OK | `expediente.controller.ts` usa `@Audit(...)` |
| Procedimiento | OK | `procedimiento.controller.ts` usa `@Audit(...)` |
| Orden | OK | `orden.controller.ts` usa `@Audit(...)` |
| Recepcion | OK | `recepcion.controller.ts` usa `@Audit(...)` |
| Factura | OK | `factura.controller.ts` y `factura-read.controller.ts` usan `@Audit(...)` |
| Devengo | OK | `devengo.controller.ts` y `devengo-read.controller.ts` usan `@Audit(...)` |
| Pago | OK | `pago.controller.ts` y `pago-read.controller.ts` usan `@Audit(...)` |

Adicionalmente:

- `AuditInterceptor` esta registrado globalmente via `APP_INTERCEPTOR`.
- `bitacora` persiste `correlation_id` y `causation_id`.
- Servicios de `factura`, `procedimiento`, `recepcion`, `devengo` y `pago` realizan escrituras explicitas de bitacora en operaciones relevantes.
- `ExpedienteTimelineService` consolida expediente, necesidad, procedimiento, evento juridico, orden, recepcion y documento.
- `ProcedimientoEventoService` persiste eventos juridicos en `bitacora`.

### Riesgo residual

- La auditoria existe, pero no se observa en esta revision:
  - politica formal de retencion
  - exportacion a SIEM
  - mascarado central de secretos/tokens en todos los logs de infraestructura

### Cierre requerido

P0:

1. Prohibir expresamente loguear:
   - `access_token`
   - `refresh_token`
   - `authorization code`
   - `client_secret`
2. Mantener `correlation_id` obligatorio en soporte y operacion.

P1:

1. Exportar bitacora/logs a plataforma central.
2. Definir retencion minima institucional.
3. Firmar o sellar respaldos de auditoria critica.

## 8. Hallazgos Operativos Adicionales

### 8.1 Fallback riesgoso de base de datos

En `erp-gob-suite/docker-compose.yml`, el backend arranca con:

```sh
(npx prisma migrate deploy || (echo '[WARN] prisma migrate deploy failed; applying prisma db push' && npx prisma db push --accept-data-loss))
```

Esto no es aceptable para un entorno institucional estable.

Riesgo:

- deriva de esquema no controlada
- perdida potencial de datos
- imposibilidad de auditar cambios de base de datos

Cierre requerido:

P0:

1. Eliminar `db push --accept-data-loss` de cualquier baseline RC/GA.
2. Permitir solo `migrate deploy` sobre migraciones aprobadas.

### 8.2 Suite aun orientada a desarrollo

La suite actual usa:

- `NODE_ENV=development`
- Keycloak `start-dev`
- puertos administrativos expuestos
- `npm ci` al arrancar contenedores

Eso es valido para laboratorio, no para operacion sostenida.

## 9. Plan de Cierre

### P0 - Obligatorio antes de produccion

1. Reverse proxy HTTPS formal.
2. `FRONTEND_CSRF_MODE=enforce`.
3. Keycloak productivo con `sslRequired=external`.
4. Rotacion de todos los secretos por defecto.
5. Restriccion de `issuer` y `audience` a valores canonicos de produccion.
6. MinIO sin puertos publicos administrativos y bucket privado garantizado.
7. Eliminar `db push --accept-data-loss` del arranque.

### P1 - Hardening recomendado para primer mes productivo

1. Secret scanning en CI.
2. Retencion y export de auditoria.
3. Politica de rotacion de llaves de firma Keycloak.
4. Versionado y cifrado de bucket documental.
5. Proxy/WAF con rate limiting institucional.

### P2 - Madurez institucional

1. Integracion SIEM/SOC.
2. Gestion centralizada de secretos.
3. Backups cifrados y prueba de restore.
4. Politica formal de incident response y revocacion de accesos.

## 10. Criterio de Aceptacion para RC Seguro

Se puede declarar un RC seguro cuando:

- no existan secretos por defecto activos
- frontend opere bajo HTTPS con cookies `secure`
- CSRF este en `enforce`
- Keycloak opere fuera de `start-dev`
- backend no use `db push --accept-data-loss`
- MinIO no este expuesto publicamente con credenciales default
- issuer/audience de JWT esten cerrados a valores productivos
- bitacora y correlacion esten verificadas en flujo critico

## Dictamen Final

Dictamen actual del baseline revisado:

- Seguridad de aplicacion: `ACEPTABLE`
- Seguridad operativa: `PARCIAL`
- Preparacion para produccion: `NO CERRADA`

El ERP-GOB ya tiene controles correctos a nivel de aplicacion, pero todavia arrastra configuracion de laboratorio en autenticacion, transporte, storage y bootstrap de base de datos. El cierre de seguridad v1.12 debe enfocarse en esos puntos operativos, no en reescribir dominio.
