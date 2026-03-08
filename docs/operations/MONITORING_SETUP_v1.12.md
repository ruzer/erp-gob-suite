# MONITORING_SETUP_v1.12

**Sistema:** ERP Gubernamental de Abastecimiento  
**Version objetivo:** v1.12  
**Tipo de documento:** Guia operativa de monitoreo y recuperacion  
**Base documental:**
- `docs/operations/OPERATING_METRICS_v1.11.md`
- `docs/operations/RUNBOOK_OPERATIVO_v1.11.md`
- `docs/governance/SECURITY_HARDENING_v1.12.md`
- `docs/operations/UAT_PLAN_v1.12.md`

## 1. Objetivo

Definir la configuracion operativa minima para monitorear, alertar y recuperar el sistema ERP-GOB en ambiente controlado.

Este documento cubre:

- metricas
- logs
- alertas
- backup
- restore
- rollback

No modifica arquitectura ni dominio. Estandariza la operacion sobre lo ya implementado.

## 2. Componentes a monitorear

Componentes de la suite:

- `frontend`
- `backend`
- `postgres`
- `redis`
- `keycloak`
- `minio`

Rutas y fuentes operativas ya disponibles:

- Backend metrics: `GET /metrics`
- Backend health: `GET /ops/health`
- Outbox health: `GET /ops/outbox/health`
- Frontend health indirecta: disponibilidad de `/login` y rutas privadas
- Observabilidad institucional:
  - `GET /observabilidad/dashboard/resumen`
  - `GET /observabilidad/dashboard/expedientes-riesgo`
  - `GET /observabilidad/dashboard/proveedores-alertados`
  - `GET /observabilidad/dashboard/fuera-secuencia`
- Docker healthchecks:
  - `postgres`
  - `redis`
  - `backend`

## 3. Metricas

### 3.1 Metricas obligatorias de plataforma

| Componente | Metrica | Fuente | Frecuencia |
| --- | --- | --- | --- |
| Frontend | disponibilidad HTTP | `http://localhost:13001/login` | cada 1 min |
| Backend | disponibilidad HTTP | `http://localhost:13000/ops/health` | cada 1 min |
| Backend | metricas Prometheus | `http://localhost:13000/metrics` | cada 1 min |
| Outbox | backlog y estado | `http://localhost:13000/ops/outbox/health` | cada 1 min |
| PostgreSQL | disponibilidad | healthcheck Docker + `pg_isready` | cada 1 min |
| Redis | disponibilidad | healthcheck Docker + `PING` | cada 1 min |
| Keycloak | disponibilidad OIDC | `/.well-known/openid-configuration` | cada 5 min |
| MinIO | disponibilidad API/consola | puertos 9000/9001 | cada 5 min |

### 3.2 Metricas funcionales del ERP

Estas metricas deben revisarse en dashboard o por muestreo diario:

- expedientes activos
- procedimientos activos
- ordenes emitidas
- recepciones registradas
- movimientos de inventario
- facturas registradas
- devengos generados
- pagos ejecutados
- alertas activas
- alertas criticas
- expedientes con riesgo
- proveedores con alertas
- operaciones fuera de secuencia

### 3.3 Metricas recomendadas para tablero tecnico

Agrupacion minima:

1. **Disponibilidad**
   - uptime frontend
   - uptime backend
   - estado postgres/redis/keycloak/minio

2. **Latencia**
   - tiempo promedio API
   - percentil 95 de endpoints criticos

3. **Errores**
   - total 4xx por hora
   - total 5xx por hora
   - fallas de auth/refresh

4. **Procesamiento**
   - backlog outbox
   - alertas generadas por observabilidad
   - convergencia de read models

5. **Operacion**
   - expedientes con riesgo
   - ordenes pendientes de recepcion
   - recepciones pendientes de impacto en inventario
   - facturas pendientes de devengo
   - devengos pendientes de pago

## 4. Logs

### 4.1 Fuentes de log

Fuentes ya existentes en el sistema:

- logs del contenedor `frontend`
- logs del contenedor `backend`
- logs del contenedor `postgres`
- logs del contenedor `redis`
- logs del contenedor `keycloak`
- logs del contenedor `minio`
- bitacora institucional en base de datos
- eventos de outbox

