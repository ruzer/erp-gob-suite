# CONTROL_INTERNO_MATRIX_v1.11

**Sistema:** ERP Gubernamental de Abastecimiento  
**Versión:** v1.11  
**Referencias base:**  
- `docs/architecture/SYSTEM_ARCHITECTURE_v1.11.md`  
- `docs/operations/RUNBOOK_OPERATIVO_v1.11.md`  

---

## 1. Introducción

La presente matriz define los controles internos del ERP institucional para el proceso de compra pública, alineando operación, trazabilidad, riesgo y auditoría.

Objetivos de control:
- Prevenir desviaciones de secuencia y cumplimiento legal.
- Detectar riesgos operativos y de integridad de forma temprana.
- Garantizar evidencia verificable para OIC, Contraloría y auditoría.
- Estandarizar la ejecución del flujo institucional bajo reglas comunes.

Alcance funcional evaluado:
- Expediente
- Investigación de mercado
- Checklist legal
- Necesidades
- Procedimiento
- Cuadro comparativo
- Orden de compra
- Recepción
- Inventario
- Factura / Devengo / Pago
- Observabilidad institucional
- Proveedor compliance

---

## 2. Mapa De Riesgos Del Proceso De Compra

| Etapa | Riesgo principal | Impacto institucional |
|---|---|---|
| Investigación de mercado | Colusión o sesgo de fuentes/proveedor | Sobreprecio, adjudicación riesgosa |
| Investigación de mercado | Precio de referencia no consistente | Distorsión en evaluación y contratación |
| Procedimiento | Inicio sin requisitos legales completos | Nulidad o observaciones de auditoría |
| Evaluación (cuadro) | Concentración reiterada en proveedor | Riesgo de favoritismo o dependencia |
| Orden de compra | Orden emitida fuera de secuencia legal | Incumplimiento procedimental |
| Recepción | Recepción registrada antes de orden válida | Riesgo de fraude operacional |
| Inventario | Movimientos fuera de secuencia documental | Diferencias patrimoniales y hallazgos |
| Pago | Flujo financiero sin trazabilidad de soporte | Riesgo de pago improcedente |

---

## 3. Matriz De Control Interno

| Proceso | Riesgo | Control del sistema | Evidencia | Automatizado |
|---|---|---|---|---|
| Investigación de mercado | Desviación de precio vs referencia | Regla `R004_DESVIACION_PRECIO_INVESTIGACION` en observabilidad | Riesgo + alerta + timeline expediente | Sí |
| Checklist legal | Emisión de orden con checklist incompleto | Regla `R001_ORDEN_ANTES_CHECKLIST` y señalización de secuencia en wizard | Riesgo + estado checklist + timeline | Sí |
| Orden de compra | Concentración de proveedor | Regla `R003_PROVEEDOR_REPETIDO` | Riesgo por expediente/proveedor + alertas | Sí |
| Recepción | Recepción previa a orden | Regla `R002_RECEPCION_ANTES_ORDEN` | Riesgo crítico + evento de recepción/orden | Sí |
| Inventario | Kardex fuera de secuencia | Regla `R005_INVENTARIO_FUERA_SECUENCIA` | Alerta inventario + eventos kardex/recepción | Sí |
| Proveedor compliance | Proveedor con exposición de riesgo | Score, alertas y relaciones de proveedor | Historial score, alertas, relaciones | Sí |
| Flujo financiero | Secuencia financiera incompleta o inconsistente | Flujo operacional Factura -> Devengo -> Pago en panel financiero | Registros de factura/devengo/pago y estados | Parcial (flujo guiado) |
| Expediente | Pérdida de trazabilidad transversal | Timeline consolidado + observabilidad por expediente | Timeline completo y correlación de eventos | Sí |

---

## 4. Controles Automáticos Del Sistema

Controles implementados en el motor de observabilidad institucional:

