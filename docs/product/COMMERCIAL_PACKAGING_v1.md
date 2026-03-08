# COMMERCIAL_PACKAGING_v1

**Producto:** ERP-GOB  
**Propósito del documento:** definir cómo empaquetar comercialmente ERP-GOB para gobiernos estatales y entes públicos.  
**Base alineada con:**
- `docs/product/PRODUCT_STRATEGY_GOVERNMENT_v1.md`
- `docs/product/MULTI_TENANT_ARCHITECTURE_v1.md`
- `docs/architecture/SYSTEM_ARCHITECTURE_v1.11.md`

---

## 1. Módulos Del Producto

ERP-GOB debe venderse como un producto modular con un núcleo claro y expansiones opcionales.

### 1.1 Principio comercial

No todos los clientes necesitan entrar con el 100% del producto desde el día uno.  
El empaquetado modular permite:
- reducir fricción comercial;
- acelerar pilotos;
- adaptar costo a madurez institucional;
- crecer por fases sin perder producto base.

### 1.2 Paquetes comerciales

| Paquete | Alcance principal | Perfil de cliente |
|---|---|---|
| **Core Contractual** | expediente, investigación, checklist, necesidades, procedimiento, cuadro, orden | clientes que buscan ordenar compras |
| **Inventario** | recepción, inventario operativo, kardex, conteos, ajustes, almacenes, ubicaciones, transferencias, reorden, vencimientos | clientes con almacén o consumibles |
| **Patrimonial** | activos, resguardos, resguardantes, control OIC patrimonial | clientes con control de bienes y auditoría patrimonial |
| **Observabilidad** | timeline institucional, riesgos, alertas, dashboard operativo, analytics base | contralorías, OIC, áreas de control |
| **Finanzas** | factura, devengo, pago, vista financiera del contrato | clientes que quieren cerrar el expediente hasta pago |
| **Analytics** | tablero ejecutivo, vistas priorizadas, indicadores operativos y de control | clientes maduros que requieren capa ejecutiva |

### 1.3 Descripción por paquete

#### Core Contractual
Incluye:
- expediente;
- investigación de mercado;
- checklist legal;
- necesidades;
- procedimiento;
- cuadro comparativo;
- orden de compra;
- wizard operativo del expediente.

Es el paquete mínimo para institucionalizar el proceso de compra.

#### Inventario
Incluye:
- recepción;
- inventario operativo;
- kardex;
- conteos físicos;
- ajustes;
- almacenes;
- ubicaciones;
- transferencias;
- reorden;
- vencimientos.

Es el paquete que conecta compras con ejecución operativa.

#### Patrimonial
Incluye:
- activos;
- resguardos;
- resguardantes;
- panel de control patrimonial OIC.

Es el paquete orientado a control de bienes y trazabilidad patrimonial.

#### Observabilidad
Incluye:
- timeline consolidado;
- riesgos procedimentales;
- alertas;
- dashboard institucional;
- paneles de apoyo para auditoría y control.

Es el paquete que diferencia ERP-GOB de un sistema transaccional común.

#### Finanzas
Incluye:
- factura;
- devengo;
- pago;
- integración operativa del expediente al cierre financiero.

Es el paquete que completa el flujo administrativo.

#### Analytics
Incluye:
- tablero institucional;
- expedientes con riesgo;
- proveedores alertados;
- operaciones fuera de secuencia;
- métricas operativas de control.

Es el paquete de madurez ejecutiva y supervisión.

### 1.4 Dependencias entre paquetes

| Paquete | Requiere |
|---|---|
| Core Contractual | ninguno |
| Inventario | Core Contractual |
| Patrimonial | Inventario o base patrimonial habilitada |
| Observabilidad | Core Contractual |
| Finanzas | Core Contractual |
| Analytics | Observabilidad |

---

## 2. Modelo De Licenciamiento

### 2.1 Principio

ERP-GOB debe licenciarse como:

**producto + implantación + soporte**

No como:
- desarrollo artesanal por horas;
- entrega de código sin operación;
- proyecto único sin continuidad.

### 2.2 Esquema recomendado

| Componente | Modelo |
|---|---|
| Licencia anual base | por institución o ente ejecutor |
| Módulos adicionales | cargo anual incremental |
| Implantación inicial | pago único |
| Parametrización normativa | pago por proyecto/paquete |
| Soporte y mantenimiento | anual o bolsa de horas |
| Capacitación | paquete opcional por rol |

### 2.3 Niveles de licenciamiento sugeridos

| Nivel | Alcance |
|---|---|
| **Starter** | Core Contractual |
| **Operational** | Core Contractual + Inventario + Observabilidad |
| **Institutional** | Operational + Patrimonial + Finanzas |
| **Executive** | Institutional + Analytics |

### 2.4 Regla comercial

La licencia debe estar ligada a:
- institución;
- despliegue;
- módulos habilitados;
- nivel de soporte contratado.

---

