# ADMINISTRATION_BASELINE_v1.17

## Objetivo
Definir el baseline administrativo institucional habilitado por ERP-GOB v1.17.

## Dominios administrativos habilitados

### Areas institucionales
- `GET /areas`
- `POST /areas`
- `PATCH /areas/{id}`

### Tipos de procedimiento
- `GET /procedimientos/tipos`
- `POST /procedimientos/tipos`
- `PATCH /procedimientos/tipos/{id}`

### Plantillas de checklist
- `GET /checklists/plantillas`
- `POST /checklists/plantillas`
- `PATCH /checklists/plantillas/{id}`

### Reglas de observabilidad
- `GET /observabilidad/reglas`
- `PATCH /observabilidad/reglas/{id}`

### Tipos de activos
- `GET /activos/tipos`
- `POST /activos/tipos`
- `PATCH /activos/tipos/{id}`

### Importacion institucional
- `POST /admin/import`

Entidades soportadas:
- `productos`
- `proveedores`
- `inventario`
- `activos`
- `resguardos`
- `areas`

## Consola administrativa asociada
UI operativa en:
- `/admin/catalogos/areas`
- `/admin/catalogos/tipos-procedimiento`
- `/admin/checklists`
- `/admin/observabilidad`
- `/admin/catalogos/activos`
- `/admin/importaciones`

## Reglas de gobierno
- Acceso solo rol `ADMIN`
- Todo trafico administrativo via gateway
- Validacion CSRF en modo `enforce`
- Contrato OpenAPI protegido por CI
- Auditoria institucional activa

## Criterio de baseline
Se considera baseline administrativo cerrado cuando:
- backend expone endpoints write reales
- frontend opera sin placeholders
- suite valida login + lectura + escritura administrativa
- importacion real procesa registros sin intervencion manual

## Estado
Cumplido en `v1.17.0`.
