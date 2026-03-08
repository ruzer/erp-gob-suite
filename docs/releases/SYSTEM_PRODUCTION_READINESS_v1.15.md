# SYSTEM_PRODUCTION_READINESS_v1.15

## 1. Resumen ejecutivo

Este documento evalua que falta para llevar ERP-GOB desde `OPERACION INSTITUCIONAL LIMITADA` a `PRODUCCION INSTITUCIONAL COMPLETA`.

Conclusion ejecutiva:

- El flujo contractual principal ya existe y tiene cobertura UI utilizable.
- La arquitectura tecnica es suficientemente madura para operacion controlada.
- El principal bloqueo ya no es funcionalidad de negocio, sino consolidacion institucional:
  - OpenAPI incompleto respecto de la superficie real del backend.
  - configuracion normativa y catalogos sin consola administrativa suficiente.
  - carga masiva inicial no resuelta como capacidad operativa estandar.
  - baseline no congelado porque los tres repositorios tienen cambios locales pendientes.
  - dashboards funcionales pero duplicados y dispersos.

Estado actual recomendado:

`OPERACION INSTITUCIONAL LIMITADA`

No se recomienda clasificar el sistema como `PRODUCCION INSTITUCIONAL` hasta cerrar los puntos P0 de este documento.

## 2. Base auditada

Repositorios auditados:

- `erp-gob-abastecimiento`
- `erp-gob-frontend`
- `erp-gob-suite`

Evidencia principal revisada:

- `erp-gob-abastecimiento/docs/contracts/openapi_v1.14.0_draft.json`
- `erp-gob-abastecimiento/core/backend/src/app.module.ts`
- `erp-gob-frontend/src/domains/expediente-workspace/components/ExpedienteWorkspace.tsx`
- `erp-gob-frontend/src/domains/procedimiento-wizard/components/ProcedimientoWizard.tsx`
- `erp-gob-suite/docker-compose.yml`

Hallazgos estructurales:

- Backend: `139` rutas detectadas en controllers.
- OpenAPI actual: `68` paths, `79` operaciones.
- Diferencia relevante: existen al menos `60` rutas expuestas en backend que no aparecen en el draft actual.
- Los tres repositorios tienen cambios locales pendientes; el sistema no esta en baseline limpio.

## 3. Auditoria OpenAPI

### 3.1 Estado actual

El OpenAPI `v1.14.0-draft` no representa el sistema completo. Representa principalmente slices incrementales recientes de inventario, patrimonial y auditoria, mas parte del contrato previo.

Eso genera tres problemas institucionales:

1. el contrato no es fuente unica de verdad del sistema,
2. el frontend usa endpoints que no estan en el draft actual,
3. no puede certificarse release institucional completo con ese contrato como evidencia unica.

### 3.2 Matriz de endpoints operativos relevantes

