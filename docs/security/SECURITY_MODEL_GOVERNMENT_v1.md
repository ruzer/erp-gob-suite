# SECURITY_MODEL_GOVERNMENT_v1

**Producto:** ERP-GOB  
**Objetivo del documento:** definir el modelo de seguridad institucional de ERP-GOB para despliegues en entornos gubernamentales.  
**Audiencia:** arquitectura, seguridad, operacion, contraloria, auditoria interna y responsables de tecnologia institucional.  
**Base documental alineada:**
- `docs/security/SECURITY_BASELINE_v1.14.md`
- `docs/governance/SECURITY_HARDENING_v1.12.md`
- `docs/operations/MONITORING_SETUP_v1.12.md`

---

## 1. Modelo De Autenticacion (OIDC)

ERP-GOB adopta un modelo de autenticacion centralizada basado en **OIDC** con **Keycloak** como proveedor de identidad.

### 1.1 Principios del modelo

- autenticacion centralizada;
- identidad federable;
- sesiones gestionadas por tokens y cookies seguras;
- separacion entre autenticacion y autorizacion;
- compatibilidad con entornos institucionales con multiples roles.

### 1.2 Flujo de autenticacion

El frontend opera con:
- Authorization Code Flow;
- PKCE;
- integracion con Keycloak;
- sesion de usuario mediada por el BFF/gateway institucional.

El backend no autentica usuarios por cuenta propia.  
Confia en tokens emitidos por el proveedor de identidad, siempre que cumplan validaciones de seguridad.

### 1.3 Controles minimos

- validacion de `issuer`;
- validacion de `audience`;
- validacion de firma mediante JWKS;
- expiracion de token;
- uso de cookies `httpOnly`;
- proteccion CSRF en frontend/gateway.

### 1.4 Recomendaciones operativas

- no usar `start-dev` fuera de laboratorio;
- separar realm o configuracion de identidad por entorno;
- rotar secretos de clientes confidenciales;
- restringir `redirectUris` y `webOrigins` a dominios institucionales reales;
- mantener PKCE obligatorio para clientes publicos del frontend.

---

## 2. Modelo De Autorizacion (RBAC)

ERP-GOB utiliza un modelo **RBAC** basado en roles institucionales y enforcement en frontend y backend.

### 2.1 Principio de autorizacion

La autorizacion no depende solo de menus visibles.  
Debe existir en dos capas:
- validacion en backend mediante guards y roles;
- validacion visual y de experiencia en frontend.

### 2.2 Roles institucionales base

Roles base observados en el sistema:
- `ADMIN`
- `USER`
- `OPS.CONSULTAR`
- `OIC.READONLY`

Perfiles funcionales operativos:
- capturista
- revisor
- finanzas
- oic
- administrador

### 2.3 Politica de minimo privilegio

Cada usuario debe tener solo los permisos necesarios para su funcion.

Reglas recomendadas:
- `ADMIN` limitado a administracion tecnica y gobierno del sistema;
- operacion diaria sin privilegios administrativos;
- `OIC.READONLY` sin mutaciones;
- separacion entre captura, supervision y finanzas.

### 2.4 Controles de autorizacion

- guards en controladores backend;
- decoradores o politicas por endpoint;
- ocultamiento de mutaciones en UI para roles de solo lectura;
- validacion de acceso a paneles de observabilidad y control;
- control estricto de cambios de rol.

---

## 3. Seguridad De API

La API de ERP-GOB debe considerarse una superficie critica porque concentra:
- flujo contractual;
- inventario;
- patrimonial;
- finanzas;
- observabilidad.

### 3.1 Modelo de exposicion

- frontend consume via `/api/gateway/*`;
- backend expone controladores protegidos;
- acceso directo al backend debe limitarse por red o proxy segun el entorno.

### 3.2 Controles minimos de API

- autenticacion obligatoria;
- autorizacion por rol;
- validacion de JWT;
- validacion de payloads mediante DTOs;
- errores institucionales sanitizados;
- `correlation_id` por request;
- rate limiting donde aplique al patron institucional.

### 3.3 Controles recomendados

