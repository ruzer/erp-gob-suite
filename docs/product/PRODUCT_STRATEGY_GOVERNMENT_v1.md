# PRODUCT_STRATEGY_GOVERNMENT_v1

**Producto:** ERP-GOB  
**Versión de referencia:** v1.14 baseline institucional  
**Documentos base alineados:**
- `docs/architecture/SYSTEM_ARCHITECTURE_v1.11.md`
- `docs/operations/RUNBOOK_OPERATIVO_v1.11.md`
- `docs/governance/CONTROL_INTERNO_MATRIX_v1.11.md`

---

## 1. Problema Actual En Gobiernos Estatales

Los gobiernos estatales suelen operar el proceso de abastecimiento con una combinación ineficiente de:
- sistemas aislados por área;
- hojas de cálculo;
- oficios y expedientes documentales sin trazabilidad transversal;
- validaciones jurídicas fuera del flujo operativo;
- controles de inventario y patrimonial desconectados del proceso de compra;
- cierre financiero desacoplado del expediente;
- supervisión reactiva en vez de control preventivo.

Esto produce cinco problemas estructurales:

| Problema | Efecto institucional |
|---|---|
| Fragmentación entre compras, jurídico, almacén, finanzas y OIC | Retrasos, duplicidad y pérdida de contexto |
| Baja trazabilidad del expediente | Dificultad para auditoría, responsabilidades difusas |
| Secuencias operativas incorrectas | Órdenes, recepciones o pagos fuera de control |
| Catálogos y proveedores sin gobierno uniforme | Riesgo de concentración, errores y sobreprecio |
| Observabilidad limitada | Los hallazgos llegan tarde, cuando el daño ya ocurrió |

En ese contexto, el problema no es solo "digitalizar compras".  
El problema real es **institucionalizar control, trazabilidad y ejecución coordinada**.

---

## 2. Posicionamiento De ERP-GOB

ERP-GOB debe posicionarse como:

**Plataforma institucional de abastecimiento, control operativo y observabilidad para gobiernos estatales.**

No debe venderse como:
- ERP genérico horizontal;
- sistema contable aislado;
- gestor documental aislado;
- software "hecho a medida" sin producto base.

Debe venderse como un producto especializado en:
- procedimiento de compra pública;
- control secuencial del expediente;
- observabilidad institucional;
- inventario operativo y patrimonial;
- trazabilidad auditable;
- integración entre operación, control interno y cierre financiero.

### Tesis de posicionamiento

ERP-GOB resuelve el ciclo completo:

`Investigación -> Checklist -> Necesidad -> Procedimiento -> Cuadro -> Orden -> Recepción -> Inventario -> Factura -> Devengo -> Pago`

y además agrega:
- control preventivo;
- alertas procedimentales;
- trazabilidad por expediente;
- evidencia auditable para OIC/Contraloría.

Eso lo ubica en una categoría más precisa:

**"Plataforma de ejecución y control de abastecimiento público"**

---

## 3. Diferenciadores Clave

### 3.1 Flujo institucional completo
ERP-GOB no cubre solo captura o compras. Cubre el flujo completo desde pre-procedimiento hasta cierre financiero.

### 3.2 Control interno embebido
La matriz de control no es externa al sistema.  
Los controles están instrumentados en el producto mediante:
- checklist legal;
- timeline consolidado;
- reglas de riesgo;
- alertas;
- RBAC;
- evidencia documental.

### 3.3 Observabilidad institucional
El sistema no solo registra datos; explica el estado del expediente:
- qué pasó;
- en qué orden;
- qué riesgo existe;
- qué evidencia lo soporta.

### 3.4 Wizard operativo
Para el capturista, el producto reduce fricción operativa:
- sugiere siguiente paso;
- guía el flujo;
- minimiza captura redundante;
- reduce errores humanos.

### 3.5 Inventario integrado al proceso de compra
ERP-GOB conecta orden y recepción con inventario operativo y patrimonial, evitando la separación típica entre "compras" y "control de bienes".

### 3.6 Arquitectura contract-first
La disciplina OpenAPI + frontend desacoplado + backend modular permite:
- gobernanza de cambios;
- menor ambigüedad entre áreas;
- integrabilidad futura;
- release engineering más serio.

### 3.7 Suite reproducible
La existencia de `erp-gob-suite` permite vender no solo código, sino una forma controlada de despliegue.

---

## 4. Segmentos De Mercado

### 4.1 Segmento primario
**Gobiernos estatales y organismos descentralizados con proceso formal de abastecimiento.**

Casos típicos:
- secretarías de administración;
- institutos de salud;
- universidades públicas estatales;
- poderes judiciales estatales;
- organismos operadores con inventario y patrimonial.

### 4.2 Segmento secundario
**Entes municipales grandes o intermunicipales** con necesidades de:
- compras;
- almacén;
- control de activos;
- observabilidad básica.

### 4.3 Segmento terciario
**Órganos de control y entes fiscalizables** que necesitan trazabilidad, no solo operación.

### 4.4 Criterios de calificación comercial

ERP-GOB encaja mejor cuando el cliente tiene:
- procesos de compra recurrentes;
- observaciones frecuentes de auditoría;
- dispersión de sistemas;
- necesidad de control patrimonial;
- interés en trazabilidad y evidencia institucional.

No es el mejor primer objetivo si el cliente:
- solo busca contabilidad;
- no tiene proceso formal;
- quiere un desarrollo artesanal a medida sin producto base.

---

## 5. Modelo De Implantación

