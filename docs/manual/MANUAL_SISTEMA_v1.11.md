# MANUAL_SISTEMA_v1.11

**Sistema:** ERP Gubernamental de Abastecimiento  
**Versión:** v1.11  
**Tipo de documento:** Manual de uso institucional  
**Base documental:**  
- `docs/architecture/SYSTEM_ARCHITECTURE_v1.11.md`  
- `docs/operations/RUNBOOK_OPERATIVO_v1.11.md`  
- `docs/governance/CONTROL_INTERNO_MATRIX_v1.11.md`  
- `docs/operations/OPERATING_METRICS_v1.11.md`  

---

## 1. Introducción

El ERP Gubernamental de Abastecimiento es la plataforma institucional para gestionar y controlar el ciclo completo de contratación pública de bienes y servicios.

Su propósito es:
- Estandarizar la operación diaria entre áreas administrativas, técnicas, jurídicas, financieras y de control.
- Reducir errores de secuencia y riesgos operativos.
- Garantizar trazabilidad completa con evidencia auditable.
- Fortalecer control interno, transparencia y cumplimiento.

El sistema gestiona el flujo:

**Expediente -> Necesidades -> Procedimiento -> Cuadro -> Orden -> Recepción -> Inventario -> Factura -> Devengo -> Pago**

Además incluye:
- Observabilidad institucional.
- Control de proveedores (incluyendo compliance y riesgo).
- Control de inventario (movimientos, conteos y ajustes).
- Trazabilidad completa de eventos del expediente.

---

## 2. Roles Del Sistema

## Capturista
Responsable de registrar información operativa.

Funciones principales:
- Crear expedientes.
- Registrar necesidades.
- Cargar investigación de mercado.
- Subir evidencia documental.
- Registrar recepciones.

## Revisor / Área técnica
Responsable de validar calidad y consistencia técnica.

Funciones principales:
- Revisar necesidades.
- Revisar investigación de mercado.
- Validar la información técnica de soporte del procedimiento.

## Jurídico
Responsable de cumplimiento normativo y documental.

Funciones principales:
- Gestionar checklist legal.
- Revisar componentes jurídicos del procedimiento.
- Validar documentación requerida.

## Área financiera
Responsable del cierre financiero.

Funciones principales:
- Registrar facturas.
- Registrar devengos.
- Registrar pagos.

## OIC / Control interno
Responsable de supervisión y auditoría institucional.

Funciones principales:
- Monitorear alertas y riesgos.
- Revisar timeline institucional.
- Auditar expedientes y secuencias de operación.

## Administrador
Responsable técnico-operativo del sistema.

Funciones principales:
- Configuración general de operación.
- Gestión de usuarios y accesos.
- Soporte operativo y continuidad del servicio.

---

## 3. Flujo Operativo Del Sistema

## Paso 1 — Crear expediente
**Ruta:** `expedientes` (UI: `/expedientes/{expedienteId}` para operación por expediente)  

Se registra:
- Tipo de procedimiento.
- Área solicitante.
- Descripción.

Resultado:
- Expediente institucional creado.

---

## Paso 2 — Registrar necesidades
**Ruta:** `expediente -> necesidades` (UI: `/expedientes/{id}/sc`)

Se capturan:
- Bienes o servicios.
- Cantidades.
- Especificaciones.

---

## Paso 3 — Investigación de mercado
**Ruta:** `expediente -> investigación` (UI: `/expedientes/{id}/investigacion`)

Se registra:
- Cotizaciones.
- Proveedores consultados.
- Referencias de precio.

---

## Paso 4 — Checklist legal
**Ruta:** `expediente -> checklist` (UI: `/expedientes/{id}/checklist`)

Se valida:
- Requisitos normativos.
- Documentación obligatoria.

---

## Paso 5 — Generar procedimiento
**Ruta:** `expediente -> procedimiento` (UI: `/expedientes/{id}/procedimientos`)

Define:
- Tipo de contratación.
- Base institucional para evaluación.

---

## Paso 6 — Cuadro comparativo
**Ruta:** `procedimiento -> cuadro` (UI: `/cuadro/{id}` o detalle en procedimiento)

