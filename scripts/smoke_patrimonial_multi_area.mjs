#!/usr/bin/env node
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const ENV_PATH = path.join(ROOT, '.env');
const OUTPUT_ROOT = path.join(ROOT, 'installer-output', 'smoke-patrimonial-multi-area');
const BACKEND_URL = process.env.ERP_SMOKE_BACKEND_URL || 'http://localhost:13000';
const KEYCLOAK_URL = process.env.ERP_SMOKE_KEYCLOAK_URL || 'http://localhost:18080';

function fail(message) {
  console.error(`[erp-gob][smoke-patrimonial][error] ${message}`);
  process.exit(1);
}

function log(message) {
  console.log(`[erp-gob][smoke-patrimonial] ${message}`);
}

function parseEnv(filePath) {
  if (!existsSync(filePath)) {
    fail(`No existe ${filePath}. Ejecuta desde el suite instalado.`);
  }

  const env = {};
  for (const rawLine of readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const index = line.indexOf('=');
    if (index < 0) continue;
    env[line.slice(0, index).trim()] = line.slice(index + 1);
  }
  return env;
}

function sqlQuote(value) {
  return String(value).replaceAll("'", "''");
}

function runPsql(sql, { raw = false } = {}) {
  const args = ['exec', '-i', 'erp-suite-postgres', 'psql', '-U', 'erp', '-d', 'erp'];
  if (raw) {
    args.push('-t', '-A');
  }

  const result = spawnSync('docker', args, { input: sql, encoding: 'utf8' });
  if (result.status !== 0) {
    fail(`psql fallo.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
  }
  return result.stdout.trim();
}

function readJson(sql) {
  const output = runPsql(sql, { raw: true });
  if (!output) return null;
  return JSON.parse(output);
}

async function getToken(env) {
  const realm = env.KEYCLOAK_REALM || 'erp';
  const clientId = env.KEYCLOAK_API_CLIENT_ID || 'erp-api';
  const clientSecret = env.KEYCLOAK_API_CLIENT_SECRET;
  const password = env.ERP_FRONTEND_TESTER_PASSWORD;

  if (!clientSecret || !password) {
    fail('Faltan KEYCLOAK_API_CLIENT_SECRET o ERP_FRONTEND_TESTER_PASSWORD en .env.');
  }

  const response = await fetch(`${KEYCLOAK_URL}/realms/${realm}/protocol/openid-connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'password',
      client_id: clientId,
      client_secret: clientSecret,
      username: 'frontend.tester',
      password,
      scope: 'openid profile email',
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    fail(`No se pudo obtener token Keycloak (${response.status}). Revisa direct grants del cliente API. ${detail}`);
  }

  const payload = await response.json();
  if (!payload.access_token) {
    fail('Keycloak no devolvio access_token.');
  }
  return payload.access_token;
}

async function api(pathname, token, correlationId, options = {}) {
  const response = await fetch(`${BACKEND_URL}${pathname}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Correlation-Id': correlationId,
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  if (!response.ok) {
    return { ok: false, status: response.status, body };
  }
  return { ok: true, status: response.status, body };
}

function requireDatabaseShape() {
  const checks = readJson(`
    SELECT jsonb_build_object(
      'orderLineOriginIndex', EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'uq_orden_compra_renglon_item_origen'
      ),
      'bienHistorialAllowsInitialState', EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'bien_estado_historial_estatus_chk_f42'
          AND pg_get_constraintdef(oid) LIKE '%SIN_REGISTRO%'
      )
    )::text;
  `);

  if (!checks?.orderLineOriginIndex) {
    fail('Falta indice uq_orden_compra_renglon_item_origen. Aplica migraciones canonicas antes del smoke.');
  }
  if (!checks?.bienHistorialAllowsInitialState) {
    fail('El check de bien_estado_historial no permite SIN_REGISTRO. Aplica migraciones canonicas antes del smoke.');
  }
}

function loadReferenceData() {
  const refs = readJson(`
    SELECT jsonb_build_object(
      'configId', (SELECT id FROM configuracion_normativa WHERE is_active = true ORDER BY ejercicio_fiscal DESC, created_at DESC LIMIT 1),
      'producto', (
        SELECT row_to_json(p)::jsonb
        FROM (
          SELECT id, descripcion
          FROM producto
          WHERE tipo_bien = 'PATRIMONIAL'
            AND requiere_serie = true
            AND estatus = 'ACTIVO'
          ORDER BY created_at, id
          LIMIT 1
        ) p
      ),
      'proveedor', (
        SELECT row_to_json(p)::jsonb
        FROM (
          SELECT id, razon_social
          FROM proveedor
          ORDER BY created_at, id
          LIMIT 1
        ) p
      ),
      'areas', COALESCE((
        SELECT jsonb_agg(row_to_json(a)::jsonb ORDER BY a.created_at, a.id)
        FROM (
          SELECT id, nombre, created_at
          FROM area
          ORDER BY created_at, id
          LIMIT 2
        ) a
      ), '[]'::jsonb)
    )::text;
  `);

  if (!refs?.configId) fail('No existe configuracion_normativa activa.');
  if (!refs?.producto?.id) fail('No existe producto patrimonial serializado activo.');
  if (!refs?.proveedor?.id) fail('No existe proveedor para el smoke.');
  if (!Array.isArray(refs.areas) || refs.areas.length < 2) fail('Se requieren al menos dos areas para el smoke multi-area.');
  return refs;
}

function seedPurchaseChain({ refs, ids, suffix, correlationId }) {
  const productoId = refs.producto.id;
  const proveedorId = refs.proveedor.id;
  const areaA = refs.areas[0];
  const areaB = refs.areas[1];
  const folio = `EXP-MA-PAT-${suffix}`;

  const sql = `
    BEGIN;
    INSERT INTO expediente (id, tipo, folio, ejercicio_fiscal, estatus)
    VALUES ('${ids.expediente}', 'COMPRA', '${folio}', 2026, 'ABIERTO');

    INSERT INTO procedimiento (
      id, expediente_id, tipo, configuracion_normativa_id, estatus,
      tipo_determinado, tipo_origen, monto_calculado_uma, monto_con_iva_base,
      uma_valor_utilizado, ejercicio_uma, correlation_id
    ) VALUES (
      '${ids.procedimiento}', '${ids.expediente}', 'ADJUDICACION_DIRECTA', '${refs.configId}', 'AUTORIZADO',
      'ADJUDICACION_DIRECTA', 'MANUAL_EXCEPTION', 1, 48000,
      108.57, 2026, '${correlationId}'
    );

    INSERT INTO necesidad (id, expediente_id, area_id, descripcion, clasificacion_bien, justificacion, producto_id, estatus)
    VALUES
      ('${ids.necesidadAreaA}', '${ids.expediente}', '${areaA.id}', 'Smoke patrimonial serializado para ${sqlQuote(areaA.nombre)}', 'PATRIMONIAL', 'Smoke recurrente multi-area patrimonial serializada', '${productoId}', 'ACTIVA'),
      ('${ids.necesidadAreaB}', '${ids.expediente}', '${areaB.id}', 'Smoke patrimonial serializado para ${sqlQuote(areaB.nombre)}', 'PATRIMONIAL', 'Smoke recurrente multi-area patrimonial serializada', '${productoId}', 'ACTIVA');

    INSERT INTO solicitud_cotizacion (id, expediente_id, procedimiento_id, estatus, asunto, justificacion, correlation_id)
    VALUES ('${ids.solicitud}', '${ids.expediente}', '${ids.procedimiento}', 'BORRADOR', 'Smoke multi-area patrimonial serializada', 'Smoke recurrente de trazabilidad por area', '${correlationId}');

    INSERT INTO solicitud_cotizacion_proveedor (id, solicitud_cotizacion_id, proveedor_id, estatus, responded_at, correlation_id)
    VALUES ('${ids.solicitudProveedor}', '${ids.solicitud}', '${proveedorId}', 'RESPONDIO', now(), '${correlationId}');

    INSERT INTO solicitud_cotizacion_renglon (id, solicitud_cotizacion_id, producto_id, variante_id, cantidad_solicitada, unidad_medida, descripcion, estatus, necesidad_id, area_id)
    VALUES
      ('${ids.solicitudRenglonAreaA}', '${ids.solicitud}', '${productoId}', NULL, 1, 'PIEZA', '${sqlQuote(refs.producto.descripcion)} - ${sqlQuote(areaA.nombre)}', 'ACTIVO', '${ids.necesidadAreaA}', '${areaA.id}'),
      ('${ids.solicitudRenglonAreaB}', '${ids.solicitud}', '${productoId}', NULL, 1, 'PIEZA', '${sqlQuote(refs.producto.descripcion)} - ${sqlQuote(areaB.nombre)}', 'ACTIVO', '${ids.necesidadAreaB}', '${areaB.id}');

    INSERT INTO cuadro_comparativo (
      id, procedimiento_id, solicitud_consolidada_id, version, estatus,
      modo_adjudicacion, proveedor_ganador_id, puntaje_total_ganador,
      justificacion_general, correlation_id, evaluado_at, autorizado_at
    ) VALUES (
      '${ids.cuadro}', '${ids.procedimiento}', '${ids.solicitud}', 1, 'AUTORIZADO',
      'POR_RENGLON', NULL, 100,
      'Smoke multi-area patrimonial serializada', '${correlationId}', now(), now()
    );

    INSERT INTO cuadro_comparativo_renglon (id, cuadro_id, proveedor_id, producto_id, variante_id, cantidad, precio_unitario, subtotal, es_ganador, justificacion, metadata_json)
    VALUES
      ('${ids.cuadroRenglonAreaA}', '${ids.cuadro}', '${proveedorId}', '${productoId}', NULL, 1, 24000, 24000, true, 'Ganador ${sqlQuote(areaA.nombre)}', jsonb_build_object('solicitud_cotizacion_renglon_id', '${ids.solicitudRenglonAreaA}', 'necesidad_id', '${ids.necesidadAreaA}', 'area_id', '${areaA.id}')),
      ('${ids.cuadroRenglonAreaB}', '${ids.cuadro}', '${proveedorId}', '${productoId}', NULL, 1, 24000, 24000, true, 'Ganador ${sqlQuote(areaB.nombre)}', jsonb_build_object('solicitud_cotizacion_renglon_id', '${ids.solicitudRenglonAreaB}', 'necesidad_id', '${ids.necesidadAreaB}', 'area_id', '${areaB.id}'));

    INSERT INTO orden_compra (id, expediente_id, procedimiento_id, cuadro_comparativo_id, proveedor_id, estatus, monto_total, fecha_emision, correlation_id)
    VALUES ('${ids.orden}', '${ids.expediente}', '${ids.procedimiento}', '${ids.cuadro}', '${proveedorId}', 'PENDIENTE', 48000, current_date, '${correlationId}');

    INSERT INTO orden_compra_renglon (
      id, orden_compra_id, producto_id, variante_id, cantidad_solicitada, cantidad_autorizada,
      cantidad_surtida, precio_unitario, observaciones, solicitud_cotizacion_renglon_id, necesidad_id, area_id
    ) VALUES
      ('${ids.ordenRenglonAreaA}', '${ids.orden}', '${productoId}', NULL, 1, 1, 0, 24000, 'Origen ${sqlQuote(areaA.nombre)}', '${ids.solicitudRenglonAreaA}', '${ids.necesidadAreaA}', '${areaA.id}'),
      ('${ids.ordenRenglonAreaB}', '${ids.orden}', '${productoId}', NULL, 1, 1, 0, 24000, 'Origen ${sqlQuote(areaB.nombre)}', '${ids.solicitudRenglonAreaB}', '${ids.necesidadAreaB}', '${areaB.id}');
    COMMIT;
  `;

  runPsql(sql);
  return { folio, productoId, proveedorId, areaA, areaB };
}

function buildIds() {
  return {
    expediente: randomUUID(),
    procedimiento: randomUUID(),
    solicitud: randomUUID(),
    solicitudProveedor: randomUUID(),
    necesidadAreaA: randomUUID(),
    necesidadAreaB: randomUUID(),
    solicitudRenglonAreaA: randomUUID(),
    solicitudRenglonAreaB: randomUUID(),
    cuadro: randomUUID(),
    cuadroRenglonAreaA: randomUUID(),
    cuadroRenglonAreaB: randomUUID(),
    orden: randomUUID(),
    ordenRenglonAreaA: randomUUID(),
    ordenRenglonAreaB: randomUUID(),
  };
}

function assertOrigin(summary) {
  if (summary.activos.length !== 2) {
    fail(`Se esperaban 2 activos creados; recibidos=${summary.activos.length}.`);
  }

  const areaIds = new Set(summary.acquisitionOrigins.map((item) => item.areaId).filter(Boolean));
  const needIds = new Set(summary.acquisitionOrigins.map((item) => item.necesidadId).filter(Boolean));
  const orderLineIds = new Set(summary.acquisitionOrigins.map((item) => item.ordenRenglonId).filter(Boolean));

  if (areaIds.size !== 2) fail('El historial no preservo dos areas distintas.');
  if (needIds.size !== 2) fail('El historial no preservo dos necesidades distintas.');
  if (orderLineIds.size !== 2) fail('El historial no preservo dos renglones de orden distintos.');
  for (const origin of summary.acquisitionOrigins) {
    if (!origin.recepcionId || !origin.proveedorNombre) {
      fail('El historial no devolvio recepcion/proveedor de origen para todos los activos.');
    }
  }
}

async function main() {
  const env = parseEnv(ENV_PATH);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const suffix = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const outputDir = path.join(OUTPUT_ROOT, timestamp);
  mkdirSync(outputDir, { recursive: true });

  requireDatabaseShape();
  const refs = loadReferenceData();
  const token = await getToken(env);
  const correlationId = randomUUID();
  const ids = buildIds();
  const context = seedPurchaseChain({ refs, ids, suffix, correlationId });
  const serialAreaA = `SN-SMOKE-MA-PAT-${suffix}-A`;
  const serialAreaB = `SN-SMOKE-MA-PAT-${suffix}-B`;

  const createResponse = await api('/recepciones', token, correlationId, {
    method: 'POST',
    body: JSON.stringify({
      ordenId: ids.orden,
      expedienteId: ids.expediente,
      proveedorId: context.proveedorId,
      origen: 'ORDEN',
      fechaRecepcion: new Date().toISOString(),
      observaciones: 'Smoke recurrente multi-area patrimonial serializada',
      referenciaEntrega: `SMOKE-${suffix}`,
      detalles: [
        {
          ordenRenglonId: ids.ordenRenglonAreaA,
          cantidadRecibida: 1,
          condicion: 'NUEVO',
          observaciones: `Recepcion ${context.areaA.nombre}`,
          series: [{ serie: serialAreaA }],
        },
        {
          ordenRenglonId: ids.ordenRenglonAreaB,
          cantidadRecibida: 1,
          condicion: 'NUEVO',
          observaciones: `Recepcion ${context.areaB.nombre}`,
          series: [{ serie: serialAreaB }],
        },
      ],
    }),
  });
  writeFileSync(path.join(outputDir, '01-recepcion-create.json'), JSON.stringify(createResponse, null, 2));
  if (!createResponse.ok) fail(`POST /recepciones fallo con ${createResponse.status}: ${JSON.stringify(createResponse.body)}`);

  const confirmResponse = await api(`/recepciones/${createResponse.body.id}/estado`, token, correlationId, {
    method: 'PATCH',
    body: JSON.stringify({ estado: 'CONFIRMADA' }),
  });
  writeFileSync(path.join(outputDir, '02-recepcion-confirm.json'), JSON.stringify(confirmResponse, null, 2));
  if (!confirmResponse.ok) fail(`PATCH /recepciones/{id}/estado fallo con ${confirmResponse.status}: ${JSON.stringify(confirmResponse.body)}`);

  const detailResponse = await api(`/recepciones/${createResponse.body.id}`, token, correlationId);
  writeFileSync(path.join(outputDir, '03-recepcion-detail.json'), JSON.stringify(detailResponse, null, 2));
  if (!detailResponse.ok) fail(`GET /recepciones/{id} fallo con ${detailResponse.status}: ${JSON.stringify(detailResponse.body)}`);

  const activos = (detailResponse.body.detalles || []).flatMap((detalle) => detalle.activosCreados || []);
  const histories = [];
  for (const activo of activos) {
    const historyResponse = await api(`/activos/${activo.id}/historial`, token, correlationId);
    writeFileSync(path.join(outputDir, `04-activo-${activo.serie}.json`), JSON.stringify(historyResponse, null, 2));
    if (!historyResponse.ok) fail(`GET /activos/${activo.id}/historial fallo con ${historyResponse.status}: ${JSON.stringify(historyResponse.body)}`);
    histories.push(historyResponse.body);
  }

  const dbOrigin = runPsql(`
    SELECT COALESCE(jsonb_pretty(jsonb_agg(row_to_json(t)::jsonb)), '[]')
    FROM (
      SELECT
        b.id AS bien_id,
        b.serie,
        rd.id AS recepcion_detalle_id,
        ocr.id AS orden_renglon_id,
        ocr.solicitud_cotizacion_renglon_id,
        ocr.necesidad_id,
        n.descripcion AS necesidad_descripcion,
        ocr.area_id,
        a.nombre AS area_nombre,
        oc.id AS orden_id,
        r.id AS recepcion_id,
        p.razon_social AS proveedor_nombre
      FROM bien b
      JOIN kardex k ON k.bien_id = b.id AND k.entidad_origen = 'recepcion'
      JOIN recepcion r ON r.id = k.entidad_id
      JOIN recepcion_detalle rd ON rd.recepcion_id = r.id AND rd.producto_id = b.producto_id
      JOIN recepcion_detalle_serie rds ON rds.recepcion_detalle_id = rd.id AND upper(rds.serie) = upper(b.serie)
      LEFT JOIN orden_compra_renglon ocr ON ocr.id = rd.orden_compra_renglon_id
      LEFT JOIN necesidad n ON n.id = ocr.necesidad_id
      LEFT JOIN area a ON a.id = ocr.area_id
      LEFT JOIN orden_compra oc ON oc.id = ocr.orden_compra_id
      LEFT JOIN proveedor p ON p.id = oc.proveedor_id
      WHERE b.serie IN ('${sqlQuote(serialAreaA)}', '${sqlQuote(serialAreaB)}')
      ORDER BY b.serie
    ) t;
  `, { raw: true });
  writeFileSync(path.join(outputDir, '05-db-origin-check.json'), dbOrigin || '[]');

  const summary = {
    outputDir,
    correlationId,
    folio: context.folio,
    expedienteId: ids.expediente,
    ordenId: ids.orden,
    recepcionId: createResponse.body.id,
    seriales: [serialAreaA, serialAreaB],
    activos: activos.map((activo) => ({ id: activo.id, serie: activo.serie, estado: activo.estado })),
    acquisitionOrigins: histories.map((item) => ({
      activoId: item.activo.id,
      serie: item.activo.serie,
      areaId: item.adquisicionOrigen?.areaId || null,
      areaNombre: item.adquisicionOrigen?.areaNombre || null,
      necesidadId: item.adquisicionOrigen?.necesidadId || null,
      ordenRenglonId: item.adquisicionOrigen?.ordenRenglonId || null,
      recepcionId: item.adquisicionOrigen?.recepcionId || null,
      proveedorNombre: item.adquisicionOrigen?.proveedorNombre || null,
    })),
  };
  assertOrigin(summary);
  writeFileSync(path.join(outputDir, '00-summary.json'), JSON.stringify(summary, null, 2));
  log(`PASS. Evidencia: ${path.join(outputDir, '00-summary.json')}`);
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
