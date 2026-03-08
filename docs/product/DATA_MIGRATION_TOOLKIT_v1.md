# DATA_MIGRATION_TOOLKIT_v1

**Producto:** ERP-GOB  
**Objetivo del documento:** definir un toolkit institucional para migracion de datos hacia ERP-GOB en despliegues de gobiernos estatales.  
**Audiencia:** equipo de implantacion, arquitectura, datos, soporte y responsables institucionales de origen de informacion.  
**Enfoque:** migracion controlada, validable y reversible de datos operativos y patrimoniales.

---

## 1. Estrategia De Migracion De Datos

La migracion de datos en ERP-GOB no debe tratarse como una simple importacion tecnica.  
Debe tratarse como un proceso institucional controlado porque los datos migrados afectan:
- trazabilidad del expediente;
- continuidad operativa;
- control patrimonial;
- consistencia de inventario;
- evidencia para auditoria;
- confianza de usuarios en el sistema.

### 1.1 Principios rectores

- **no migrar todo por defecto**: migrar solo lo necesario para operacion y trazabilidad;
- **priorizar datos maestros y saldos confiables** sobre historicos ruidosos;
- **mantener evidencia del origen** de cada lote migrado;
- **validar antes de cargar** y volver a validar despues;
- **hacer migraciones por olas**, no un big bang indiscriminado;
- **tener rollback claro** para cada lote.

### 1.2 Secuencia recomendada

1. analisis de fuentes;  
2. mapeo origen-destino;  
3. limpieza y homologacion;  
4. carga de catalogos base;  
5. carga de datos operativos;  
6. validacion funcional;  
7. carga de historicos seleccionados;  
8. cierre y acta de migracion.

### 1.3 Olas de migracion sugeridas

| Ola | Contenido | Objetivo |
|---|---|---|
| Ola 1 | usuarios, roles, areas, catalogos base | habilitar ambiente operable |
| Ola 2 | proveedores y productos | permitir operacion contractual e inventario |
| Ola 3 | inventario operativo y patrimonial | establecer saldos y activos iniciales |
| Ola 4 | expedientes historicos seleccionados | dar continuidad y trazabilidad minima |

---

## 2. Modelos De Datos Que Se Migran

La migracion debe priorizar los dominios que sostienen la operacion institucional.

### 2.1 Proveedores

Datos tipicos a migrar:
- proveedor maestro;
- RFC o identificador fiscal;
- razon social;
- estado;
- contactos;
- domicilios;
- documentos base de cumplimiento si existen en fuente estructurada.

Objetivo:
- evitar recaptura masiva;
- iniciar con catalogo maestro usable;
- soportar compras desde el dia uno.

### 2.2 Inventario Operativo

Datos tipicos a migrar:
- productos;
- existencias por almacen o ubicacion;
- stock inicial;
- lotes o fechas de caducidad si aplican;
- movimientos recientes relevantes o saldo de apertura.

Objetivo:
- no romper continuidad de almacen;
- permitir recepcion y control de stock desde el arranque.

### 2.3 Patrimonial

Datos tipicos a migrar:
- activos;
- numero de inventario;
- numero de serie;
- placas o identificadores internos;
- resguardos vigentes;
- resguardantes;
- ubicacion actual;
- estado del bien.

Objetivo:
- establecer foto patrimonial inicial confiable;
- habilitar control OIC y trazabilidad de bienes.

### 2.4 Expedientes Historicos

Datos tipicos a migrar:
- expedientes cerrados o vigentes seleccionados;
- necesidades principales;
- procedimiento;
- ordenes;
- recepciones;
- documentos o referencias documentales;
- estatus final o situacion actual.

Objetivo:
- conservar continuidad minima del archivo institucional;
- evitar que ERP-GOB nazca "sin pasado";
- habilitar consulta y contexto en supervision y auditoria.

### 2.5 Regla de alcance

No todos los historicos deben migrarse.  
La regla recomendada es:
- migrar **catalogos completos**;
- migrar **saldos vigentes**;
- migrar **expedientes activos y una ventana historica util**;
- archivar historicos profundos fuera de ERP-GOB si no aportan valor operativo inmediato.

---

## 3. Herramientas De Migracion

### 3.1 Herramientas recomendadas

