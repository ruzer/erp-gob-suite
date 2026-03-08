# OPERATING_METRICS_v1.11

**Sistema:** ERP Gubernamental de Abastecimiento  
**Versión:** v1.11  
**Referencias base:**  
- `docs/architecture/SYSTEM_ARCHITECTURE_v1.11.md`  
- `docs/operations/RUNBOOK_OPERATIVO_v1.11.md`  
- `docs/governance/CONTROL_INTERNO_MATRIX_v1.11.md`  

---

## 1. Introducción

Las métricas operativas son indicadores cuantitativos para monitorear el comportamiento diario del ERP y su cumplimiento institucional.

En este contexto, permiten:
- Supervisar volumen de operación y avance del flujo de compra pública.
- Detectar desviaciones de secuencia y focos de riesgo oportunamente.
- Medir eficiencia entre etapas operativas y financieras.
- Sustentar decisiones de gestión, control interno y auditoría.

Estas métricas se alinean al flujo real implementado en v1.11:
Expediente -> Investigación -> Checklist -> Necesidades -> Procedimiento -> Cuadro -> Orden -> Recepción -> Inventario -> Factura -> Devengo -> Pago, con capa de observabilidad institucional.

---

## 2. Métricas De Operación Diaria

| Métrica | Descripción | Fuente | Uso |
|---|---|---|---|
| Expedientes creados por día | Total de expedientes iniciados en ventana diaria | Dominio expediente (`/expedientes`) | Monitorear carga operativa inicial |
| Procedimientos activos | Procedimientos en estado operativo/no cerrado | Dominio procedimiento (`/procedimientos/{id}` y listas por expediente) | Control de cartera en curso |
| Órdenes emitidas | Órdenes registradas por período | Dominio orden (`/ordenes`) | Seguimiento de compromisos de compra |
| Recepciones registradas | Recepciones capturadas por período | Dominio recepción (`/recepciones`) | Medir avance de cumplimiento físico |
| Movimientos de inventario | Altas/cambios de movimientos operativos | Inventario/Kardex (`inventory`, `inventory-write`) | Control de impacto logístico |
| Facturas registradas | Facturas creadas por período | Finanzas (`/facturas`, `/contratos/{id}/facturas`) | Trazar inicio de cierre financiero |
| Devengos generados | Devengos creados por período | Finanzas (`/facturas/{id}/devengo`, `/contratos/{id}/devengos`) | Control de reconocimiento financiero |
| Pagos ejecutados | Pagos registrados por período | Finanzas (`/devengos/{id}/pago`, `/contratos/{id}/pagos`) | Medir cierre financiero operativo |

---

## 3. Métricas De Control

| Métrica | Descripción | Fuente | Uso de control interno |
|---|---|---|---|
| Alertas activas | Alertas totales vigentes en observabilidad | `/observabilidad/alertas` | Priorización de casos abiertos |
| Alertas críticas | Alertas de severidad crítica | `/observabilidad/alertas?severidad=CRITICAL` | Escalamiento inmediato |
| Expedientes con riesgo | Expedientes con al menos una regla disparada | `/observabilidad/dashboard/expedientes-riesgo` | Seguimiento OIC y responsables |
| Proveedores con alertas | Proveedores con alertamiento activo | `/observabilidad/dashboard/proveedores-alertados` | Prevención de exposición recurrente |
| Operaciones fuera de secuencia | Casos de secuencia inválida detectados | `/observabilidad/dashboard/fuera-secuencia` | Corrección procedimental |
| Desviaciones de precio detectadas | Riesgos R004 detectados en período | `/observabilidad/expedientes/{id}/riesgos` | Mitigar sobreprecio y justificar decisiones |

---

## 4. Métricas De Desempeño Operativo

> Definición recomendada: diferencia promedio (horas/días) entre timestamp de evento origen y evento destino, usando timeline consolidado de expediente.