### 4.2 Logs obligatorios a preservar

En especial se debe conservar trazabilidad de:

- expediente
- procedimiento
- orden
- recepcion
- factura
- devengo
- pago
- eventos juridicos
- observabilidad / riesgos

Campos minimos:

- `timestamp`
- `correlation_id`
- `actor`
- `entidad`
- `entidad_id`
- `accion`
- `status`
- `error_code` si aplica

### 4.3 Politica operativa de logs

P0:

- no registrar `access_token`, `refresh_token`, `code`, `client_secret`
- preservar `correlation_id` en soporte e incidentes
- centralizar logs de contenedores en un agregador

P1:

- exportar logs a plataforma tipo Loki/ELK/OpenSearch
- retencion minima:
  - aplicacion: 90 dias
  - auditoria critica: 12 meses o segun norma interna

### 4.4 Comandos minimos de inspeccion

```bash
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f keycloak
docker compose logs -f postgres
docker compose logs -f minio
```

Para incidente puntual:

```bash
docker compose logs backend | rg '<correlation-id>'
```

## 5. Alertas

### 5.1 Alertas tecnicas minimas

| Alerta | Condicion | Severidad | Accion inicial |
| --- | --- | --- | --- |
| Backend caido | `/ops/health` no responde | Critica | revisar logs backend y dependencia DB |
| Frontend caido | `/login` no responde | Alta | revisar contenedor frontend y gateway |
| Postgres no disponible | `pg_isready` falla | Critica | verificar volumen, credenciales y espacio |
| Redis no disponible | `PING` falla | Alta | validar servicio y reconexion |
| Keycloak no disponible | metadata OIDC falla | Critica | revisar auth, DB de Keycloak y red |
| MinIO no disponible | API/consola no responde | Alta | revisar storage y credenciales |
| Backlog outbox | `backlogCritical=true` en `/ops/outbox/health` | Alta | revisar workers, eventos pendientes y bloqueos |
| Error 5xx sostenido | > 5 por 5 min en endpoints criticos | Alta | revisar release actual y logs |
| Error 401 anomalo | incremento abrupto de auth failures | Media/Alta | revisar issuer, audience, refresh y Keycloak |

### 5.2 Alertas funcionales minimas

Fuente principal:

- dashboard de observabilidad
- paneles OIC
- timeline de expediente

Alertas a vigilar:

- expedientes con riesgo critico
- operaciones fuera de secuencia
- proveedor repetido o alertado
- desviacion de precio
- recepcion sin orden valida
- orden sin checklist legal completo

### 5.3 Canales de notificacion recomendados

Minimo institucional:

- correo operativo
- canal de incidentes interno
- tablero visible para OIC y administracion tecnica

## 6. Backup

### 6.1 Alcance de backup

Se deben respaldar como minimo:

1. PostgreSQL
2. objetos/documentos en MinIO
3. configuracion del realm Keycloak
4. archivo `.env` del entorno
5. tags/versiones desplegadas de backend/frontend/suite

### 6.2 Politica minima recomendada

| Activo | Frecuencia | Retencion |
| --- | --- | --- |
| PostgreSQL | diario + previo a release | 30 a 90 dias |
| MinIO | diario incremental o mirror | 30 a 90 dias |
| Realm Keycloak | previo a cambios de auth | conservar por release |
| Variables de entorno | por cambio | conservar ultima vigente + anterior |

### 6.3 Backup de PostgreSQL

Ejemplo:

```bash
docker exec -t erp-suite-postgres \
  pg_dump -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -Fc \
  > backup_erp_$(date +%F_%H%M).dump
```

### 6.4 Backup de MinIO

Opcion minima por copia del volumen:

```bash
docker run --rm \
  -v erp-gob-suite_minio_data:/source:ro \
  -v "$PWD/backups:/backup" \
  alpine sh -c 'cd /source && tar czf /backup/minio_$(date +%F_%H%M).tgz .'
```

Alternativa recomendada:

- usar `mc mirror` hacia storage secundario institucional.

### 6.5 Backup de Keycloak

El backup no debe depender solo del JSON dev importado.

Respaldar:

- base de datos de Keycloak
- export del realm vigente
- secretos y client configuration

