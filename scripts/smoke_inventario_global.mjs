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
const OUTPUT_ROOT = path.join(ROOT, 'installer-output', 'smoke-inventario-global');
const BACKEND_URL = process.env.ERP_SMOKE_BACKEND_URL || 'http://localhost:13000';
const KEYCLOAK_URL = process.env.ERP_SMOKE_KEYCLOAK_URL || 'http://localhost:18080';

function fail(message) {
  console.error(`[erp-gob][smoke-inventario][error] ${message}`);
  process.exit(1);
}

function log(message) {
  console.log(`[erp-gob][smoke-inventario] ${message}`);
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
  if (raw) args.push('-t', '-A');

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
    fail(`No se pudo obtener token Keycloak (${response.status}). ${detail}`);
  }

  const payload = await response.json();
  if (!payload.access_token) fail('Keycloak no devolvio access_token.');
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
    if (response.status === 401 && JSON.stringify(body).includes('invalid issuer')) {
      throw new Error(
        `${options.method || 'GET'} ${pathname} fallo con issuer invalido. Ejecuta primero: node scripts/erp-gob-cli.mjs auth-sync`,
      );
    }
    throw new Error(`${options.method || 'GET'} ${pathname} fallo con ${response.status}: ${JSON.stringify(body)}`);
  }
  return { status: response.status, body };
}

function loadReferenceInventory() {
  const refs = readJson(`
    SELECT jsonb_build_object(
      'inventario', (
        SELECT row_to_json(i)::jsonb
        FROM (
          SELECT
            inv.id,
            inv.almacen_id AS "almacenId",
            inv.ubicacion_id AS "ubicacionId",
            inv.producto_id AS "productoId",
            inv.variante_id AS "varianteId",
            inv.bien_id AS "bienId",
            inv.cantidad::text AS cantidad,
            inv.cantidad_reservada::text AS "cantidadReservada",
            inv.cantidad_comprometida::text AS "cantidadComprometida",
            p.descripcion AS producto
          FROM inventario inv
          LEFT JOIN producto p ON p.id = inv.producto_id
          WHERE inv.producto_id IS NOT NULL
          ORDER BY inv.cantidad DESC, inv.updated_at DESC, inv.id
          LIMIT 1
        ) i
      ),
      'expediente', (
        SELECT row_to_json(e)::jsonb
        FROM (
          SELECT id, folio, estatus
          FROM expediente
          ORDER BY created_at DESC, id DESC
          LIMIT 1
        ) e
      )
    )::text;
  `);

  if (!refs?.inventario?.id) fail('No existe inventario con producto para el smoke global.');
  if (!refs?.expediente?.id) fail('No existe expediente para asociar conteo de inventario.');
  return refs;
}

function cleanup({ correlationIds, conteoId }) {
  if (!conteoId || process.env.ERP_SMOKE_KEEP_DATA === 'true') {
    if (conteoId) log(`Conservando conteo de prueba por ERP_SMOKE_KEEP_DATA=true: ${conteoId}`);
    return;
  }

  const correlationFilter = correlationIds.length
    ? correlationIds.map((item) => `'${sqlQuote(item)}'`).join(', ')
    : 'NULL';

  runPsql(`
    BEGIN;
    DELETE FROM outbox_event
    WHERE aggregate_id = '${sqlQuote(conteoId)}'
       OR correlation_id IN (${correlationFilter});
    DELETE FROM bitacora
    WHERE entidad_id = '${sqlQuote(conteoId)}'
       OR correlation_id IN (${correlationFilter});
    DELETE FROM conteo_fisico_detalle WHERE conteo_id = '${sqlQuote(conteoId)}';
    DELETE FROM conteo_fisico WHERE id = '${sqlQuote(conteoId)}';
    COMMIT;
  `);
}

function requireItems(response, label) {
  if (!response?.body || !Array.isArray(response.body.items)) {
    throw new Error(`${label} no devolvio contrato { items: [] }`);
  }
  return response.body.items;
}

