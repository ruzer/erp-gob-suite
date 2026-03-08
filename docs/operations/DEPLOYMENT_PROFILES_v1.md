# DEPLOYMENT_PROFILES_v1

**Producto:** ERP-GOB  
**Objetivo del documento:** definir perfiles estandar de despliegue para ERP-GOB segun nivel de uso y criticidad institucional.  
**Audiencia:** arquitectura, operacion, seguridad, implantacion y responsables de infraestructura del cliente.  
**Perfiles cubiertos:** `demo`, `piloto`, `produccion`

---

## 1. Objetivo De Los Perfiles

ERP-GOB no debe desplegarse con una sola configuracion para todos los contextos.  
Los perfiles de despliegue permiten adaptar:
- infraestructura;
- seguridad;
- datos iniciales;
- monitoreo;
- respaldo;
- capacidad operativa;

sin perder consistencia del producto base.

### 1.1 Principio operativo

Cada perfil debe responder a una pregunta distinta:

- **demo:** como mostrar el producto de forma rapida y controlada;
- **piloto:** como validar operacion real en una institucion con alcance acotado;
- **produccion:** como operar el sistema como plataforma institucional controlada.

### 1.2 Regla de gobierno

Ningun perfil inferior debe promoverse a uno superior sin:
- checklist de readiness;
- configuracion de seguridad correspondiente;
- datos validados;
- evidencia de pruebas y aprobacion formal.

---

## 2. Perfil Demo

El perfil `demo` existe para preventa, talleres, pruebas guiadas y exploracion inicial del producto.

### 2.1 Infraestructura minima

- 1 host o laptop con Docker;
- `erp-gob-suite` desplegada localmente;
- servicios:
  - frontend
  - backend
  - postgres
  - keycloak
  - redis
  - minio
  - reverse proxy local si se desea emular dominios;
- volúmenes locales sin alta disponibilidad.

### 2.2 Configuracion de seguridad

- secretos de laboratorio, no productivos;
- dominios locales o aliases tipo `*.gob.local`;
- TLS opcional si el objetivo es solo demo interna;
- usuarios demo controlados;
- sin exposicion publica a internet;
- acceso restringido al equipo comercial o de demostracion.

### 2.3 Datos iniciales

- seed institucional de demostracion;
- catalogos basicos;
- usuarios por rol:
  - capturista
  - revisor
  - finanzas
  - oic
  - admin
- expedientes y entidades de ejemplo para recorrer el flujo.

### 2.4 Monitoreo

- validacion manual de:
  - `/login`
  - `/metrics`
  - dashboard
  - observabilidad
- logs de contenedor como fuente principal;
- sin necesidad de agregador central.

### 2.5 Backup

- backup opcional;
- snapshots locales o respaldo del volumen si la demo va a durar varios dias;
- restore no critico, pero recomendable para demos recurrentes.

### 2.6 Escalabilidad

- no pensada para concurrencia real;
- un numero pequeno de usuarios simultaneos;
- uso temporal y controlado;
- no debe reutilizarse como piloto sin endurecimiento.

---

## 3. Perfil Piloto

El perfil `piloto` existe para validar la operacion real en una institucion con usuarios reales, datos controlados y alcance acotado.

### 3.1 Infraestructura minima

- 1 a 2 ambientes dedicados:
  - piloto
  - opcionalmente ensayo/soporte;
- servidor o VM institucional;
- Docker Compose o despliegue equivalente controlado;
- almacenamiento persistente para PostgreSQL y MinIO;
- dominios institucionales o subdominios controlados;
- capacidad suficiente para usuarios iniciales y soporte del piloto.

### 3.2 Configuracion de seguridad

- TLS obligatorio;
- secretos institucionales reales;
- Keycloak endurecido;
- `FRONTEND_CSRF_MODE=enforce`;
- MinIO privado;
- acceso administrativo restringido;
- no usar usuarios demo ni passwords de ejemplo;
- control de red sobre backend, storage y servicios administrativos.

### 3.3 Datos iniciales

- seed institucional base;
- catalogos reales o semi-reales validados;
- usuarios reales del piloto;
- proveedores, productos y areas del piloto;
- migracion de inventario, patrimonial o expedientes solo si esta aprobada para la prueba.

### 3.4 Monitoreo

- monitoreo minimo activo sobre:
  - frontend
  - backend
  - postgres
  - keycloak
  - minio