| Métrica de tiempo | Definición | Fuente |
|---|---|---|
| Investigación -> Procedimiento | Tiempo entre registro de investigación y creación de procedimiento | Timeline + eventos de investigación/procedimiento |
| Procedimiento -> Orden | Tiempo entre creación/estado operativo de procedimiento y emisión de orden | Timeline + orden |
| Orden -> Recepción | Tiempo entre emisión de orden y primera recepción asociada | Timeline + recepción |
| Recepción -> Inventario | Tiempo entre recepción y movimiento de inventario relacionado | Timeline + kardex/inventario |
| Factura -> Devengo | Tiempo entre factura registrada y devengo generado | Dominios factura/devengo + timeline |
| Devengo -> Pago | Tiempo entre devengo generado y pago registrado | Dominios devengo/pago + timeline |

Uso:
- Identificar cuellos de botella por etapa.
- Establecer acuerdos de nivel de servicio (SLA interno).
- Comparar desempeño por unidad responsable.

---

## 5. Métricas De Inventario

| Métrica | Descripción | Fuente | Uso |
|---|---|---|---|
| Stock total | Existencia agregada de inventario | Dominio inventario | Vista general de disponibilidad |
| Productos bajo mínimo | Ítems bajo umbral operativo | Inventario analítico/reorden | Prevención de ruptura de stock |
| Movimientos de kardex | Número de movimientos por período | Kardex | Auditoría de trazabilidad de existencias |
| Conteos cíclicos pendientes | Conteos abiertos/no cerrados | `inventory-write` (`conteos`) | Disciplina de control físico |
| Ajustes de inventario | Ajustes generados por corrección | `inventory-write` (`ajustes`) | Control de variaciones y regularización |

---

## 6. Métricas De Proveedores

| Métrica | Descripción | Fuente | Uso |
|---|---|---|---|
| Proveedores activos | Proveedores en estado operativo | Dominio proveedores | Capacidad de abastecimiento disponible |
| Proveedores inhabilitados | Proveedores en estado restringido | Proveedores + scoring/compliance | Riesgo de continuidad/cumplimiento |
| Score promedio proveedores | Promedio de score en cartera activa | Proveedor score (`/proveedores/{id}/score`) | Tendencia de riesgo proveedor |
| Proveedores con alertas | Proveedores con alertamiento vigente | Observabilidad + proveedor riesgo | Priorización de revisión y mitigación |

---

## 7. Métricas De Sistema

| Métrica | Descripción | Fuente | Uso técnico |
|---|---|---|---|
| Disponibilidad | Estado de uptime de frontend/backend | Health checks y monitoreo operativo | Continuidad del servicio |
| Errores 4xx | Errores de cliente/autorización/flujo | Logs gateway/API + métricas runtime | Detectar fricción operativa |
| Errores 5xx | Errores internos de servicio | Logs backend + monitoreo | Detectar incidentes técnicos |
| Tiempo promedio de respuesta API | Latencia media de endpoints críticos | Métricas frontend API + backend | Evaluar performance de operación |
| Procesos batch ejecutados | Ejecución de jobs/schedulers habilitados | Logs y métricas de procesos | Control de tareas periódicas |
| Alertas generadas por motor de reglas | Total de alertas derivadas de R001-R005 | Observabilidad/risk engine | Medir eficacia del control automático |

---

## 8. Dashboard Operativo Institucional

El dashboard institucional debe mostrar como mínimo:

1. **Expedientes activos**  
   Para dimensionar carga operativa en curso.

2. **Alertas críticas**  
   Para priorizar intervención inmediata.

3. **Proveedores riesgosos**  
   Para control preventivo de contratación.

4. **Inventario crítico**  
   Para evitar ruptura y ajustar abastecimiento.

5. **Pagos pendientes**  
   Para seguimiento de cierre financiero.

Presentación recomendada:
- Tarjetas resumen (KPI).
- Listas priorizadas por severidad.
- Enlaces directos al expediente/proveedor afectado.

---

## 9. Conclusión

La capa de métricas operativas v1.11:
- Refuerza control institucional al convertir eventos en indicadores accionables.
- Permite detección temprana de desvíos operativos, legales y financieros.
- Facilita auditoría al conectar datos, reglas y evidencia en una misma vista.
- Mejora la gestión diaria al ofrecer visibilidad transversal por proceso y por rol.

Estado del artefacto: **Apto para monitoreo operativo institucional en v1.11**.
