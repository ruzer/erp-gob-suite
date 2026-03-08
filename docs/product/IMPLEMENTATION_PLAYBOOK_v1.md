# IMPLEMENTATION_PLAYBOOK_v1

**Producto:** ERP-GOB  
**Objetivo del documento:** explicar paso a paso como implantar ERP-GOB en una institucion publica.  
**Audiencia:** lideres de implantacion, arquitectura, TI institucional, responsables normativos, datos, capacitacion y soporte.  
**Enfoque:** despliegue institucional controlado, repetible y auditable.

---

## 1. Preparacion Institucional

Antes de instalar la plataforma, la institucion debe cerrar condiciones minimas de implantacion.

### 1.1 Patrocinio institucional

Debe existir patrocinio explicito de al menos una de estas areas:
- secretaria de administracion;
- oficialia mayor;
- direccion de modernizacion;
- tesoreria;
- contraloria interna;
- coordinacion de tecnologia.

### 1.2 Equipo minimo del cliente

La institucion debe designar:
- responsable funcional del proyecto;
- responsable tecnico;
- responsable de datos;
- enlace de compras/abastecimiento;
- enlace de almacen o inventario;
- enlace juridico o normativo;
- enlace financiero;
- enlace OIC o control interno.

### 1.3 Definicion de alcance

Antes del arranque se debe acordar:
- modulos a activar;
- instituciones o areas incluidas;
- datos a migrar;
- roles que participaran;
- alcance del piloto o de la primera salida a produccion.

### 1.4 Requisitos previos

- servidor o ambiente objetivo definido;
- politica de dominios y certificados definida;
- variables de entorno institucionales disponibles;
- inventario de sistemas fuente identificado;
- responsables de validacion funcional asignados.

### 1.5 Entregables de preparacion

- acta de arranque;
- matriz de alcance;
- matriz de responsables;
- cronograma base;
- checklist de readiness institucional.

---

## 2. Instalacion De La Suite

ERP-GOB debe implantarse usando la suite reproducible para evitar montajes artesanales.

### 2.1 Base de despliegue

Repositorio:
- `erp-gob-suite`

Servicios incluidos:
- frontend
- backend
- keycloak
- postgres
- redis
- minio
- reverse proxy

### 2.2 Secuencia de instalacion

1. clonar `erp-gob-suite`;  
2. inicializar submodulos;  
3. preparar `.env` institucional;  
4. configurar secretos y dominios;  
5. levantar stack;  
6. validar salud base.

### 2.3 Configuracion de ambiente

Se debe preparar:
- passwords reales;
- client secrets;
- dominios institucionales;
- certificados TLS;
- parametros de almacenamiento;
- parametros de base de datos.

### 2.4 Validacion inicial

Se debe verificar:
- frontend accesible;
- backend accesible;
- Keycloak operativo;
- MinIO operativo;
- base de datos inicializada;
- autenticacion OIDC funcional.

### 2.5 Criterio de aceptacion de instalacion

La instalacion no se considera completada hasta que:
- login funcione;
- servicios levanten sin errores criticos;
- smoke tecnico base pase;
- monitoreo y backup esten configurados.

---

## 3. Configuracion Inicial

Con la suite arriba, el siguiente paso es adaptar el entorno a la institucion.

### 3.1 Configuracion institucional

Debe definirse:
- nombre de la institucion;
- branding basico;
- dominios internos o publicos;
- modulos habilitados;
- parametros normativos iniciales;
- politicas de acceso por rol.

### 3.2 Seguridad inicial

Debe cerrarse:
- rotacion de secretos por defecto;
- usuarios administradores iniciales;
- configuracion de CSRF;
- configuracion OIDC;
- buckets privados y acceso documental;
- politicas de respaldo y restauracion.

### 3.3 Configuracion operativa

Debe parametrizarse:
- areas institucionales;
- catalogos maestros;
- usuarios base;
- perfiles de despliegue;
- visibilidad de modulos por etapa.

### 3.4 Entregables

- ambiente configurado;
- bundle institucional inicial;
- checklist de seguridad base;
- validacion tecnica de arranque.

---

## 4. Carga De Catalogos

La operacion no debe iniciar sin catalogos base consistentes.

### 4.1 Catalogos minimos

Deben cargarse como minimo:
- areas institucionales;
- catalogo de productos;
- proveedores base;
- almacenes y ubicaciones si aplican;
- clasificaciones institucionales requeridas;
- usuarios iniciales.

### 4.2 Principios de carga

- homologar antes de cargar;
- eliminar duplicados evidentes;
- respetar formatos institucionales;
- validar responsables duenos del dato;
- versionar layouts y lotes de carga.

### 4.3 Orden recomendado

1. areas;  
2. usuarios;  
3. productos;  
4. proveedores;  
5. almacenes y ubicaciones;  
6. catalogos auxiliares.

### 4.4 Validacion posterior

Se debe verificar:
- productos visibles y operables;
- proveedores sin duplicados criticos;
- areas correctas por usuario;
- catalogos navegables desde UI;
- consistencia con flujos del wizard y expediente.

---

## 5. Migracion De Datos

La migracion debe seguir el toolkit institucional de migracion, no improvisarse en produccion.

### 5.1 Datos recomendados a migrar

- proveedores;
- productos;
- inventario operativo;
- patrimonial;
- expedientes historicos seleccionados;
- usuarios y roles institucionales si la politica lo permite.

### 5.2 Estrategia

Aplicar migracion por olas:
- ola 1: catalogos maestros;
- ola 2: inventario operativo;
- ola 3: activos y resguardos;
- ola 4: expedientes historicos relevantes.

