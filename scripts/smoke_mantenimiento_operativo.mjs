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
const OUTPUT_ROOT = path.join(ROOT, 'installer-output', 'smoke-mantenimiento-operativo');
const BACKEND_URL = process.env.ERP_SMOKE_BACKEND_URL || 'http://localhost:13000';
const KEYCLOAK_URL = process.env.ERP_SMOKE_KEYCLOAK_URL || 'http://localhost:18080';

function fail(message) {
  console.error(`[erp-gob][smoke-mantenimiento][error] ${message}`);
  process.exit(1);
}

function log(message) {
  console.log(`[erp-gob][smoke-mantenimiento] ${message}`);
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
  const { allowFailure = false, ...requestOptions } = options;
  const response = await fetch(`${BACKEND_URL}${pathname}`, {
    ...requestOptions,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Correlation-Id': correlationId,
      ...(requestOptions.headers || {}),
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
    if (allowFailure) {
      return { status: response.status, body, ok: false };
    }
    throw new Error(`${options.method || 'GET'} ${pathname} fallo con ${response.status}: ${JSON.stringify(body)}`);
  }
  return { status: response.status, body, ok: true };
}

function loadReferenceAsset() {
  const asset = readJson(`
    SELECT row_to_json(a)::text
    FROM (
      SELECT id, codigo, nombre, asset_categoria, estado
      FROM gias_asset
      WHERE estado = 'ACTIVO'
      ORDER BY CASE WHEN asset_categoria = 'VEHICULO' THEN 0 ELSE 1 END, created_at, id
      LIMIT 1
    ) a;
  `);

  if (!asset?.id) fail('No existe activo GIAS ACTIVO para el smoke de mantenimiento.');
  return asset;
}

function cleanup({ correlationIds, mantenimientoId, ordenTrabajoId, assetId }) {
  if (process.env.ERP_SMOKE_KEEP_DATA === 'true') {
    log(`Conservando datos de prueba por ERP_SMOKE_KEEP_DATA=true: ${ordenTrabajoId}`);
    return;
  }

  const correlationFilter = correlationIds.map((item) => `'${sqlQuote(item)}'`).join(', ');

  runPsql(`
    BEGIN;
    DELETE FROM outbox_event
    WHERE correlation_id IN (${correlationFilter})
       OR aggregate_id IN ('${sqlQuote(mantenimientoId)}', '${sqlQuote(ordenTrabajoId)}');
    DELETE FROM bitacora
    WHERE correlation_id IN (${correlationFilter})
       OR entidad_id IN ('${sqlQuote(mantenimientoId)}', '${sqlQuote(ordenTrabajoId)}');
    DELETE FROM mantenimiento_orden_trabajo_evidencia WHERE orden_trabajo_id = '${sqlQuote(ordenTrabajoId)}';
    DELETE FROM mantenimiento_orden_trabajo_repuesto WHERE orden_trabajo_id = '${sqlQuote(ordenTrabajoId)}';
    DELETE FROM mantenimiento_orden_trabajo WHERE id = '${sqlQuote(ordenTrabajoId)}';
    DELETE FROM mantenimiento_seguimiento WHERE id = '${sqlQuote(mantenimientoId)}';
    UPDATE gias_asset SET estado = 'ACTIVO', updated_at = now() WHERE id = '${sqlQuote(assetId)}';
    COMMIT;
  `);
}

async function main() {
  const env = parseEnv(ENV_PATH);
  const token = await getToken(env);
  const asset = loadReferenceAsset();
  const runId = randomUUID();
  const correlationIds = [];
  const nextCorrelationId = () => {
    const correlationId = randomUUID();
    correlationIds.push(correlationId);
    return correlationId;
  };
  const today = new Date().toISOString().slice(0, 10);
  const outputDir = path.join(OUTPUT_ROOT, new Date().toISOString().replaceAll(':', '-'));
  mkdirSync(outputDir, { recursive: true });
  const createdIds = {
    mantenimientoId: null,
    ordenTrabajoId: null,
  };

  try {
    log(`Creando mantenimiento correctivo para ${asset.codigo || asset.id}`);
    const mantenimientoCorrelationId = nextCorrelationId();
    const mantenimiento = await api('/mantenimientos', token, mantenimientoCorrelationId, {
      method: 'POST',
      body: JSON.stringify({
        activoId: asset.id,
        modo: 'INTERNO',
        tipo: 'CORRECTIVO',
        descripcion: 'Smoke recurrente de mantenimiento operativo',
        programadoPara: today,
        responsable: 'Smoke mantenimiento',
        notas: 'Validacion viva recurrente de mantenimiento general',
        correlationId: mantenimientoCorrelationId,
      }),
    });
    createdIds.mantenimientoId = mantenimiento.body.id;

    const ordenCorrelationId = nextCorrelationId();
    const orden = await api('/ordenes-trabajo', token, ordenCorrelationId, {
      method: 'POST',
      body: JSON.stringify({
        mantenimientoId: mantenimiento.body.id,
        tipo: 'CORRECTIVO',
        modalidad: 'INTERNA',
        descripcionTrabajo: 'Smoke recurrente de orden de trabajo',
        responsable: 'Smoke mantenimiento',
        fechaProgramada: today,
        correlationId: ordenCorrelationId,
      }),
    });
    createdIds.ordenTrabajoId = orden.body.id;

    const authorizeCorrelationId = nextCorrelationId();
    const authorized = await api(`/ordenes-trabajo/${orden.body.id}/autorizar`, token, authorizeCorrelationId, {
      method: 'POST',
      body: JSON.stringify({ correlationId: authorizeCorrelationId }),
    });
    const startCorrelationId = nextCorrelationId();
    const started = await api(`/ordenes-trabajo/${orden.body.id}/iniciar`, token, startCorrelationId, {
      method: 'POST',
      body: JSON.stringify({ fechaInicio: today, correlationId: startCorrelationId }),
    });
    const receiveCorrelationId = nextCorrelationId();
    const received = await api(`/ordenes-trabajo/${orden.body.id}/recibir`, token, receiveCorrelationId, {
      method: 'POST',
      body: JSON.stringify({ fechaRecepcion: today, costoFinal: 0, correlationId: receiveCorrelationId }),
    });

    const closeCorrelationId = nextCorrelationId();
    const closePayload = {
      fechaCierre: today,
      costoFinal: 0,
      responsable: 'Smoke mantenimiento',
      notas: 'Cierre smoke mantenimiento operativo',
      correlationId: closeCorrelationId,
    };
    let closeRetried = false;
    let firstCloseFailure = null;
    let closed = await api(`/ordenes-trabajo/${orden.body.id}/cerrar`, token, closeCorrelationId, {
      method: 'POST',
      body: JSON.stringify(closePayload),
      allowFailure: true,
    });
    if (!closed.ok) {
      closeRetried = true;
      firstCloseFailure = { status: closed.status, body: closed.body };
      const retryCorrelationId = nextCorrelationId();
      log(`Cierre inicial devolvio ${closed.status}; reintentando cierre idempotente de OT`);
      await new Promise((resolve) => setTimeout(resolve, 250));
      closed = await api(`/ordenes-trabajo/${orden.body.id}/cerrar`, token, retryCorrelationId, {
        method: 'POST',
        body: JSON.stringify({ ...closePayload, correlationId: retryCorrelationId }),
      });
    }

    if (closed.body?.estado !== 'CERRADA') {
      throw new Error(`La orden no cerro correctamente: ${JSON.stringify(closed.body)}`);
    }

    const detail = await api(`/ordenes-trabajo/${orden.body.id}`, token, nextCorrelationId());
    const vehiculos = await api('/vehiculos/indicadores', token, nextCorrelationId());
    const inmuebles = await api('/facilities/inmuebles/indicadores', token, nextCorrelationId());

    const summary = {
      result: 'PASS',
      backendUrl: BACKEND_URL,
      asset,
      runId,
      correlationIds,
      closeRetried,
      firstCloseFailure,
      mantenimiento: mantenimiento.body,
      ordenTrabajo: {
        created: orden.body,
        authorized: authorized.body,
        started: started.body,
        received: received.body,
        closed: closed.body,
        detail: detail.body,
      },
      indicadores: {
        vehiculos: vehiculos.body,
        inmuebles: inmuebles.body,
      },
      finishedAt: new Date().toISOString(),
    };

    writeFileSync(path.join(outputDir, '00-summary.json'), JSON.stringify(summary, null, 2));
    log(`PASS. Evidencia: ${path.join(outputDir, '00-summary.json')}`);
  } finally {
    if (createdIds.mantenimientoId && createdIds.ordenTrabajoId) {
      cleanup({
        correlationIds,
        mantenimientoId: createdIds.mantenimientoId,
        ordenTrabajoId: createdIds.ordenTrabajoId,
        assetId: asset.id,
      });
    }
  }
}

main().catch((error) => fail(error?.stack || error?.message || String(error)));