## 3. Servicios De Implantación

La implantación debe tratarse como una línea comercial propia.

### 3.1 Servicios mínimos

| Servicio | Objetivo |
|---|---|
| Diagnóstico institucional | identificar procesos, gaps y alcance |
| Parametrización inicial | branding, tenants, módulos, seguridad |
| Carga base / seed | áreas, catálogos, usuarios y roles |
| Configuración normativa | checklist, umbrales, reglas, evidencia |
| Piloto controlado | ejecutar casos reales con acompañamiento |
| Capacitación por rol | capturista, revisor, finanzas, OIC, admin |
| Go-live | arranque institucional controlado |

### 3.2 Modalidades de implantación

| Modalidad | Uso |
|---|---|
| Demo guiada | preventa |
| Piloto institucional | primera validación con casos reales |
| Implantación parcial | uno o dos módulos |
| Implantación completa | flujo contractual + inventario + finanzas + observabilidad |

### 3.3 Entregables de implantación

Cada implantación debería producir:
- tenant configurado;
- ambiente listo;
- catálogo base cargado;
- seed institucional;
- UAT ejecutado;
- checklist de go-live;
- documentación por cliente.

---

## 4. Soporte

Un producto vendible para gobierno requiere soporte formal.

### 4.1 Niveles de soporte

| Nivel | Alcance |
|---|---|
| L1 | atención funcional básica al usuario |
| L2 | operación, configuración y soporte de implantación |
| L3 | ingeniería, bugs, seguridad y releases |

### 4.2 Tipos de soporte ofrecibles

| Tipo | Contenido |
|---|---|
| Correctivo | incidencias y bugs |
| Preventivo | monitoreo, hardening, revisiones |
| Evolutivo | mejoras menores y parametrización |
| Normativo | ajuste de checklist/reglas por cambios legales |

### 4.3 SLA sugerido

| Criticidad | Respuesta |
|---|---|
| Crítica | < 4 horas |
| Alta | < 1 día hábil |
| Media | < 3 días hábiles |
| Baja | siguiente release o ventana programada |

### 4.4 Requisitos de soporte de producto
- runbooks versionados;
- monitoreo;
- backup y restore;
- release notes;
- política de versiones;
- canal formal de incidentes.

---

## 5. Roadmap

### v1.14
Baseline institucional operable:
- suite endurecida;
- observabilidad funcional;
- flujo contractual completo;
- patrimonial;
- finanzas;
- baseline controlada.

### v1.15
Productización inicial:
- parametrización institucional;
- branding por cliente;
- módulos activables;
- seeds productivos por tenant;
- catálogo de configuración institucional.

### v1.16
Empaquetado comercial:
- instalación automática;
- perfiles demo / piloto / producción;
- toolkit de onboarding;
- soporte formalizado;
- bundles por cliente.

### v2.0
Plataforma comercial madura:
- multi-tenant institucional;
- plantillas normativas estatales;
- canal de upgrades;
- observabilidad central;
- operación multi-cliente.

---

## 6. Estrategia De Clientes Gubernamentales

### 6.1 Tipo de cliente objetivo

Prioridad comercial:
- gobiernos estatales;
- organismos descentralizados;
- universidades públicas;
- entes con compras, almacén y control patrimonial;
- órganos de control que demandan trazabilidad.

### 6.2 Estrategia de entrada

La venta debe iniciar por dolor institucional verificable:
- observaciones recurrentes de auditoría;
- procesos fragmentados;
- falta de trazabilidad;
- desconexión entre compras, inventario y finanzas.

### 6.3 Secuencia comercial recomendada

1. Diagnóstico institucional.
2. Demo sobre flujo real.
3. Propuesta modular.
4. Piloto controlado.
5. Producción controlada.
6. Escalamiento por módulos.

### 6.4 Argumentos de venta

| Dolor del cliente | Respuesta comercial ERP-GOB |
|---|---|
| “No tenemos trazabilidad” | timeline y observabilidad institucional |
| “Auditoría nos observa” | control interno embebido y evidencia auditable |
| “Compras e inventario no se hablan” | flujo integrado orden -> recepción -> inventario |
| “Patrimonial está aislado” | módulo de resguardos y activos |
| “El expediente se pierde entre áreas” | wizard y expediente único operativo |

### 6.5 Estrategia de expansión

Una vez implantado en una institución:
- ampliar módulos;
- ampliar áreas usuarias;
- ampliar entes del mismo estado;
- convertirlo en estándar estatal.

---

## 7. Recomendación Comercial Final

ERP-GOB debe empaquetarse como:

**plataforma institucional modular de abastecimiento y control**

con tres capas de valor:
- operación;
- control;
- trazabilidad.

La combinación comercial correcta es:
- licencia anual;
- implantación inicial;
- parametrización normativa;
- soporte y evolución.

No se debe vender como proyecto sin producto.
Se debe vender como producto con despliegue institucional y crecimiento modular.