## 7. Restore

### 7.1 Principio

Todo restore debe probarse en ambiente no productivo antes de declararse valido.

### 7.2 Restore de PostgreSQL

```bash
cat backup_erp.dump | docker exec -i erp-suite-postgres \
  pg_restore -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" --clean --if-exists
```

Notas:

- ejecutar solo en ventana controlada;
- validar integridad post-restore;
- levantar backend y correr smoke test basico;
- no usar restore parcial sin criterio funcional claro.

### 7.3 Restore de MinIO

Si se usa backup por volumen:

```bash
docker run --rm \
  -v erp-gob-suite_minio_data:/target \
  -v "$PWD/backups:/backup:ro" \
  alpine sh -c 'cd /target && tar xzf /backup/minio_YYYY-MM-DD_HHMM.tgz'
```

Si se usa `mc mirror`, restaurar desde el bucket secundario.

### 7.4 Restore de Keycloak

Restaurar:

- base de datos Keycloak
- realm export
- client secrets rotados vigentes

Luego validar:

- login
- refresh token
- `/api/auth/me`
- acceso a `/observabilidad`

## 8. Rollback

### 8.1 Principio

Rollback no es solo regresar contenedores; tambien implica compatibilidad de datos.

Se debe evitar cualquier despliegue que dependa de:

- `prisma db push --accept-data-loss`
- migraciones no certificadas
- cambios destructivos de esquema

### 8.2 Estrategia recomendada

1. versionar backend, frontend y suite por tag;
2. antes de release:
   - backup DB
   - backup MinIO
   - export de Keycloak
3. si el incidente ocurre:
   - detener trafico
   - redeploy del tag anterior
   - restaurar DB y storage si hubo cambios incompatibles

### 8.3 Procedimiento de rollback operativo

```bash
git checkout <tag_anterior_suite>
git submodule update --init --recursive
docker compose down
docker compose up --build -d
```

Si hay corrupcion o cambio funcional incompatible:

1. restaurar PostgreSQL;
2. restaurar MinIO;
3. validar auth y smoke test;
4. reabrir trafico.

### 8.4 Criterios para ejecutar rollback

- error 5xx sostenido tras release
- login OIDC roto
- fallo sistemico en flujo expediente -> orden -> recepcion
- inconsistencia de inventario o finanzas
- degradacion severa de performance

## 9. Smoke test post-backup, restore o rollback

Debe ejecutarse al menos:

1. `GET /metrics`
2. `GET /ops/health`
3. login OIDC
4. `/api/auth/me`
5. consulta de observabilidad
6. consulta de proveedores/productos
7. apertura de un expediente y su timeline

## 10. Checklist operativo diario

### Diario

- validar contenedores arriba
- revisar `/ops/health`
- revisar `/ops/outbox/health`
- revisar alertas criticas
- revisar errores 5xx/401 anormales
- revisar dashboard de observabilidad

### Semanal

- validar backup restaurable
- revisar crecimiento de volumen DB/MinIO
- revisar backlog outbox
- revisar incidentes con `correlation_id`

### Por release

- backup previo
- smoke test post-release
- validacion de auth
- validacion de observabilidad
- validacion de inventario y finanzas

## 11. Herramientas recomendadas

Minimo:

- Docker logs
- dashboard institucional del ERP
- endpoint `/metrics`
- endpoint `/ops/health`
- endpoint `/ops/outbox/health`

Siguiente nivel:

- Prometheus para scrape de `/metrics`
- Grafana para tableros
- Loki u OpenSearch para logs
- Alertmanager para notificaciones

## 12. Cierre

El monitoreo v1.12 debe considerar dos capas:

1. **tecnica**
   - disponibilidad
   - latencia
   - errores
   - outbox
   - auth

2. **institucional**
   - expedientes con riesgo
   - operaciones fuera de secuencia
   - alertas proveedor
   - trazabilidad de recepcion, inventario y finanzas

El sistema ya tiene base suficiente para monitoreo operativo serio. Lo que falta para nivel productivo formal es disciplina de ejecucion:

- centralizacion de logs
- backup probado
- restore validado
- rollback ensayado
- cierre de hallazgos P0 de seguridad