| Endpoint | Existe backend | Existe OpenAPI | Usado por UI |
|---|---|---:|---:|
| `POST /expedientes` | Si | No | Si |
| `GET /expedientes/{id}` | Si | No | Si |
| `PATCH /expedientes/{id}/estado` | Si | No | Si |
| `POST /expedientes/{id}/cerrar` | Si | No | Si |
| `POST /investigacion-mercado` | Si | Si | Si |
| `GET /expedientes/{expedienteId}/investigacion-mercado` | Si | Si | Si |
| `GET /investigacion-mercado/{id}` | Si | Si | Si |
| `PATCH /investigacion-mercado/{id}` | Si | Si | Si |
| `GET /expedientes/{id}/checklist` | Si | Si | Si |
| `PATCH /expedientes/{id}/checklist` | Si | Si | Si |
| `POST /expedientes/{expedienteId}/necesidades` | Si | No | Si |
| `GET /expedientes/{expedienteId}/necesidades` | Si | No | Si |
| `GET /necesidades/{id}` | Si | No | Si |
| `POST /expedientes/{expedienteId}/procedimientos` | Si | No | Si |
| `GET /procedimientos/{id}` | Si | No | Si |
| `PATCH /procedimientos/{id}/estado` | Si | No | Si |
| `GET /cuadros` | Si | No | Parcial |
| `GET /cuadros/{id}` | Si | No | Si |
| `GET /cuadros/{id}/renglones` | Si | No | Si |
| `GET /cuadros/{id}/detalles` | Si | No | Si |
| `POST /ordenes` | Si | No | Si |
| `GET /ordenes` | Si | No | Si |
| `GET /ordenes/{id}` | Si | No | Si |
| `PATCH /ordenes/{id}/estado` | Si | No | Si |
| `POST /recepciones` | Si | No | Si |
| `GET /recepciones` | Si | No | Si |
| `GET /recepciones/{id}` | Si | No | Si |
| `PATCH /recepciones/{id}/estado` | Si | No | Si |
| `POST /facturas` | Si | No | Si |
| `GET /facturas/{id}` | Si | Si | Si |
| `PATCH /facturas/{id}` | Si | Si | Si |
| `POST /facturas/{id}/devengo` | Si | Si | Si |
| `GET /devengos/{id}` | Si | Si | Si |
| `POST /devengos/{id}/pago` | Si | Si | Si |
| `GET /pagos/{id}` | Si | Si | Si |
| `GET /observabilidad/dashboard/resumen` | Si | Si | Si |
| `GET /observabilidad/expedientes/{id}/timeline` | Si | Si | Si |
| `GET /observabilidad/expedientes/{id}/riesgos` | Si | Si | Si |
| `GET /activos` | Si | Si | Si |
| `GET /activos/{id}` | Si | Si | Si |
| `GET /activos/{id}/historial` | Si | Si | Si |
| `GET /resguardos` | Si | Si | Si |
| `POST /resguardos` | Si | Si | Si |
| `GET /resguardantes` | Si | Si | Si |
| `GET /almacenes` | Si | Si | Si |
| `POST /almacenes` | Si | Si | Parcial |
| `GET /ubicaciones` | Si | Si | Si |
| `POST /ubicaciones` | Si | Si | Parcial |
| `POST /inventario/salidas` | Si | Si | Si |
| `GET /inventario/salidas/{id}` | Si | Si | Si |
| `POST /inventario/transferencias` | Si | Si | Si |
| `GET /inventario/transferencias/{id}` | Si | Si | Si |
| `POST /inventario/bajas` | Si | Si | Si |
| `GET /inventario/bajas/{id}` | Si | Si | Si |
| `POST /inventario/auditorias` | Si | Si | Si |
| `GET /inventario/auditorias/{id}` | Si | Si | Si |
| `GET /inventario/auditorias/{id}/diferencias` | Si | Si | Si |
| `GET /configuracion/activa` | Si | No | No |
| `GET /configuracion/activa/{id}/parametros` | Si | No | No |
| `GET /audit/expedientes/{expedienteId}/zip` | Si | No | No |
| `GET /contratos/{contratoId}/resumen-financiero` | Si | No | Parcial |

### 3.3 Propuesta: OpenAPI v1.15 consolidado

El siguiente release contractual debe dejar un unico contrato consolidado que incluya, como minimo, estas familias:

- expediente
- investigacion de mercado
- checklist legal
- necesidades
- procedimientos
- cuadros, cotizaciones y ofertas
- ordenes
- recepciones
- inventario operativo
- inventario patrimonial
- facturas, devengos y pagos
- observabilidad
- productos
- proveedores
- documental
- configuracion normativa
- audit zip y reportes institucionales

No basta seguir con drafts incrementales por slice. El sistema necesita una version contractual integral.

## 4. Auditoria de configuracion

### 4.1 Configuraciones que hoy viven en codigo, parametros o seed

| Configuracion | Ubicacion actual | Requiere UI |
|---|---|---:|
| Checklist legal del expediente | servicios backend + panel frontend | Si |
| Checklist legal del procedimiento | `procedimiento-checklist-legal` + UI parcial | Si |
| Tipos de procedimiento | dominio backend / catalogos no expuestos | Si |
| Umbrales normativos de adjudicacion | `configuracion_normativa` | Si |
| Parametros de scoring proveedor | servicios de scoring + configuracion normativa | Si |
| Severidad y thresholds de observabilidad | servicios `intel-precios`, scoring, reglas observabilidad | Si |
| Reglas de wizard / siguiente paso | `nextStepEngine.ts` frontend | Si |
| Estados validos de flujo | services y DTOs | Si |
| Areas institucionales | seed y modelos `Area`, `UnidadAdministrativa` | Si |
| Catalogos de almacenes y ubicaciones | endpoints existen, administracion parcial | Si |
| Modulos visibles por institucion | sidebar, rutas y despliegue | Si |
| Branding institucional | `.env` / suite | Si |

