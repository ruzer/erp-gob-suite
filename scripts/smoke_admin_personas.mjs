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
const OUTPUT_ROOT = path.join(ROOT, 'installer-output', 'smoke-admin-personas');
const BACKEND_URL = process.env.ERP_SMOKE_BACKEND_URL || 'http://localhost:13000';
const KEYCLOAK_URL = process.env.ERP_SMOKE_KEYCLOAK_URL || 'http://localhost:18080';

function fail(message) {
  console.error(`[erp-gob][smoke-admin-personas][error] ${message}`);
  process.exit(1);
}

function log(message) {
  console.log(`[erp-gob][smoke-admin-personas] ${message}`);
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
    fail(`${options.method || 'GET'} ${pathname} fallo con ${response.status}: ${JSON.stringify(body)}`);
  }
  return { status: response.status, body };
}

function loadReferenceArea() {
  const area = readJson(`
    SELECT row_to_json(a)::text
    FROM (
      SELECT id, nombre
      FROM area
      ORDER BY created_at, id
      LIMIT 1
    ) a;
  `);

  if (!area?.id) fail('No existe area institucional para adscribir persona.');
  return area;
}

function cleanup({ personaId, personaInstitucionalId, numeroEmpleado }) {
  if (process.env.ERP_SMOKE_KEEP_DATA === 'true') {
    log(`Conservando datos de prueba por ERP_SMOKE_KEEP_DATA=true: ${personaId}`);
    return;
  }

  runPsql(`
    BEGIN;
    DELETE FROM outbox_event WHERE aggregate_id IN ('${sqlQuote(personaId)}', '${sqlQuote(personaInstitucionalId)}');
    DELETE FROM bitacora WHERE entidad_id IN ('${sqlQuote(personaId)}', '${sqlQuote(personaInstitucionalId)}');
    DELETE FROM persona_adscripcion_historial WHERE persona_id = '${sqlQuote(personaInstitucionalId)}';
    DELETE FROM persona WHERE id = '${sqlQuote(personaId)}';
    DELETE FROM persona_institucional
    WHERE id = '${sqlQuote(personaInstitucionalId)}'
       OR numero_empleado = '${sqlQuote(numeroEmpleado)}';
    COMMIT;
  `);
}

async function main() {
  const env = parseEnv(ENV_PATH);
  const area = loadReferenceArea();
  const token = await getToken(env);
  const correlationId = randomUUID();
  const suffix = Date.now().toString().slice(-10);
  const numeroEmpleado = `SMK-PER-${suffix}`;
  const curp = `SMK${suffix.slice(0, 10)}HDFRRL01`.slice(0, 18);
  const outputDir = path.join(OUTPUT_ROOT, new Date().toISOString().replaceAll(':', '-'));
  mkdirSync(outputDir, { recursive: true });

  log(`Creando persona de smoke en area ${area.nombre}`);
  const created = await api('/personas', token, correlationId, {
    method: 'POST',
    body: JSON.stringify({
      areaId: area.id,
      curp,
      rfc: curp.slice(0, 13),
      numeroEmpleado,
      nombre: 'Smoke',
      primerApellido: 'Personas',
      segundoApellido: 'Admin',
      emailInstitucional: `${numeroEmpleado.toLowerCase()}@erp.gob.local`,
      fechaIngreso: '2026-04-30',
    }),
  });

  const persona = created.body;
  if (!persona?.id || !persona?.personaInstitucionalId) {
    fail(`La respuesta de alta no contiene identidad esperada: ${JSON.stringify(persona)}`);
  }

  const listed = await api(`/personas?q=${encodeURIComponent(numeroEmpleado)}&activo=false&limit=10`, token, correlationId);
  const found = listed.body?.items?.find((item) => item.id === persona.id);
  if (!found) fail('La persona creada no aparece en GET /personas.');

  const updated = await api(`/personas/${persona.id}`, token, correlationId, {
    method: 'PATCH',
    body: JSON.stringify({
      areaId: area.id,
      estatusLaboral: 'SUSPENDIDO',
    }),
  });

  if (updated.body?.estatusLaboral !== 'SUSPENDIDO') {
    fail(`PATCH /personas no reflejo estatus SUSPENDIDO: ${JSON.stringify(updated.body)}`);
  }

  const summary = {
    result: 'PASS',
    backendUrl: BACKEND_URL,
    areaId: area.id,
    personaId: persona.id,
    personaInstitucionalId: persona.personaInstitucionalId,
    numeroEmpleado,
    correlationId,
    created: persona,
    updated: updated.body,
    finishedAt: new Date().toISOString(),
  };

  writeFileSync(path.join(outputDir, '00-summary.json'), JSON.stringify(summary, null, 2));
  cleanup({
    personaId: persona.id,
    personaInstitucionalId: persona.personaInstitucionalId,
    numeroEmpleado,
  });
  log(`PASS. Evidencia: ${path.join(outputDir, '00-summary.json')}`);
}

main().catch((error) => fail(error?.stack || error?.message || String(error)));