La implantación debe venderse como un proceso controlado, no como instalación improvisada.

### 5.1 Modelo recomendado

| Fase | Objetivo | Entregable |
|---|---|---|
| Diagnóstico | Entender marco normativo y operación actual | Matriz de gap y alcance |
| Parametrización | Ajustar catálogos, roles y reglas | Configuración institucional |
| Carga inicial | Seed institucional y usuarios base | Ambiente funcional |
| Piloto controlado | Operar con uno o pocos procedimientos reales | Evidencia UAT y ajustes |
| Producción controlada | Expandir uso por áreas | Go-live institucional |
| Acompañamiento | Estabilizar operación y adopción | Soporte + métricas + seguimiento |

### 5.2 Estrategia técnica de implantación
- deployment aislado por institución;
- Keycloak por cliente o realm dedicado;
- buckets/documentos segregados;
- parametrización normativa sin alterar producto base;
- suite Docker/K8s reproducible;
- smoke test obligatorio post-instalación.

### 5.3 Modalidades
- **Demo guiada**
- **Piloto institucional**
- **Producción controlada**
- **Escalamiento por módulos**

---

## 6. Modelo De Licenciamiento

ERP-GOB debe comercializarse como producto + servicios.

### 6.1 Esquema recomendado

| Componente | Modelo |
|---|---|
| Licencia base anual | Por institución o ente ejecutor |
| Implementación inicial | Pago único |
| Parametrización normativa | Proyecto acotado por estado/cliente |
| Soporte y mantenimiento | Suscripción anual o bolsa de horas |
| Capacitación | Paquete adicional por rol/área |

### 6.2 Empaquetado por módulos

| Módulo | Alcance |
|---|---|
| Core Contractual | Expediente, necesidades, procedimiento, cuadro, orden |
| Operación y Control | Recepción, inventario, observabilidad, dashboard |
| Patrimonial | Activos, resguardos, resguardantes |
| Finanzas operativas | Factura, devengo, pago |
| Proveedores y compliance | Catálogo, score, alertas, relaciones |

### 6.3 Recomendación comercial
No venderlo como "código fuente con instalación".
Venderlo como:
- licencia;
- implantación;
- soporte;
- actualización normativa;
- evolución controlada.

---

## 7. Roadmap De Producto

### v1.14
Objetivo: baseline institucional operable.
- release congelado;
- suite reproducible;
- seguridad operativa endurecida;
- inventario operativo + patrimonial;
- observabilidad y flujo financiero integrados.

### v1.15
Objetivo: parametrización institucional.
- configuración por institución;
- branding por cliente;
- perfiles de despliegue;
- paquete normativo configurable;
- consolidación de seeds productivos.

### v1.16
Objetivo: empaquetado comercial.
- instalación automatizada;
- perfiles demo / piloto / producción;
- toolkit de migración y onboarding;
- release policy formal;
- portal/documentación comercial.

### v2.0
Objetivo: plataforma vendible multiinstitución.
- multi-tenant de configuración o despliegue industrializado por cliente;
- plantillas estatales;
- gobierno de datos;
- soporte enterprise;
- observabilidad central y analítica avanzada.

---

## 8. Estrategia De Ventas Institucionales

La venta debe ser consultiva e institucional, no transaccional.

### 8.1 Mensaje central
ERP-GOB no vende "pantallas".  
Vende:
- control interno;
- trazabilidad;
- disminución de observaciones;
- integración entre áreas;
- evidencia institucional.

### 8.2 Entry points comerciales

Los mejores puntos de entrada son:
- secretaría de administración;
- dirección de recursos materiales;
- contraloría interna;
- coordinación patrimonial;
- tesorería/finanzas operativas.

### 8.3 Estrategia de aterrizaje

1. Diagnóstico de proceso actual.
2. Mapeo de observaciones y riesgos.
3. Demo sobre flujo real del cliente.
4. Piloto con uno o dos procedimientos reales.
5. Go-live controlado por áreas.

### 8.4 Argumentos de venta institucional

| Necesidad del cliente | Respuesta ERP-GOB |
|---|---|
| "Tenemos procesos fragmentados" | Flujo único de expediente a pago |
| "Auditoría nos observa por falta de evidencia" | Timeline, alertas y evidencia documental |
| "Compras e inventario no están conectados" | Recepción e inventario integrados |
| "Patrimonial está separado" | Resguardos y activos en el mismo ecosistema |
| "No sabemos dónde se rompe el proceso" | Observabilidad institucional y riesgos |

### 8.5 Riesgos de venta si se posiciona mal
- Si se presenta como ERP genérico, entra a competir contra suites más amplias.
- Si se vende como desarrollo a medida, pierde escalabilidad comercial.
- Si se ofrece sin parametrización normativa, no escalará entre estados.

### 8.6 Posicionamiento comercial recomendado

**ERP-GOB debe venderse como plataforma institucional de abastecimiento con control interno integrado, lista para parametrizarse por marco normativo estatal.**

---

## 9. Conclusión

ERP-GOB ya tiene la base para pasar de sistema interno a producto, pero el salto comercial no depende principalmente de más funcionalidad.

Depende de cuatro capacidades:
- parametrización institucional;
- empaquetado de implantación;
- modelo de licenciamiento claro;
- soporte formal de producto.

La estrategia correcta no es vender "software de compras".

La estrategia correcta es vender:

**una plataforma institucional que reduce riesgo, mejora trazabilidad y ordena el ciclo de abastecimiento público bajo control auditable.**