### 4.2 Diagnostico

La configuracion institucional todavia depende demasiado de:

- seed,
- variables de entorno,
- modulos backend,
- logica frontend.

Para produccion institucional completa se necesita una consola administrativa de parametrizacion.

## 5. Auditoria de catalogos

| Catalogo | UI actual | Estado |
|---|---|---|
| Productos | Si | FUNCIONAL |
| Proveedores | Si | FUNCIONAL |
| Areas institucionales | No | INCOMPLETO |
| Tipos de procedimiento | No | INCOMPLETO |
| Tipos de documento | No | INCOMPLETO |
| Checklist normativo | No | INCOMPLETO |
| Almacenes | Si, parcial | PARCIAL |
| Ubicaciones | Si, parcial | PARCIAL |
| Resguardantes | Si | FUNCIONAL |
| Tipos de activo/categorias patrimoniales | No claro en UI administrativa | PARCIAL |
| Unidades y clasificaciones operativas | Parcial | PARCIAL |
| Estados institucionales configurables | No | INCOMPLETO |

Diagnostico:

- los catalogos comerciales y operativos basicos existen,
- los catalogos institucionales y normativos no estan cerrados,
- esto bloquea despliegue repetible en multiples instituciones.

## 6. Auditoria de carga masiva

| Entidad | Metodo recomendado |
|---|---|
| Productos | CSV o Excel |
| Proveedores historicos | CSV o Excel |
| Inventario inicial | migracion inicial o Excel |
| Activos patrimoniales | migracion inicial o Excel |
| Resguardos vigentes | migracion inicial |
| Usuarios | provisionamiento IAM + carga inicial |
| Roles por usuario | carga inicial o sincronizacion IAM |
| Areas institucionales | CSV o seed institucional |
| Almacenes | CSV o seed institucional |
| Ubicaciones | CSV o Excel |
| Expedientes historicos | migracion inicial |
| Catalogos normativos | seed o importador administrativo |
| Documentos historicos | migracion controlada a MinIO |

Diagnostico:

Sin un toolkit operativo de importacion, la implantacion dependera de carga manual o scripts ad hoc. Eso no escala a produccion institucional ni a producto GovTech.

## 7. Auditoria de dashboard

### 7.1 Estado actual

Existen varias superficies de dashboard:

- `/dashboard` -> dashboard operativo institucional
- `/observabilidad` -> dashboard observabilidad
- `/analytics` -> analytics institucional
- `workspace` y wizard consumen resumen de observabilidad
- `insight` y `ops` sobreviven como capas separadas

### 7.2 Problema actual

Hay duplicidad funcional y dispersion:

- mismas fuentes (`/observabilidad/dashboard/*`) alimentan pantallas distintas,
- no existe un dashboard institucional unico con vistas por rol,
- parte de la analitica sigue pareciendo derivada de los mismos agregados.

### 7.3 Recomendacion

Unificar en una sola arquitectura de dashboards:

- Dashboard Operativo
- Dashboard OIC / Control Interno
- Dashboard Ejecutivo
- Dashboard Tecnico / Ops

Cada uno con rutas y permisos claros.

## 8. Auditoria de inventario

### 8.1 Inventario operativo

Cobertura backend:

- ajustes
- conteos
- reservas
- reorden
- vencimientos
- transferencias legacy y v1.14
- salidas
- bajas
- auditorias de inventario
- kardex por producto

Cobertura frontend:

- ajustes
- conteos
- reorden
- vencimientos
- transferencias
- salidas
- bajas
- auditorias
- movimientos/kardex por producto

Estado: `FUNCIONAL`, pero no `COMPLETO`.

Falta para cierre institucional:

- stock agregado por almacen en contrato,
- productos asignados por ubicacion en contrato,
- listado global consolidado de movimientos sin depender de `productoId`,
- evidencia de operacion sostenida con cierres y auditorias reales.

### 8.2 Inventario patrimonial

Cobertura backend:

- activos
- serializacion por serie
- historial de activo
- resguardos
- resguardantes
- entregar/devolver

Cobertura frontend:

- activos
- detalle de activo
- historial de activo
- resguardos
- resguardantes
- panel OIC patrimonial

