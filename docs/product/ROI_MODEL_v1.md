# ROI_MODEL_v1

**Producto:** ERP-GOB  
**Objetivo del documento:** explicar el valor economico de ERP-GOB para instituciones publicas y ofrecer un modelo base para estimar retorno sobre inversion.  
**Audiencia:** secretarias de administracion, oficialias mayores, tesorerias, contralorias, areas de modernizacion y equipos de preventa GovTech.  
**Enfoque:** valor economico institucional, no solo valor tecnico.

---

## 1. Ahorro Operativo

ERP-GOB genera ahorro operativo al reducir friccion administrativa en el flujo de abastecimiento publico.

### 1.1 Fuentes principales de ahorro

- menos tiempo de captura por expediente;
- menos recaptura entre compras, almacen, patrimonial y finanzas;
- menos seguimiento manual por correo, oficio o hoja de calculo;
- menos tiempo de conciliacion entre areas;
- menos tiempo invertido en localizar evidencia para revision o auditoria.

### 1.2 Mecanismos que explican el ahorro

El ahorro no proviene de "digitalizar por digitalizar".  
Proviene de:
- expediente unico;
- wizard operativo;
- flujo guiado por etapas;
- observabilidad institucional;
- trazabilidad documental;
- integracion entre recepcion, inventario, patrimonial y finanzas.

### 1.3 Beneficio economico esperado

El ahorro operativo suele reflejarse en:
- mas expedientes procesados con el mismo equipo;
- menos horas hombre por procedimiento;
- menor dependencia de conocimiento informal;
- menor carga de coordinacion interarea.

---

## 2. Reduccion De Observaciones De Auditoria

ERP-GOB no elimina por si solo el riesgo institucional, pero reduce las causas mas frecuentes de observacion operativa y procedimental.

### 2.1 Fuentes tipicas de observacion

- secuencias fuera de orden;
- ausencia de evidencia;
- checklist legal incompleto;
- falta de trazabilidad;
- recepciones o movimientos sin soporte claro;
- discrepancias entre compra, inventario y patrimonial.

### 2.2 Palancas de reduccion

- timeline consolidado;
- controles de secuencia;
- observabilidad institucional;
- bitacora y `correlation_id`;
- evidencia documental asociada;
- paneles de control para OIC.

### 2.3 Valor economico indirecto

La reduccion de observaciones genera valor porque:
- disminuye horas dedicadas a atender auditorias;
- reduce necesidad de reconstruir expedientes manualmente;
- baja el costo politico y administrativo de hallazgos recurrentes;
- reduce reprocesos y acciones correctivas tardias.

---

## 3. Reduccion De Duplicidad De Captura

Uno de los mayores costos ocultos del sector publico es capturar varias veces el mismo dato en sistemas distintos o en archivos de control manual.

### 3.1 Duplicidades tipicas

- proveedor capturado en catalogo, expediente y reporte paralelo;
- recepcion registrada en compras y luego otra vez en inventario;
- informacion patrimonial gestionada fuera del proceso de compra;
- datos financieros desacoplados del expediente;
- evidencia documental almacenada en carpetas y no en el sistema rector.

### 3.2 Como reduce ERP-GOB esa duplicidad

- expediente como contenedor comun;
- herencia de contexto entre pasos;
- integracion orden -> recepcion -> inventario;
- integracion patrimonial;
- trazabilidad unificada para supervision y soporte.

### 3.3 Traduccion economica

Menos duplicidad implica:
- menos horas de captura;
- menos errores de transcripcion;
- menos conciliaciones posteriores;
- menos necesidad de controles auxiliares en Excel.

---

## 4. Mejora En Trazabilidad Del Gasto

La trazabilidad es una capacidad de control, pero tambien tiene impacto economico.

### 4.1 Que significa trazabilidad en ERP-GOB

Poder seguir el rastro de:

`expediente -> investigacion -> checklist -> necesidad -> procedimiento -> cuadro -> orden -> recepcion -> inventario -> factura -> devengo -> pago`

### 4.2 Valor institucional

La trazabilidad reduce costo porque:
- acelera respuesta a auditoria;
- evita reconstruccion manual de historia;
- permite detectar problemas antes de que escalen;
- disminuye tiempos de soporte y supervision;
- mejora capacidad de toma de decisiones.

### 4.3 Valor economico indirecto

La trazabilidad no siempre se traduce en "ahorro directo en pesos" inmediato.  
Pero si reduce:
- costo de revision;
- costo de correccion;
- costo de coordinacion;
- costo de incidentes operativos.

---

## 5. Indicadores De Eficiencia

Para medir ROI, ERP-GOB debe evaluarse con indicadores concretos.

### 5.1 Indicadores operativos

| Indicador | Descripcion | Unidad |
|---|---|---|
| Tiempo promedio por expediente | horas o dias invertidos desde apertura hasta cierre parcial | tiempo |
| Tiempo de captura por etapa | tiempo invertido en investigacion, checklist, necesidades, etc. | tiempo |
| Numero de recapturas | veces que un dato se vuelve a capturar en otra area | conteo |
| Expedientes procesados por persona | productividad por capturista o equipo | razon |
| Tiempo de localizacion de evidencia | tiempo para responder a una revision | tiempo |

### 5.2 Indicadores de control

| Indicador | Descripcion | Unidad |
|---|---|---|
| Observaciones recurrentes | hallazgos asociados a trazabilidad o secuencia | conteo |
| Alertas criticas | numero de eventos de alto riesgo detectados | conteo |
| Operaciones fuera de secuencia | casos detectados por observabilidad | conteo |
| Expedientes con riesgo | expedientes con reglas activas | conteo |