Permite:
- Comparar cotizaciones/propuestas.
- Sustentar selección de proveedor.

---

## Paso 7 — Generar orden
**Ruta:** `procedimiento -> orden` (UI: `/ordenes/{id}` o `/expedientes/{id}/ordenes`)

Se formaliza:
- La adjudicación y compromiso operativo.

---

## Paso 8 — Recepción de bienes
**Ruta:** `orden -> recepción` (UI: `/recepciones/{id}` o `/expedientes/{id}/recepciones`)

Se registra:
- Entrega.
- Cantidades.
- Evidencias.

---

## Paso 9 — Inventario
**Ruta:** `inventario` (UI: `/inventario` y vistas por producto)

Se reflejan:
- Movimientos.
- Kardex.
- Ajustes.

---

## Paso 10 — Facturación
**Ruta:** `finanzas -> facturas` (UI: `/finanzas` o `/finanzas/{id}`)

Se registra:
- Factura del proveedor y datos asociados.

---

## Paso 11 — Devengo
**Ruta:** `finanzas -> devengos` (UI: panel financiero)

Se registra:
- Reconocimiento contable de obligación.

---

## Paso 12 — Pago
**Ruta:** `finanzas -> pagos` (UI: panel financiero)

Se registra:
- Pago ejecutado y cierre operativo financiero.

---

## 4. Wizard De Procedimiento

El sistema incluye un wizard institucional para guiar la ejecución por expediente.

**Ruta:** `/expedientes/{id}/wizard`

Pasos del wizard:
1. Investigación
2. Checklist
3. Necesidades
4. Procedimiento
5. Cuadro
6. Orden
7. Recepción

El sistema bloquea el avance cuando el paso previo no está completo, reduciendo errores de secuencia.

---

## 5. Gestión De Proveedores

**Ruta:** `/proveedores` y `/proveedores/{id}`

Funciones disponibles:
- Alta de proveedor.
- Modificación de datos.
- Gestión de contactos.
- Gestión de domicilios.
- Gestión de documentos.
- Consulta de score y alertas de riesgo.

---

## 6. Gestión De Productos

**Ruta:** `/productos` y `/productos/{id}`

Permite:
- Administrar catálogo de bienes/servicios.
- Cambiar estado activo/inactivo.
- Clasificar y mantener productos operativos.

---

## 7. Observabilidad Institucional

**Ruta:** `/observabilidad`

Componentes principales:
- Timeline institucional del expediente.
- Alertas automáticas.
- Dashboard de control.

Reglas de alerta institucional:
- `R001` orden antes de checklist.
- `R002` recepción antes de orden.
- `R003` concentración de proveedor.
- `R004` desviación de precio.
- `R005` inventario fuera de secuencia.

---

## 8. Evidencia Y Auditoría

Cada acción relevante produce evidencia:
- Evento en timeline.
- Registro de usuario responsable.
- Fecha y hora.
- Referencia a documento/evidencia.

Esto permite reconstruir el expediente completo para revisión de control interno y auditoría.

---

## 9. Manejo De Errores

Los errores institucionales incluyen:
- Código de error.
- Mensaje para usuario.
- `correlationId`.

Este formato soporta:
- Diagnóstico técnico.
- Seguimiento operativo.
- Trazabilidad de incidentes.

---

## 10. Buenas Prácticas De Uso

Recomendaciones:
- Registrar información en el momento de la operación.
- Adjuntar evidencia documental de forma completa.
- Revisar alertas y observabilidad de forma periódica.
- No omitir checklist legal antes de etapas críticas.
- Mantener secuencia del flujo operativo-financiero.

---

## 11. Soporte Técnico

En caso de incidente:
1. Identificar expediente afectado.
2. Registrar y compartir `correlationId`.
3. Contactar al administrador del sistema con contexto del proceso.

---

## 12. Conclusión

El ERP v1.11 proporciona:
- Trazabilidad completa.
- Mayor control interno.
- Reducción de riesgos operativos.
- Eficiencia operativa en flujo de compra pública.

Con ello, el proceso institucional de contratación se vuelve más transparente, controlado y auditable.