- no exponer internals en respuestas;
- no registrar secretos o tokens en logs;
- separar endpoints publicos de salud de endpoints operativos;
- monitorear patrones anormales de `401`, `403`, `409` y `5xx`;
- revisar allowlists del gateway y contratos OpenAPI en cada release.

### 3.4 Modelo de transporte

Para entorno institucional, la exposicion debe realizarse bajo:
- TLS en reverse proxy;
- dominios institucionales;
- backend no publicado directamente a internet salvo necesidad justificada.

---

## 4. Seguridad De Documentos

ERP-GOB trata documentos como evidencia institucional, no como archivos publicos.

### 4.1 Principios

- documentos privados por defecto;
- acceso mediado por aplicacion;
- descarga mediante URL firmada;
- no exponer buckets directamente;
- trazabilidad de relacion documento-entidad.

### 4.2 Riesgos principales

- publicacion accidental de buckets;
- credenciales de MinIO por defecto;
- acceso directo sin control de aplicacion;
- fuga de documentos por configuracion de consola o puertos administrativos.

### 4.3 Controles minimos

- MinIO no expuesto directamente al exterior;
- bucket privado;
- credenciales rotadas;
- consola administrativa restringida;
- URLs firmadas con expiracion;
- asociacion de documento con expediente, contrato, proveedor o entidad correspondiente.

### 4.4 Recomendaciones adicionales

- clasificar tipos documentales por sensibilidad;
- retener evidencia critica conforme a politica institucional;
- monitorear accesos inusuales a documentos;
- preservar integridad de la referencia documental en auditoria.

---

## 5. Auditoria Institucional

La seguridad en ERP-GOB no se limita a acceso.  
Incluye capacidad de reconstruir hechos institucionales.

### 5.1 Evidencia disponible

El sistema ya soporta evidencia a traves de:
- bitacora institucional;
- `correlation_id`;
- timeline consolidado;
- eventos de procedimiento;
- observabilidad y alertas;
- registros de dominios criticos.

### 5.2 Dominios que deben dejar rastro auditable

- expediente
- procedimiento
- orden
- recepcion
- inventario
- patrimonial
- factura
- devengo
- pago
- accesos administrativos

### 5.3 Campos minimos de auditoria

- fecha y hora;
- actor;
- rol;
- entidad;
- identificador de entidad;
- accion realizada;
- resultado;
- `correlation_id`;
- referencia documental si existe.

### 5.4 Principio de control

La auditoria debe servir para:
- soporte tecnico;
- investigacion de incidentes;
- revisiones de control interno;
- auditoria externa;
- reconstruccion de expediente.

---

## 6. Retencion De Logs

La retencion de logs debe responder a dos necesidades:
- operacion y resolucion de incidentes;
- evidencia institucional y cumplimiento.

### 6.1 Tipos de log

| Tipo | Uso |
|---|---|
| Logs de aplicacion | errores, comportamiento y soporte tecnico |
| Logs de seguridad | autenticacion, autorizacion, accesos anormales |
| Bitacora institucional | evidencia de acciones de negocio |
| Logs de infraestructura | disponibilidad y estado de servicios |

### 6.2 Politica recomendada

- logs operativos de aplicacion: al menos 90 dias;
- logs de seguridad: al menos 180 dias;
- evidencia institucional critica: 12 meses o conforme a normativa interna;
- snapshots o exportes de auditoria segun politica del cliente.

### 6.3 Requisitos de gestion

- centralizacion en agregador o SIEM cuando el entorno lo permita;
- proteccion contra alteracion;
- acceso restringido;
- correlacion por `correlation_id`;
- politicas explicitas de borrado y archivo.

### 6.4 Prohibiciones

- no loggear `access_token`, `refresh_token`, secretos o passwords;
- no exponer PII innecesaria en trazas de error;
- no usar logs de consola como unico mecanismo de auditoria.

---

## 7. Gestion De Incidentes

El modelo de seguridad debe contemplar respuesta operativa, no solo controles preventivos.

### 7.1 Tipos de incidente cubiertos