- revision diaria de:
  - errores 4xx/5xx
  - login OIDC
  - observabilidad
  - flujos del piloto
- alertas basicas tecnicas y funcionales.

### 3.5 Backup

- backup obligatorio previo a cada ventana importante;
- respaldo regular de PostgreSQL y MinIO;
- prueba de restore en ambiente de ensayo o ventana controlada;
- politica minima de retencion durante la vida del piloto.

### 3.6 Escalabilidad

- capacidad para una dependencia o grupo acotado de usuarios;
- crecimiento moderado;
- sin alta disponibilidad obligatoria, pero con recuperacion operativa clara;
- preparado para evolucionar a produccion si el piloto pasa.

---

## 4. Perfil Produccion

El perfil `produccion` existe para operacion institucional formal y continua.

### 4.1 Infraestructura minima

- ambiente dedicado y endurecido;
- dominios institucionales definitivos;
- TLS obligatorio con certificados validos;
- almacenamiento persistente y respaldado;
- separacion entre componentes publicos y administrativos;
- capacidad planeada para concurrencia, crecimiento y recuperacion.

Configuracion minima recomendada:
- frontend detras de reverse proxy;
- backend no expuesto directamente salvo necesidad justificada;
- base de datos protegida y sin acceso publico;
- MinIO en red controlada;
- Keycloak operativo en perfil institucional;
- automatizacion de arranque, validacion y respaldo.

### 4.2 Configuracion de seguridad

- secretos reales y rotados;
- politica de acceso por roles y minimo privilegio;
- CSRF en `enforce`;
- JWT validado por `issuer`, `audience` y JWKS;
- buckets privados;
- logs y auditoria preservados;
- sin credenciales por defecto;
- sin puertos administrativos expuestos publicamente.

### 4.3 Datos iniciales

- seed institucional productivo;
- catalogos oficiales aprobados;
- usuarios y roles productivos;
- datos migrados y conciliados;
- expedientes activos y datos historicos relevantes segun politica del cliente.

### 4.4 Monitoreo

- monitoreo continuo de plataforma;
- paneles tecnicos y funcionales;
- alertas sobre:
  - disponibilidad
  - auth
  - errores API
  - backlog de procesos
  - observabilidad institucional
- centralizacion de logs recomendada;
- tableros para operacion y soporte.

### 4.5 Backup

- backups programados y automatizados;
- respaldo de PostgreSQL, MinIO y configuracion critica;
- restore probado de forma periodica;
- evidencia de recuperacion;
- politica de retencion y cifrado segun lineamiento institucional.

### 4.6 Escalabilidad

- dimensionamiento para mas usuarios y mayor volumen;
- posibilidad de separar workloads por componente;
- evolucion a alta disponibilidad segun carga e importancia del ente;
- capacidad de crecer por modulos, areas y entidades sin rehacer el despliegue.

---

## 5. Comparativo Rapido De Perfiles

| Dimension | Demo | Piloto | Produccion |
|---|---|---|---|
| Objetivo | demostracion | validacion institucional | operacion formal |
| Usuarios | internos o preventa | usuarios reales acotados | usuarios institucionales completos |
| TLS | opcional | obligatorio | obligatorio |
| Secretos reales | no | si | si |
| Datos reales | no o minimamente anonimizados | parciales y controlados | si |
| Monitoreo formal | bajo | medio | alto |
| Backup obligatorio | no | si | si |
| Restore probado | deseable | recomendable | obligatorio |
| Exposicion publica | no | controlada | institucional controlada |
| Escalabilidad | minima | media | alta o planificada |

---

## 6. Regla De Promocion Entre Perfiles

### 6.1 De demo a piloto

Solo si:
- la institucion valida interes real;
- se definen responsables;
- se cargan secretos reales;
- se habilita TLS;
- se acuerda alcance del piloto;
- se prepara monitoreo y backup.

### 6.2 De piloto a produccion

Solo si:
- el piloto pasa UAT;
- el go-live checklist esta completo;
- la migracion de datos fue conciliada;
- el restore fue probado;
- no hay hallazgos criticos de seguridad;
- existe aprobacion institucional formal.

---

## 7. Recomendacion Final

ERP-GOB debe usarse con disciplina de perfiles.

La regla correcta es:
- **demo** para mostrar;
- **piloto** para validar;
- **produccion** para operar.

El error mas comun en proyectos publicos es intentar operar un entorno de demo como si fuera productivo.  
Este documento existe para evitar precisamente ese riesgo.