| Herramienta | Uso recomendado |
|---|---|
| CSV controlado | intercambios simples y homologacion institucional |
| hojas de mapeo | definicion de correspondencias origen-destino |
| scripts TypeScript/Node | transformacion, normalizacion y carga |
| Prisma seed / loaders | insercion controlada de catalogos y datos base |
| validadores previos | deteccion de nulos, duplicados, claves rotas |
| reportes de conciliacion | cierre y evidencia de migracion |

### 3.2 Regla de tooling

El toolkit debe evitar:
- cargas manuales directas a produccion;
- edicion ad hoc en base de datos;
- scripts desechables sin version;
- transformaciones invisibles para el cliente.

### 3.3 Artefactos minimos de migracion

Cada migracion institucional debe producir:
- plantilla de extraccion;
- layout de homologacion;
- reglas de limpieza;
- script de carga;
- reporte de errores;
- reporte de conciliacion;
- acta de cierre del lote.

---

## 4. Validacion De Datos

La validacion debe ocurrir en tres niveles.

### 4.1 Validacion estructural

Preguntas basicas:
- faltan columnas obligatorias;
- hay tipos invalidos;
- existen IDs vacios;
- hay formatos inconsistentes;
- hay claves duplicadas.

### 4.2 Validacion semantica

Preguntas operativas:
- el RFC tiene formato valido;
- el almacen existe;
- el resguardante existe;
- el expediente esta en estado coherente;
- el proveedor no esta duplicado con variacion menor de nombre.

### 4.3 Validacion funcional

Preguntas de negocio:
- el stock cargado coincide con el saldo validado por almacen;
- el activo queda asociado al resguardo correcto;
- el expediente historico puede consultarse sin romper navegacion;
- los catalogos habilitan el flujo de usuario esperado.

### 4.4 Regla de aceptacion

Un lote no debe promoverse a produccion si:
- tiene duplicados no explicados;
- rompe integridad referencial;
- genera saldos irreconciliables;
- deja huecos en activos o resguardos vigentes;
- no cuenta con aprobacion institucional del area duena del dato.

---

## 5. Manejo De Inconsistencias

En gobiernos estatales es normal encontrar:
- claves duplicadas;
- historicos incompletos;
- inventarios desactualizados;
- proveedores repetidos;
- activos sin resguardo formal;
- expedientes con trazabilidad parcial.

La migracion no debe ocultar esos problemas.  
Debe clasificarlos y tratarlos.

### 5.1 Clasificacion recomendada

| Tipo | Ejemplo | Tratamiento |
|---|---|---|
| Critica | claves rotas, saldo imposible, activo sin identificador minimo | bloquear lote |
| Alta | duplicado fuerte, resguardo inconsistente, proveedor ambiguo | resolver antes de carga |
| Media | dato faltante no bloqueante | cargar con bandera de revision |
| Baja | formato mejorable o enriquecimiento posterior | corregir en ola posterior |

### 5.2 Politica operativa

- inconsistencias criticas: no migrar hasta resolver;
- inconsistencias altas: resolver con area duena del dato;
- inconsistencias medias: cargar solo con evidencia y plan de saneamiento;
- inconsistencias bajas: registrar para limpieza continua.

### 5.3 Evidencia institucional

Cada inconsistencia debe tener:
- identificador de lote;
- tabla o entidad afectada;
- descripcion;
- severidad;
- responsable de resolucion;
- fecha de cierre o aceptacion del riesgo.

---

## 6. Scripts De Migracion Recomendados

### 6.1 Estructura sugerida

```text
scripts/migration/
  00_validate_sources.ts
  10_import_areas.ts
  20_import_productos.ts
  30_import_proveedores.ts
  40_import_inventario_saldos.ts
  50_import_activos.ts
  60_import_resguardos.ts
  70_import_expedientes_historicos.ts
  90_reconciliation_report.ts
```

### 6.2 Logica de ejecucion

- validar fuentes antes de cargar;
- cargar catalogos primero;
- cargar entidades maestras despues;
- cargar relaciones al final;
- emitir reporte de conciliacion al cierre.

### 6.3 Recomendaciones tecnicas

- usar transacciones por lote cuando el volumen lo permita;
- registrar origen del archivo y fecha de carga;
- permitir modo dry-run;
- generar logs por fila rechazada;
- separar transformacion de carga;
- evitar `INSERT` manuales sin versionamiento.

### 6.4 Scripts minimos por institucion