async function main() {
  const env = parseEnv(ENV_PATH);
  const token = await getToken(env);
  const refs = loadReferenceInventory();
  const inventory = refs.inventario;
  const expediente = refs.expediente;
  const outputDir = path.join(OUTPUT_ROOT, new Date().toISOString().replaceAll(':', '-'));
  mkdirSync(outputDir, { recursive: true });

  const correlationIds = [];
  const nextCorrelationId = () => {
    const correlationId = randomUUID();
    correlationIds.push(correlationId);
    return correlationId;
  };
  const createdIds = { conteoId: null };

  try {
    log(`Validando inventario global con producto ${inventory.productoId}`);

    const almacenes = requireItems(await api('/almacenes', token, nextCorrelationId()), 'GET /almacenes');
    if (!almacenes.some((item) => item.id === inventory.almacenId)) {
      throw new Error('El almacen del inventario de referencia no aparece en GET /almacenes.');
    }

    const posiciones = requireItems(
      await api(`/inventory/almacenes/${inventory.almacenId}/posiciones`, token, nextCorrelationId()),
      'GET /inventory/almacenes/{id}/posiciones',
    );
    const posicion = posiciones.find((item) => item.id === inventory.id);
    if (!posicion) throw new Error('La posicion de inventario no aparece en el listado por almacen.');

    const producto = requireItems(
      await api(`/inventory/productos/${inventory.productoId}`, token, nextCorrelationId()),
      'GET /inventory/productos/{productoId}',
    );
    if (!producto.some((item) => item.id === inventory.id)) {
      throw new Error('El inventario de referencia no aparece en la consulta por producto.');
    }

    const kardex = requireItems(
      await api(`/inventory/productos/${inventory.productoId}/kardex`, token, nextCorrelationId()),
      'GET /inventory/productos/{productoId}/kardex',
    );
    const reservas = requireItems(await api('/inventory/reservas', token, nextCorrelationId()), 'GET /inventory/reservas');
    const reorden = requireItems(await api('/inventory/reorden', token, nextCorrelationId()), 'GET /inventory/reorden');
    const vencimientos = requireItems(
      await api('/inventory/vencimientos?thresholdDays=90', token, nextCorrelationId()),
      'GET /inventory/vencimientos',
    );
    const transferencias = requireItems(
      await api('/inventory/transferencias', token, nextCorrelationId()),
      'GET /inventory/transferencias',
    );
    const conteosPrevios = requireItems(
      await api(`/inventory/conteos?almacenId=${inventory.almacenId}`, token, nextCorrelationId()),
      'GET /inventory/conteos',
    );

    const createConteoCorrelationId = nextCorrelationId();
    const conteo = await api('/inventory/conteos', token, createConteoCorrelationId, {
      method: 'POST',
      body: JSON.stringify({
        almacenId: inventory.almacenId,
        expedienteId: expediente.id,
        inventarioIds: [inventory.id],
        actorExternalId: 'smoke-inventario-global',
        correlationId: createConteoCorrelationId,
      }),
    });
    createdIds.conteoId = conteo.body?.id;

    if (!createdIds.conteoId || !Array.isArray(conteo.body?.detalles) || conteo.body.detalles.length !== 1) {
      throw new Error(`POST /inventory/conteos no devolvio detalle esperado: ${JSON.stringify(conteo.body)}`);
    }

    const detalle = conteo.body.detalles[0];
    const conteoDetail = await api(`/inventory/conteos/${createdIds.conteoId}`, token, nextCorrelationId());
    if (conteoDetail.body?.id !== createdIds.conteoId) {
      throw new Error('GET /inventory/conteos/{id} no recupero el conteo creado.');
    }

    const updateDetalle = await api(
      `/inventory/conteos/${createdIds.conteoId}/detalles/${detalle.id}`,
      token,
      nextCorrelationId(),
      {
        method: 'PATCH',
        body: JSON.stringify({ cantidadContada: Number(detalle.cantidadTeorica) }),
      },
    );
    if (updateDetalle.body?.diferencia !== '0') {
      throw new Error(`PATCH detalle de conteo dejo diferencia inesperada: ${JSON.stringify(updateDetalle.body)}`);
    }

    const conteosDespues = requireItems(
      await api(`/inventory/conteos?almacenId=${inventory.almacenId}`, token, nextCorrelationId()),
      'GET /inventory/conteos despues de crear conteo',
    );
    if (!conteosDespues.some((item) => item.id === createdIds.conteoId)) {
      throw new Error('El conteo creado no aparece en el listado por almacen.');
    }

    const summary = {
      result: 'PASS',
      backendUrl: BACKEND_URL,
      reference: {
        inventarioId: inventory.id,
        productoId: inventory.productoId,
        almacenId: inventory.almacenId,
        ubicacionId: inventory.ubicacionId,
        cantidad: inventory.cantidad,
        expedienteId: expediente.id,
        expedienteFolio: expediente.folio,
      },
      reads: {
        almacenes: almacenes.length,
        posiciones: posiciones.length,
        producto: producto.length,
        kardex: kardex.length,
        reservas: reservas.length,
        reorden: reorden.length,
        vencimientos: vencimientos.length,
        transferencias: transferencias.length,
        conteosPrevios: conteosPrevios.length,
        conteosDespues: conteosDespues.length,
      },
      conteo: {
        id: createdIds.conteoId,
        estado: conteo.body.estado,
        totalDetalles: conteo.body.detalles.length,
        detalleActualizado: updateDetalle.body,
      },
      correlationIds,
      finishedAt: new Date().toISOString(),
    };

    writeFileSync(path.join(outputDir, '00-summary.json'), JSON.stringify(summary, null, 2));
    cleanup({ correlationIds, conteoId: createdIds.conteoId });
    log(`PASS. Evidencia: ${path.join(outputDir, '00-summary.json')}`);
  } catch (error) {
    cleanup({ correlationIds, conteoId: createdIds.conteoId });
    throw error;
  }
}

main().catch((error) => fail(error?.stack || error?.message || String(error)));