### 5.3 Indicadores economicos

| Indicador | Descripcion | Unidad |
|---|---|---|
| Horas hombre ahorradas | tiempo administrativo recuperado | horas |
| Costo anual evitado por reproceso | horas evitadas x costo promedio por hora | moneda |
| Costo evitado de atencion a auditoria | horas y esfuerzo de reconstruccion reducidos | moneda |
| Productividad incremental | mas expedientes con la misma plantilla | porcentaje |

---

## 6. Ejemplo De Calculo De ROI

El siguiente ejemplo es ilustrativo.  
Debe ajustarse con datos reales de la institucion.

### 6.1 Supuestos

Institucion hipotetica:
- 1,200 expedientes al ano;
- 5 personas operativas involucradas en captura, seguimiento y conciliacion;
- costo promedio cargado por hora: MXN 250;
- tiempo promedio actual por expediente en tareas administrativas repetitivas: 6 horas;
- reduccion esperada por ERP-GOB en captura, seguimiento y conciliacion: 30%;
- costo anual del producto + soporte: MXN 2,400,000;
- costo inicial de implantacion: MXN 1,800,000.

### 6.2 Ahorro operativo anual estimado

Formula:

`expedientes por ano x horas administrativas por expediente x porcentaje de reduccion x costo por hora`

Calculo:

`1,200 x 6 x 0.30 x 250 = MXN 540,000`

### 6.3 Ahorro por reduccion de recaptura y conciliacion

Supuesto adicional:
- 2 horas promedio por expediente dedicadas a recaptura o conciliacion interarea;
- reduccion esperada: 50%.

Calculo:

`1,200 x 2 x 0.50 x 250 = MXN 300,000`

### 6.4 Ahorro por atencion de auditoria y revision

Supuesto adicional:
- 8 revisiones relevantes al ano;
- 80 horas promedio de preparacion y reconstruccion por revision;
- reduccion esperada por trazabilidad centralizada: 40%.

Calculo:

`8 x 80 x 0.40 x 250 = MXN 64,000`

### 6.5 Beneficio economico anual directo estimado

`540,000 + 300,000 + 64,000 = MXN 904,000`

### 6.6 ROI simple de primer ano

Si en el primer ano se considera:
- costo total primer ano = licencia + soporte + implementacion
- `2,400,000 + 1,800,000 = MXN 4,200,000`

Entonces:

`ROI simple = (beneficio - costo) / costo`

`ROI = (904,000 - 4,200,000) / 4,200,000 = -78.5%`

### 6.7 Lectura correcta del primer ano

Ese resultado no invalida el producto.  
Refleja algo normal en GovTech institucional:
- el primer ano incluye costo de implantacion;
- el valor real aparece por renovacion, expansion modular y maduracion operativa.

### 6.8 ROI simple en ano 2

Si el costo de implementacion ya no se repite y solo permanece:
- licencia + soporte = MXN 2,400,000

Y el beneficio mejora por adopcion a:
- ahorro operativo total anual = MXN 1,500,000

Entonces:

`ROI = (1,500,000 - 2,400,000) / 2,400,000 = -37.5%`

### 6.9 Por que el ROI publico no debe medirse solo asi

En sector publico, el retorno debe evaluarse en dos niveles:

1. **ROI financiero directo**
   horas, reproceso, capacidad operativa.

2. **ROI institucional**
   menos observaciones, mejor control, menos riesgo, mejor trazabilidad, menor dependencia de controles manuales.

### 6.10 ROI institucional extendido

El caso economico mejora cuando se incorporan:
- expansion por modulos en una sola plataforma;
- reemplazo de controles paralelos;
- menor costo de integracion entre sistemas;
- menor costo de auditoria y seguimiento;
- capacidad de operar mas volumen sin crecer la plantilla al mismo ritmo.

---

## 7. Recomendaciones De Uso Del Modelo

### 7.1 No prometer ahorros irreales

ERP-GOB debe venderse con una narrativa seria:
- reduce friccion;
- mejora control;
- aumenta trazabilidad;
- baja reproceso;
- fortalece auditoria.

No debe prometer:
- "ahorro inmediato masivo";
- "eliminacion total de riesgos";
- "ROI positivo automatico en 6 meses" sin base institucional.

### 7.2 Como defender el ROI ante gobierno

El argumento correcto es:
- ERP-GOB reduce costo operativo;
- reduce costo de coordinacion interarea;
- reduce costo de atencion a hallazgos y revisiones;
- mejora capacidad institucional sin depender solo de mas personal;
- fortalece control y evidencia del gasto.

### 7.3 Como calcularlo por cliente

Se recomienda construir un ROI por cuenta usando:
- numero anual de expedientes;
- horas promedio por etapa;
- numero de usuarios operativos;
- volumen de revisiones/auditorias;
- costo promedio cargado por hora;
- numero de sistemas o controles paralelos reemplazados.

---

## Conclusión

El valor economico de ERP-GOB no debe medirse solo como software.  
Debe medirse como plataforma institucional que:
- reduce trabajo administrativo repetitivo;
- baja duplicidad de captura;
- mejora trazabilidad del gasto;
- reduce costo de revision y auditoria;
- permite operar con mayor control y eficiencia.

Su ROI real en gobierno combina:
- ahorro operativo directo;
- reduccion de reproceso;
- mejor productividad;
- y valor institucional por control preventivo.

Ese es el lenguaje correcto para justificar presupuesto publico y adopcion de ERP-GOB.