### 5.3 Validaciones obligatorias

- validacion estructural;
- validacion semantica;
- conciliacion origen-destino;
- pruebas funcionales por dominio;
- evidencia de inconsistencias y resolucion.

### 5.4 Criterio de aceptacion

No promover a produccion si:
- hay claves maestras rotas;
- saldos irreconciliables;
- activos duplicados no resueltos;
- proveedores ambiguos;
- rechazo formal del area responsable.

---

## 6. Configuracion De Roles

ERP-GOB debe arrancar con roles claros y acotados.

### 6.1 Roles institucionales base

- capturista
- revisor
- finanzas
- oic
- admin

### 6.2 Principio de asignacion

Cada usuario debe tener:
- rol funcional minimo necesario;
- area o adscripcion definida;
- validacion institucional;
- credenciales seguras;
- evidencia de alta inicial.

### 6.3 Recomendacion operativa

- evitar otorgar `ADMIN` por conveniencia;
- separar operacion de supervision;
- separar finanzas de captura;
- preservar `OIC` como lectura;
- auditar altas y cambios de rol.

### 6.4 Validacion de roles

Se debe probar:
- acceso permitido por rol;
- accesos bloqueados;
- visualizacion correcta de menus;
- mutaciones habilitadas solo para quien corresponde.

---

## 7. Capacitacion De Usuarios

La implantacion no cierra con la instalacion. Cierra con adopcion.

### 7.1 Capacitacion por rol

Debe impartirse entrenamiento para:
- capturistas;
- revisores;
- financieros;
- OIC;
- administradores.

### 7.2 Enfoque de capacitacion

La capacitacion debe ser:
- basada en flujo real;
- guiada por expediente;
- apoyada en manuales y runbooks;
- enfocada en tareas cotidianas, no en menus aislados.

### 7.3 Material minimo

- manual de sistema;
- runbook operativo;
- casos de uso por rol;
- checklist de soporte;
- matriz de UAT.

### 7.4 Criterio de salida

Un usuario queda habilitado cuando puede:
- ejecutar su flujo base;
- interpretar errores institucionales;
- escalar incidencias con `correlationId`;
- operar sin tutor permanente.

---

## 8. Pruebas Operativas

Antes del go-live debe ejecutarse una ronda formal de pruebas.

### 8.1 Pruebas tecnicas

- build y test de backend;
- `prisma validate`;
- gates de frontend;
- smoke test de la suite;
- verificacion de login OIDC;
- validacion de backup y restore en ambiente de ensayo.

### 8.2 Pruebas funcionales

Se debe probar al menos:
- expediente;
- investigacion;
- checklist;
- necesidades;
- procedimiento;
- cuadro;
- orden;
- recepcion;
- inventario;
- finanzas;
- observabilidad;
- patrimonial.

### 8.3 UAT

Cada rol debe ejecutar su flujo esperado:
- capturista;
- revisor;
- finanzas;
- OIC;
- admin.

### 8.4 Evidencia de pruebas

Debe conservarse:
- checklist de pruebas;
- incidencias;
- capturas o reportes;
- dictamen UAT;
- aprobacion de salida.

---

## 9. Arranque En Produccion

El arranque debe ser controlado y no improvisado.

### 9.1 Condiciones previas

- ambiente productivo validado;
- secretos definitivos aplicados;
- backup previo ejecutado;
- catalogos y migracion aprobados;
- UAT firmado;
- plan de rollback listo.

### 9.2 Modalidad recomendada

Arranque por fases:
- una institucion o area piloto;
- monitoreo reforzado;
- soporte cercano;
- expansion progresiva a otras areas.

### 9.3 Actividades del go-live

- habilitar usuarios finales;
- abrir mesa de soporte;
- monitorear auth, backend y frontend;
- revisar primeros expedientes;
- validar dashboard y observabilidad;
- verificar inventario y patrimonial;
- validar primer flujo financiero si aplica.

### 9.4 Criterios de estabilidad inicial

El go-live se considera estable cuando:
- no hay incidentes criticos abiertos;
- usuarios completan flujo base;
- indicadores tecnicos estan en rango aceptable;
- no existen bloqueos de acceso ni datos maestros invalidos.

---

## 10. Soporte Post Go-Live

El post go-live es una fase operativa formal, no solo acompañamiento informal.

### 10.1 Fase hiper-care

Duracion sugerida:
- 2 a 6 semanas segun alcance.

Objetivos:
- resolver incidencias tempranas;
- afinar configuracion;
- reforzar adopcion;
- estabilizar operacion.

### 10.2 Niveles de soporte

- L1: atencion a usuario y dudas funcionales;
- L2: configuracion y operacion;
- L3: ingenieria, bugs, seguridad y parches.

### 10.3 Actividades post go-live

- monitoreo diario;
- seguimiento de incidencias;
- revision de metricas;
- mesa de ayuda;
- ajustes menores controlados;
- planeacion de expansion modular o por area.

### 10.4 Cierre de implantacion

La implantacion cierra formalmente cuando:
- la operacion esta estabilizada;
- las incidencias criticas estan resueltas;
- hay responsables internos operando;
- existe acta de aceptacion institucional;
- se transiciona a soporte regular.

---

## Conclusión

Implantar ERP-GOB correctamente en una institucion publica requiere mas que instalar contenedores.

Requiere:
- preparacion institucional;
- datos confiables;
- roles claros;
- capacitacion por rol;
- pruebas operativas;
- go-live controlado;
- soporte formal posterior.

La implantacion exitosa no es solo tecnica.  
Es la combinacion de:

**plataforma + configuracion + adopcion + control operativo.**