Estado: `FUNCIONAL`, pero todavia `PARCIAL` como modulo institucional completo.

Falta:

- UI administrativa de tipologias patrimoniales,
- reglas administrativas mas cerradas para control por area/ubicacion,
- carga masiva patrimonial repetible,
- consolidacion committed del estado local actual.

### 8.3 Veredicto inventario

Inventario institucional total: `PARCIAL ALTO`

No esta roto. Tampoco esta todavia totalmente cerrado para certificarlo como modulo institucional completo y replicable.

## 9. Matriz final de readiness

| Area | Estado | Bloquea produccion |
|---|---|---:|
| Arquitectura backend/frontend | Solida | No |
| Flujo contractual E2E | Funcional | No |
| Flujo financiero E2E | Funcional | No |
| Observabilidad institucional | Funcional | No |
| OIDC / Keycloak / suite reproducible | Funcional | No |
| OpenAPI consolidado | Incompleto | Si |
| Configuracion administrativa | Incompleta | Si |
| Catalogos institucionales | Incompletos | Si |
| Carga masiva inicial | Incompleta | Si |
| Dashboard institucional unico | Parcial | No |
| Inventario operativo | Funcional | No |
| Inventario patrimonial | Parcial alto | No |
| Baseline limpio en repos | No | Si |
| Backup/restore con evidencia institucional recurrente | Parcial | Si |

## 10. Veredicto

Clasificacion actual del sistema:

`OPERACION LIMITADA`

Razon:

- el flujo principal ya puede operar,
- la UI cubre el proceso institucional core,
- la infraestructura ya no es el principal problema,
- pero todavia faltan varios elementos obligatorios para hablar de produccion institucional completa:
  - contrato unico y completo,
  - administracion institucional por UI,
  - carga masiva inicial repetible,
  - cierre limpio de baseline,
  - evidencia operativa formal de restore y puesta en marcha.

No corresponde clasificarlo como `NO OPERABLE` ni como simple `PILOTO`, porque el sistema ya esta por encima de ese nivel.

Tampoco corresponde clasificarlo como `PRODUCCION INSTITUCIONAL`, porque la institucion quedaria todavia demasiado dependiente del equipo tecnico para configuracion, migracion y control del release.

## 11. Que falta exactamente para pasar a produccion institucional completa

### 11.1 P0 bloqueantes

- Consolidar OpenAPI v1.15 como contrato completo del sistema.
- Limpiar y congelar los tres repositorios en baseline unico.
- Crear UI administrativa minima para:
  - configuracion normativa activa,
  - checklist legal,
  - tipos de procedimiento,
  - areas,
  - almacenes,
  - ubicaciones,
  - catalogos institucionales criticos.
- Implementar capacidad formal de carga masiva inicial.
- Ejecutar UAT institucional firmado por rol.
- Ejecutar backup/restore drill con evidencia.

### 11.2 P1 necesarios

- Unificar dashboards institucionales por rol.
- Crear gestor documental transversal.
- Exponer y usar resumen financiero de contrato como vista principal.
- Cerrar administracion patrimonial avanzada.
- Formalizar politica de configuracion institucional y catalogos.

### 11.3 P2 mejoras

- Parametrizacion multiinstitucion.
- Plantillas normativas por estado.
- Branding por institucion.
- APIs batch formales.
- Analitica ejecutiva avanzada.
- Productizacion GovTech completa.

## 12. Recomendacion de cierre v1.15

El objetivo de v1.15 no debe ser agregar mas modulos de negocio.

El objetivo correcto es:

1. contrato consolidado,
2. configuracion administrativa,
3. catalogos,
4. importacion inicial,
5. dashboard institucional unico,
6. baseline limpio y certificable.

Cuando esos seis puntos esten cerrados, la clasificacion puede cambiar de:

`OPERACION LIMITADA`

a

`PRODUCCION INSTITUCIONAL COMPLETA`.

## 13. Decision ejecutiva recomendada

ERP-GOB ya puede utilizarse para una operacion institucional acotada con acompanamiento tecnico.

ERP-GOB todavia no debe declararse plataforma plenamente operable por una institucion sin dependencia del equipo implementador.

La brecha restante ya no es de modulo funcional. Es de:

- consolidacion contractual,
- administracion institucional,
- migracion de datos,
- gobierno operativo,
- cierre de release.

