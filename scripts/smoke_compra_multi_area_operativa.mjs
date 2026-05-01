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
const OUTPUT_ROOT = path.join(ROOT, 'installer-output', 'smoke-compra-multi-area-operativa');
const BACKEND_URL = process.env.ERP_SMOKE_BACKEND_URL || 'http://localhost:13000';
const KEYCLOAK_URL = process.env.ERP_SMOKE_KEYCLOAK_URL || 'http://localhost:18080';
const KEEP_DATA = String(process.env.ERP_SMOKE_KEEP_DATA || '').toLowerCase() === 'true';

function fail(message) {
  console.error(`[erp-gob][smoke-compra-multi-area][error] ${message}`);
  process.exit(1);
}

function log(message) {
  console.log(`[erp-gob][smoke-compra-multi-area] ${message}`);
}

function warn(message) {
  console.warn(`[erp-gob][smoke-compra-multi-area][warn] ${message}`);
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
  const args = ['exec', '-i', 'erp-suite-postgres', 'psql', '-v', 'ON_ERROR_STOP=1', '-U', 'erp', '-d', 'erp'];
  if (raw) {
    args.push('-t', '-A');
  }

  const result = spawnSync('docker', args, { input: sql, encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(`psql fallo.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
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
    throw new Error('Faltan KEYCLOAK_API_CLIENT_SECRET o ERP_FRONTEND_TESTER_PASSWORD en .env.');
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
    throw new Error(`No se pudo obtener token Keycloak (${response.status}). ${detail}`);
  }

  const payload = await response.json();
  if (!payload.access_token) {
    throw new Error('Keycloak no devolvio access_token.');
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
      'quoteLineNeedIndex', EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'uq_solicitud_cotizacion_renglon_necesidad'
      ),
      'inventoryTable', to_regclass('public.inventario') IS NOT NULL,
      'receptionTable', to_regclass('public.recepcion') IS NOT NULL
    )::text;
  `);

  if (!checks?.orderLineOriginIndex) {
    throw new Error('Falta indice uq_orden_compra_renglon_item_origen. Aplica migraciones canonicas antes del smoke.');
  }
  if (!checks?.quoteLineNeedIndex) {
    throw new Error('Falta indice uq_solicitud_cotizacion_renglon_necesidad. Aplica migraciones canonicas antes del smoke.');
  }
  if (!checks?.inventoryTable || !checks?.receptionTable) {
    throw new Error('Faltan tablas de recepcion/inventario para smoke compra multi-area.');
  }
}

function loadReferenceData() {
  const refs = readJson(`
    SELECT jsonb_build_object(
      'configId', (SELECT id FROM configuracion_normativa WHERE is_active = true ORDER BY ejercicio_fiscal DESC, created_at DESC LIMIT 1),
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

  if (!refs?.configId) throw new Error('No existe configuracion_normativa activa.');
  if (!refs?.proveedor?.id) throw new Error('No existe proveedor para el smoke.');
  if (!Array.isArray(refs.areas) || refs.areas.length < 2) throw new Error('Se requieren al menos dos areas para el smoke multi-area.');
  return refs;
}

function buildIds() {
  return {
    producto: randomUUID(),
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

function seedPurchaseChain({ refs, ids, suffix, correlationId }) {
  const proveedorId = refs.proveedor.id;
  const areaA = refs.areas[0];
  const areaB = refs.areas[1];
  const folio = `EXP-MA-OP-${suffix}`;
  const productoClave = `SMK-MA-OP-${suffix}`;
  const productoDescripcion = `Smoke consumible multi-area ${suffix}`;

  const sql = `
    BEGIN;
    INSERT INTO producto (id, clave, descripcion, tipo_bien, estatus, requiere_serie, control_lote, control_reforzado)
    VALUES ('${ids.producto}', '${productoClave}', '${productoDescripcion}', 'CONSUMIBLE', 'ACTIVO', false, false, false);

    INSERT INTO expediente (id, tipo, folio, ejercicio_fiscal, estatus)
    VALUES ('${ids.expediente}', 'COMPRA', '${folio}', 2026, 'ABIERTO');

    INSERT INTO procedimiento (
      id, expediente_id, tipo, configuracion_normativa_id, estatus,
      tipo_determinado, tipo_origen, monto_calculado_uma, monto_con_iva_base,
      uma_valor_utilizado, ejercicio_uma, correlation_id
    ) VALUES (
      '${ids.procedimiento}', '${ids.expediente}', 'ADJUDICACION_DIRECTA', '${refs.configId}', 'AUTORIZADO',
      'ADJUDICACION_DIRECTA', 'MANUAL_EXCEPTION', 1, 2000,
      108.57, 2026, '${correlationId}'
    );

    INSERT INTO necesidad (id, expediente_id, area_id, descripcion, clasificacion_bien, justificacion, producto_id, estatus)
    VALUES
      ('${ids.necesidadAreaA}', '${ids.expediente}', '${areaA.id}', 'Smoke consumible multi-area para ${sqlQuote(areaA.nombre)}', 'CONSUMIBLE', 'Smoke recurrente de compra operativa por area', '${ids.producto}', 'ACTIVA'),
      ('${ids.necesidadAreaB}', '${ids.expediente}', '${areaB.id}', 'Smoke consumible multi-area para ${sqlQuote(areaB.nombre)}', 'CONSUMIBLE', 'Smoke recurrente de compra operativa por area', '${ids.producto}', 'ACTIVA');

    INSERT INTO solicitud_cotizacion (id, expediente_id, procedimiento_id, estatus, asunto, justificacion, correlation_id)
    VALUES ('${ids.solicitud}', '${ids.expediente}', '${ids.procedimiento}', 'BORRADOR', 'Smoke compra multi-area operativa', 'Smoke recurrente de trazabilidad operativa por area', '${correlationId}');

    INSERT INTO solicitud_cotizacion_proveedor (id, solicitud_cotizacion_id, proveedor_id, estatus, responded_at, correlation_id)
    VALUES ('${ids.solicitudProveedor}', '${ids.solicitud}', '${proveedorId}', 'RESPONDIO', now(), '${correlationId}');

    INSERT INTO solicitud_cotizacion_renglon (id, solicitud_cotizacion_id, producto_id, variante_id, cantidad_solicitada, unidad_medida, descripcion, estatus, necesidad_id, area_id)
    VALUES
      ('${ids.solicitudRenglonAreaA}', '${ids.solicitud}', '${ids.producto}', NULL, 1, 'PIEZA', '${productoDescripcion} - ${sqlQuote(areaA.nombre)}', 'ACTIVO', '${ids.necesidadAreaA}', '${areaA.id}'),
      ('${ids.solicitudRenglonAreaB}', '${ids.solicitud}', '${ids.producto}', NULL, 1, 'PIEZA', '${productoDescripcion} - ${sqlQuote(areaB.nombre)}', 'ACTIVO', '${ids.necesidadAreaB}', '${areaB.id}');

    INSERT INTO cuadro_comparativo (
      id, procedimiento_id, solicitud_consolidada_id, version, estatus,
      modo_adjudicacion, proveedor_ganador_id, puntaje_total_ganador,
      justificacion_general, correlation_id, evaluado_at, autorizado_at
    ) VALUES (
      '${ids.cuadro}', '${ids.procedimiento}', '${ids.solicitud}', 1, 'AUTORIZADO',
      'POR_RENGLON', NULL, 100,
      'Smoke compra multi-area operativa', '${correlationId}', now(), now()
    );

    INSERT INTO cuadro_comparativo_renglon (id, cuadro_id, proveedor_id, producto_id, variante_id, cantidad, precio_unitario, subtotal, es_ganador, justificacion, metadata_json)
    VALUES
      ('${ids.cuadroRenglonAreaA}', '${ids.cuadro}', '${proveedorId}', '${ids.producto}', NULL, 1, 1000, 1000, true, 'Ganador ${sqlQuote(areaA.nombre)}', jsonb_build_object('solicitud_cotizacion_renglon_id', '${ids.solicitudRenglonAreaA}', 'necesidad_id', '${ids.necesidadAreaA}', 'area_id', '${areaA.id}')),
      ('${ids.cuadroRenglonAreaB}', '${ids.cuadro}', '${proveedorId}', '${ids.producto}', NULL, 1, 1000, 1000, true, 'Ganador ${sqlQuote(areaB.nombre)}', jsonb_build_object('solicitud_cotizacion_renglon_id', '${ids.solicitudRenglonAreaB}', 'necesidad_id', '${ids.necesidadAreaB}', 'area_id', '${areaB.id}'));

    INSERT INTO orden_compra (id, expediente_id, procedimiento_id, cuadro_comparativo_id, proveedor_id, estatus, monto_total, fecha_emision, correlation_id)
    VALUES ('${ids.orden}', '${ids.expediente}', '${ids.procedimiento}', '${ids.cuadro}', '${proveedorId}', 'PENDIENTE', 2000, current_date, '${correlationId}');

    INSERT INTO orden_compra_renglon (
      id, orden_compra_id, producto_id, variante_id, cantidad_solicitada, cantidad_autorizada,
      cantidad_surtida, precio_unitario, observaciones, solicitud_cotizacion_renglon_id, necesidad_id, area_id
    ) VALUES
      ('${ids.ordenRenglonAreaA}', '${ids.orden}', '${ids.producto}', NULL, 1, 1, 0, 1000, 'Origen ${sqlQuote(areaA.nombre)}', '${ids.solicitudRenglonAreaA}', '${ids.necesidadAreaA}', '${areaA.id}'),
      ('${ids.ordenRenglonAreaB}', '${ids.orden}', '${ids.producto}', NULL, 1, 1, 0, 1000, 'Origen ${sqlQuote(areaB.nombre)}', '${ids.solicitudRenglonAreaB}', '${ids.necesidadAreaB}', '${areaB.id}');
    COMMIT;
  `;

  runPsql(sql);
  return { folio, productoId: ids.producto, productoClave, productoDescripcion, proveedorId, areaA, areaB };
}

function assertBusinessRules(summary) {
  if (summary.detail?.estado !== 'CONFIRMADA') {
    throw new Error(`La recepcion no quedo CONFIRMADA. Estado=${summary.detail?.estado || '<sin estado>'}.`);
  }
  if (summary.detail?.detalles?.length !== 2) {
    throw new Error(`Se esperaban 2 detalles de recepcion; recibidos=${summary.detail?.detalles?.length || 0}.`);
  }
  if (summary.db?.orden?.estatus !== 'SURTIDA') {
    throw new Error(`La orden no quedo SURTIDA. Estado=${summary.db?.orden?.estatus || '<sin estado>'}.`);
  }

  const origins = summary.db?.origenes || [];
  const areaIds = new Set(origins.map((item) => item.areaId).filter(Boolean));
  const needIds = new Set(origins.map((item) => item.necesidadId).filter(Boolean));
  const orderLineIds = new Set(origins.map((item) => item.ordenRenglonId).filter(Boolean));
  if (origins.length !== 2) throw new Error(`Se esperaban 2 origenes de recepcion; recibidos=${origins.length}.`);
  if (areaIds.size !== 2) throw new Error('La recepcion no preservo dos areas distintas.');
  if (needIds.size !== 2) throw new Error('La recepcion no preservo dos necesidades distintas.');
  if (orderLineIds.size !== 2) throw new Error('La recepcion no preservo dos renglones de orden distintos.');

  const totalInventario = Number(summary.db?.inventario?.totalCantidad || 0);
  if (totalInventario !== 2) {
    throw new Error(`Inventario esperado=2 para producto temporal; recibido=${totalInventario}.`);
  }

  const surtidas = summary.db?.renglonesOrden || [];
  if (surtidas.length !== 2 || surtidas.some((item) => Number(item.cantidadSurtida) !== 1)) {
    throw new Error('Los renglones de orden no quedaron surtidos 1/1.');
  }
}

function loadDbSummary({ ids, recepcionId }) {
  return readJson(`
    SELECT jsonb_build_object(
      'orden', (
        SELECT jsonb_build_object('id', id, 'estatus', estatus, 'montoTotal', monto_total::text)
        FROM orden_compra
        WHERE id = '${ids.orden}'
      ),
      'renglonesOrden', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'ordenRenglonId', ocr.id,
          'areaId', ocr.area_id,
          'necesidadId', ocr.necesidad_id,
          'cantidadAutorizada', ocr.cantidad_autorizada::text,
          'cantidadSurtida', ocr.cantidad_surtida::text
        ) ORDER BY ocr.id)
        FROM orden_compra_renglon ocr
        WHERE ocr.orden_compra_id = '${ids.orden}'
      ), '[]'::jsonb),
      'origenes', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'recepcionDetalleId', rd.id,
          'ordenRenglonId', ocr.id,
          'solicitudCotizacionRenglonId', ocr.solicitud_cotizacion_renglon_id,
          'necesidadId', ocr.necesidad_id,
          'necesidadDescripcion', n.descripcion,
          'areaId', ocr.area_id,
          'areaNombre', a.nombre,
          'cantidadRecibida', rd.cantidad::text
        ) ORDER BY a.nombre, rd.id)
        FROM recepcion_detalle rd
        JOIN orden_compra_renglon ocr ON ocr.id = rd.orden_compra_renglon_id
        LEFT JOIN necesidad n ON n.id = ocr.necesidad_id
        LEFT JOIN area a ON a.id = ocr.area_id
        WHERE rd.recepcion_id = '${recepcionId}'
      ), '[]'::jsonb),
      'inventario', (
        SELECT jsonb_build_object(
          'rows', COUNT(*)::int,
          'totalCantidad', COALESCE(SUM(cantidad), 0)::text,
          'totalComprometida', COALESCE(SUM(cantidad_comprometida), 0)::text
        )
        FROM inventario
        WHERE producto_id = '${ids.producto}'
      ),
      'kardexEntradas', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'id', id,
          'tipoMovimiento', tipo_movimiento,
          'entidadOrigen', entidad_origen,
          'entidadId', entidad_id,
          'cantidad', cantidad::text
        ) ORDER BY created_at, id)
        FROM kardex
        WHERE producto_id = '${ids.producto}'
          AND entidad_origen = 'recepcion'
      ), '[]'::jsonb)
    )::text;
  `);
}

function cleanupPurchaseChain({ ids, correlationId }) {
  if (KEEP_DATA) {
    log('ERP_SMOKE_KEEP_DATA=true; se conserva data del smoke para inspeccion.');
    return { skipped: true };
  }

  runPsql(`
    BEGIN;
    DELETE FROM outbox_event WHERE correlation_id = '${correlationId}';
    DELETE FROM bitacora WHERE correlation_id = '${correlationId}' OR expediente_id = '${ids.expediente}';
    DELETE FROM kardex WHERE correlation_id = '${correlationId}' OR expediente_id = '${ids.expediente}' OR producto_id = '${ids.producto}';
    DELETE FROM recepcion_detalle_lote WHERE recepcion_detalle_id IN (
      SELECT rd.id FROM recepcion_detalle rd JOIN recepcion r ON r.id = rd.recepcion_id
      WHERE r.expediente_id = '${ids.expediente}' OR r.correlation_id = '${correlationId}'
    );
    DELETE FROM recepcion_detalle_serie WHERE recepcion_detalle_id IN (
      SELECT rd.id FROM recepcion_detalle rd JOIN recepcion r ON r.id = rd.recepcion_id
      WHERE r.expediente_id = '${ids.expediente}' OR r.correlation_id = '${correlationId}'
    );
    DELETE FROM recepcion_detalle WHERE recepcion_id IN (
      SELECT id FROM recepcion WHERE expediente_id = '${ids.expediente}' OR correlation_id = '${correlationId}'
    );
    DELETE FROM recepcion WHERE expediente_id = '${ids.expediente}' OR correlation_id = '${correlationId}';
    DELETE FROM inventario_lote WHERE producto_id = '${ids.producto}';
    DELETE FROM inventario WHERE producto_id = '${ids.producto}';
    DELETE FROM orden_compra_renglon WHERE orden_compra_id = '${ids.orden}';
    DELETE FROM orden_compra WHERE id = '${ids.orden}';
    DELETE FROM cuadro_comparativo_renglon WHERE cuadro_id = '${ids.cuadro}';
    DELETE FROM cuadro_comparativo_detalle WHERE cuadro_id = '${ids.cuadro}';
    DELETE FROM cuadro_comparativo WHERE id = '${ids.cuadro}';
    DELETE FROM solicitud_cotizacion_renglon WHERE solicitud_cotizacion_id = '${ids.solicitud}';
    DELETE FROM solicitud_cotizacion_proveedor WHERE solicitud_cotizacion_id = '${ids.solicitud}';
    DELETE FROM solicitud_cotizacion WHERE id = '${ids.solicitud}';
    DELETE FROM necesidad WHERE expediente_id = '${ids.expediente}';
    DELETE FROM procedimiento WHERE id = '${ids.procedimiento}';
    DELETE FROM expediente WHERE id = '${ids.expediente}';
    DELETE FROM producto WHERE id = '${ids.producto}';
    COMMIT;
  `);

  const leftovers = readJson(`
    SELECT jsonb_build_object(
      'producto', (SELECT COUNT(*)::int FROM producto WHERE id = '${ids.producto}'),
      'expediente', (SELECT COUNT(*)::int FROM expediente WHERE id = '${ids.expediente}'),
      'recepciones', (SELECT COUNT(*)::int FROM recepcion WHERE expediente_id = '${ids.expediente}' OR correlation_id = '${correlationId}'),
      'inventario', (SELECT COUNT(*)::int FROM inventario WHERE producto_id = '${ids.producto}'),
      'outbox', (SELECT COUNT(*)::int FROM outbox_event WHERE correlation_id = '${correlationId}'),
      'bitacora', (SELECT COUNT(*)::int FROM bitacora WHERE correlation_id = '${correlationId}' OR expediente_id = '${ids.expediente}')
    )::text;
  `);

  return { skipped: false, leftovers };
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
  let runError = null;
  let context = null;

  try {
    context = seedPurchaseChain({ refs, ids, suffix, correlationId });

    const createResponse = await api('/recepciones', token, correlationId, {
      method: 'POST',
      body: JSON.stringify({
        ordenId: ids.orden,
        expedienteId: ids.expediente,
        proveedorId: context.proveedorId,
        origen: 'ORDEN',
        fechaRecepcion: new Date().toISOString(),
        observaciones: 'Smoke recurrente compra multi-area operativa',
        referenciaEntrega: `SMOKE-MA-OP-${suffix}`,
        detalles: [
          {
            ordenRenglonId: ids.ordenRenglonAreaA,
            cantidadRecibida: 1,
            condicion: 'NUEVO',
            observaciones: `Recepcion operativa ${context.areaA.nombre}`,
          },
          {
            ordenRenglonId: ids.ordenRenglonAreaB,
            cantidadRecibida: 1,
            condicion: 'NUEVO',
            observaciones: `Recepcion operativa ${context.areaB.nombre}`,
          },
        ],
      }),
    });
    writeFileSync(path.join(outputDir, '01-recepcion-create.json'), JSON.stringify(createResponse, null, 2));
    if (!createResponse.ok) {
      throw new Error(`POST /recepciones fallo con ${createResponse.status}: ${JSON.stringify(createResponse.body)}`);
    }

    const confirmResponse = await api(`/recepciones/${createResponse.body.id}/estado`, token, correlationId, {
      method: 'PATCH',
      body: JSON.stringify({ estado: 'CONFIRMADA' }),
    });
    writeFileSync(path.join(outputDir, '02-recepcion-confirm.json'), JSON.stringify(confirmResponse, null, 2));
    if (!confirmResponse.ok) {
      throw new Error(`PATCH /recepciones/{id}/estado fallo con ${confirmResponse.status}: ${JSON.stringify(confirmResponse.body)}`);
    }

    const detailResponse = await api(`/recepciones/${createResponse.body.id}`, token, correlationId);
    writeFileSync(path.join(outputDir, '03-recepcion-detail.json'), JSON.stringify(detailResponse, null, 2));
    if (!detailResponse.ok) {
      throw new Error(`GET /recepciones/{id} fallo con ${detailResponse.status}: ${JSON.stringify(detailResponse.body)}`);
    }

    const dbSummary = loadDbSummary({ ids, recepcionId: createResponse.body.id });
    writeFileSync(path.join(outputDir, '04-db-summary.json'), JSON.stringify(dbSummary, null, 2));

    const summary = {
      outputDir,
      correlationId,
      folio: context.folio,
      producto: {
        id: context.productoId,
        clave: context.productoClave,
        descripcion: context.productoDescripcion,
      },
      proveedorId: context.proveedorId,
      expedienteId: ids.expediente,
      ordenId: ids.orden,
      recepcionId: createResponse.body.id,
      areas: [
        { id: context.areaA.id, nombre: context.areaA.nombre },
        { id: context.areaB.id, nombre: context.areaB.nombre },
      ],
      detail: {
        estado: detailResponse.body.estado,
        totalDetalles: detailResponse.body.detalles?.length ?? 0,
        detalles: (detailResponse.body.detalles || []).map((detalle) => ({
          ordenRenglonId: detalle.ordenRenglonId,
          productoId: detalle.productoId,
          cantidadRecibida: detalle.cantidadRecibida,
          esPatrimonial: detalle.esPatrimonial,
          requiereSerie: detalle.requiereSerie,
        })),
      },
      db: dbSummary,
    };
    assertBusinessRules(summary);
    writeFileSync(path.join(outputDir, '00-summary.json'), JSON.stringify(summary, null, 2));
    log(`PASS. Evidencia: ${path.join(outputDir, '00-summary.json')}`);
  } catch (error) {
    runError = error;
  } finally {
    if (context) {
      try {
        const cleanup = cleanupPurchaseChain({ ids, correlationId });
        writeFileSync(path.join(outputDir, '99-cleanup.json'), JSON.stringify(cleanup, null, 2));
      } catch (cleanupError) {
        if (runError) {
          warn(`Limpieza fallo despues de error funcional: ${cleanupError instanceof Error ? cleanupError.message : String(cleanupError)}`);
        } else {
          runError = cleanupError;
        }
      }
    }
  }

  if (runError) {
    throw runError;
  }
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