1. **R001_ORDEN_ANTES_CHECKLIST**  
   Detecta órdenes emitidas cuando el checklist legal no está en estado de cumplimiento.

2. **R002_RECEPCION_ANTES_ORDEN**  
   Detecta recepciones registradas con fecha anterior a la orden relacionada.

3. **R003_PROVEEDOR_REPETIDO**  
   Detecta concentración de adjudicación en el mismo proveedor dentro de expediente.

4. **R004_DESVIACION_PRECIO_INVESTIGACION**  
   Detecta desviaciones relevantes entre monto de orden y precio de referencia investigado.

5. **R005_INVENTARIO_FUERA_SECUENCIA**  
   Detecta movimientos de inventario incongruentes frente a la secuencia recepción/orden.

Mecánica de operación:
- Evaluación on-demand por expediente/proveedor.
- Deduplicación de alertas por `fingerprint`.
- Exposición read-only por endpoints de observabilidad.

---

## 5. Trazabilidad Y Auditoría

La trazabilidad institucional se construye mediante:
- Timeline consolidado por expediente (`/observabilidad/expedientes/{id}/timeline`).
- Eventos jurídicos de procedimiento (`/procedimientos/{id}/eventos`).
- Historial de checklist legal y estados relevantes.
- Alertas y riesgos de observabilidad por expediente/proveedor/inventario.
- Registros de operación (factura, devengo, pago, recepción, inventario).

Resultado:
- Reconstrucción verificable de la secuencia operativa.
- Identificación explícita de puntos de desviación.
- Base documental para revisiones de OIC y auditorías externas.

---

## 6. Evidencia Auditable

El sistema genera y conserva evidencia institucional en:
- **Timeline expediente:** secuencia consolidada de hitos.
- **Alertas y riesgos:** clasificación de severidad y evidencia asociada.
- **Historial proveedor:** score, relaciones, alertas y desempeño.
- **Inventario/Kardex:** movimientos y consistencia de secuencia.
- **Documentos/evidencias:** soporte documental por proceso (almacenamiento documental).

La evidencia permite:
- Revisiones de cumplimiento.
- Dictámenes de control interno.
- Seguimiento de acciones correctivas.

---

## 7. Roles De Control

| Rol | Función de control | Alcance sobre controles |
|---|---|---|
| Capturista / Operador | Ejecuta captura y secuencia operativa | Registra evidencia y datos base de control |
| Revisor / Responsable | Verifica consistencia de expediente y proceso | Valida integridad antes de etapas críticas |
| OIC / Auditoría | Supervisa riesgos, alertas y secuencia institucional | Lectura transversal, sin mutaciones |
| Administrador | Asegura disponibilidad, accesos y gobernanza técnica | Mantiene condiciones de operación y trazabilidad |

---

## 8. Nivel De Madurez Del Sistema (1-5)

| Dimensión | Nivel | Justificación |
|---|---:|---|
| Arquitectura | 5 | Backend modular + frontend desacoplado + suite reproducible |
| Control interno | 4 | Matriz de riesgos con controles automáticos activos y evidencia transversal |
| Observabilidad | 4 | Timeline consolidado, reglas de riesgo y dashboard operativo |
| Seguridad | 4 | OIDC + RBAC + gateway institucional con separación de roles |
| Cumplimiento | 4 | Flujo secuencial trazable y documentación operativa/arquitectónica versionada |

---

## 9. Conclusión

El ERP v1.11 funciona como sistema de control institucional, no solo como sistema transaccional, porque:
- Reduce riesgo de fraude y errores de secuencia mediante reglas automáticas.
- Mejora la trazabilidad con timeline consolidado y evidencia correlacionada.
- Facilita auditoría por exposición controlada de riesgos y alertas.
- Fortalece control interno al unir operación diaria, cumplimiento legal y observabilidad.

Estado del artefacto: **Apto para operación, control y auditoría institucional en v1.11**.