Cada cliente deberia tener al menos:
- script de validacion previa;
- script de carga de catalogos;
- script de carga de inventario;
- script de carga patrimonial;
- script de carga historica seleccionada;
- script de conciliacion posterior.

---

## 7. Pruebas De Integridad

La migracion no termina cuando el script corre sin error.  
Termina cuando los datos son operables.

### 7.1 Pruebas minimas por dominio

**Proveedores**
- sin RFC duplicado no justificado;
- contactos y domicilios asociados correctamente;
- estado del proveedor consistente.

**Inventario**
- stock por almacen conciliado;
- productos validos;
- unidades coherentes;
- sin saldos negativos no explicados.

**Patrimonial**
- activos con identificador minimo;
- resguardos vigentes consistentes;
- resguardantes existentes;
- activos duplicados detectados y tratados.

**Expedientes historicos**
- expedientes consultables;
- relaciones basicas presentes;
- estatus coherente;
- navegacion sin errores en consulta.

### 7.2 Conciliaciones recomendadas

| Conciliacion | Objetivo |
|---|---|
| conteo de registros origen vs destino | verificar completitud |
| sumatoria de stock | verificar saldos operativos |
| conteo de activos con resguardo | verificar consistencia patrimonial |
| conteo de expedientes activos | verificar continuidad operativa |
| muestreo funcional por usuario | verificar usabilidad post-migracion |

### 7.3 UAT de migracion

Toda migracion institucional debe cerrar con UAT acotado:
- compras valida proveedores y expedientes;
- almacen valida inventario;
- patrimonial valida activos y resguardos;
- OIC valida trazabilidad minima;
- administrador valida catalogos y usuarios.

---

## 8. Estrategia De Rollback

### 8.1 Principio

Cada lote de migracion debe poder revertirse sin comprometer toda la institucion.

### 8.2 Estrategia recomendada

- backup completo previo;
- carga por lotes identificables;
- ventana controlada de migracion;
- validacion inmediata post-carga;
- rollback por lote si falla validacion.

### 8.3 Opciones de rollback

| Escenario | Accion recomendada |
|---|---|
| falla en validacion previa | no cargar |
| falla parcial de lote | revertir lote y corregir fuente |
| inconsistencia post-carga detectada temprano | restaurar backup o limpiar lote segun impacto |
| error masivo | rollback completo a snapshot previo |

### 8.4 Condiciones para rollback completo

- saldos irreconciliables;
- claves maestras corruptas;
- perdida de relaciones patrimoniales;
- expedientes historicos consultables pero materialmente incorrectos;
- validacion institucional rechazada.

---

## 9. Checklist De Migracion Institucional

## 9.1 Preparacion

- [ ] fuentes identificadas por dominio
- [ ] responsables institucionales asignados
- [ ] layouts de migracion aprobados
- [ ] reglas de homologacion definidas
- [ ] ambiente de ensayo disponible
- [ ] backup previo ejecutado

## 9.2 Validacion previa

- [ ] validacion estructural de archivos
- [ ] validacion semantica de catalogos
- [ ] duplicados clasificados
- [ ] inconsistencias criticas resueltas
- [ ] criterio de aceptacion firmado por el area duena del dato

## 9.3 Ejecucion

- [ ] carga de areas y usuarios
- [ ] carga de productos
- [ ] carga de proveedores
- [ ] carga de inventario
- [ ] carga de activos y resguardos
- [ ] carga de expedientes historicos seleccionados
- [ ] reporte de lote generado

## 9.4 Validacion posterior

- [ ] conciliacion de conteos origen-destino
- [ ] conciliacion de stock
- [ ] conciliacion de activos y resguardos
- [ ] muestra funcional validada por usuarios
- [ ] incidencias registradas

## 9.5 Cierre

- [ ] UAT de migracion completado
- [ ] acta de aceptacion del lote
- [ ] plan de limpieza posterior aprobado
- [ ] evidencia de rollback disponible
- [ ] lote promovido a produccion o rechazado formalmente

---

## Conclusión

La migracion de datos para ERP-GOB en gobiernos estatales debe ejecutarse como un proceso institucional controlado, no como una carga tecnica aislada.

El valor del toolkit esta en:
- reducir riesgo de implantacion;
- proteger integridad operativa;
- dar continuidad institucional;
- producir evidencia verificable;
- permitir escalamiento repetible entre clientes.

La meta no es solo "mover datos".  
La meta es:

**entrar a operacion con informacion confiable, trazable y util para control institucional.**