- fallo de autenticacion generalizada;
- escalacion indebida de privilegios;
- acceso no autorizado a documentos;
- fuga o exposicion de secretos;
- inconsistencia critica de auditoria;
- indisponibilidad de componentes de identidad o API;
- actividad anomala detectada por observabilidad o monitoreo.

### 7.2 Flujo de gestion recomendado

1. deteccion;  
2. clasificacion;  
3. contencion;  
4. analisis;  
5. remediacion;  
6. recuperacion;  
7. cierre y lecciones aprendidas.

### 7.3 Datos minimos de incidente

- fecha de deteccion;
- componente afectado;
- impacto;
- severidad;
- `correlation_id` o evidencia asociada;
- responsable de gestion;
- accion de contencion;
- accion correctiva.

### 7.4 Integracion con operacion

La gestion de incidentes debe coordinarse con:
- monitoreo;
- backup y restore;
- politica de rollback;
- seguridad;
- OIC cuando el incidente afecte evidencia o trazabilidad.

---

## 8. Proteccion De Datos

ERP-GOB gestiona datos operativos, patrimoniales, documentales y de identidad.  
Por eso el modelo debe considerar proteccion de datos como parte del diseno operativo.

### 8.1 Categorias de datos

- datos de identidad y acceso;
- datos operativos de expediente y procedimiento;
- datos de proveedores;
- datos patrimoniales;
- documentos y evidencias;
- datos financieros.

### 8.2 Principios de proteccion

- minimo privilegio;
- necesidad de saber;
- privacidad por configuracion;
- exposicion minima en API;
- sanitizacion de errores;
- segregacion de credenciales y secretos;
- control de acceso a evidencia documental.

### 8.3 Medidas recomendadas

- TLS extremo a extremo en capa publica;
- secretos fuera de repositorio;
- backups protegidos;
- restricciones de acceso a base de datos;
- politicas de retencion y borrado segun marco institucional;
- pruebas periodicas de restore y recuperacion.

### 8.4 Riesgos a controlar

- fuga por documentos mal expuestos;
- exportes no autorizados;
- sobreexposicion de datos en logs;
- privilegios excesivos;
- acceso administrativo sin trazabilidad.

---

## 9. Controles Para Auditoria Externa

ERP-GOB debe poder demostrar control, no solo afirmarlo.

### 9.1 Evidencia que debe poder entregarse

- configuracion de autenticacion y autorizacion;
- matriz de roles;
- bitacora de acciones criticas;
- timeline de expediente;
- alertas y riesgos;
- politicas de backup y restore;
- evidencia de hardening y go-live;
- reportes de monitoreo y disponibilidad;
- evidencia de pruebas de seguridad y smoke test.

### 9.2 Controles verificables por auditoria

| Control | Evidencia esperada |
|---|---|
| Autenticacion centralizada | configuracion OIDC y pruebas de acceso |
| Segregacion por rol | matriz RBAC y pruebas de acceso/bloqueo |
| Integridad de expediente | timeline y bitacora institucional |
| Seguridad documental | politica de MinIO y descarga por URL firmada |
| Trazabilidad | `correlation_id`, logs y eventos |
| Recuperacion | scripts, reportes y evidencia de restore |
| Gobierno de releases | tags, baselines y checklist de go-live |

### 9.3 Recomendacion institucional

La auditoria externa no debe depender de conocimiento tacito del equipo tecnico.  
Debe apoyarse en:
- documentos versionados;
- reportes reproducibles;
- artefactos de despliegue;
- evidencia operativa verificable.

---

## Conclusión

El modelo de seguridad de ERP-GOB para gobierno debe entenderse como una combinacion de:
- identidad centralizada;
- autorizacion por rol;
- proteccion de API y documentos;
- trazabilidad auditable;
- monitoreo y respuesta a incidentes;
- operacion endurecida.

Su fortaleza no esta solo en autenticar usuarios.  
Esta en poder demostrar, de manera verificable, que:
- cada accion tiene contexto;
- cada acceso tiene control;
- cada documento tiene proteccion;
- cada incidente tiene trazabilidad;
- cada release puede auditarse.

Ese es el estandar que permite que ERP-GOB se use no solo como sistema operativo, sino como **plataforma institucional confiable para gobierno**.
