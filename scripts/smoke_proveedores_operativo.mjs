#!/usr/bin/env node
import { randomUUID, createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const ENV_PATH = path.join(ROOT, '.env');
const OUTPUT_ROOT = path.join(ROOT, 'installer-output', 'smoke-proveedores-operativo');
const BACKEND_URL = process.env.ERP_SMOKE_BACKEND_URL || 'http://localhost:13000';
const KEYCLOAK_URL = process.env.ERP_SMOKE_KEYCLOAK_URL || 'http://localhost:18080';

function fail(message) {
  console.error(`[erp-gob][smoke-proveedores][error] ${message}`);
  process.exit(1);
}

function log(message) {
  console.log(`[erp-gob][smoke-proveedores] ${message}`);
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
  if (raw) args.push('-t', '-A');

  const result = spawnSync('docker', args, { input: sql, encoding: 'utf8' });
  if (result.status !== 0) {
    fail(`psql fallo.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
  }
  return result.stdout.trim();
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

function requireArray(response, label) {
  if (!Array.isArray(response?.body)) {
    throw new Error(`${label} no devolvio arreglo.`);
  }
  return response.body;
}

function requireItems(response, label) {
  if (!response?.body || !Array.isArray(response.body.items)) {
    throw new Error(`${label} no devolvio contrato { items: [] }`);
  }
  return response.body.items;
}

function requireRecord(response, label) {
  if (!response?.body || typeof response.body !== 'object' || Array.isArray(response.body)) {
    throw new Error(`${label} no devolvio objeto.`);
  }
  return response.body;
}

function requireOptionalRecord(response, label) {
  if (response.ok) {
    return requireRecord(response, label);
  }
  if (response.status === 404) {
    return null;
  }
  throw new Error(`${label} fallo con ${response.status}: ${JSON.stringify(response.body)}`);
}

function requireOptionalArray(response, label) {
  if (response.ok) {
    return requireArray(response, label);
  }
  if (response.status === 404) {
    return [];
  }
  throw new Error(`${label} fallo con ${response.status}: ${JSON.stringify(response.body)}`);
}

function buildSmokeRfc(suffix) {
  const normalized = suffix.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(-3).padStart(3, 'X');
  return `SMK010101${normalized}`;
}

function cleanup({ providerId, personaId, correlationIds }) {
  if (!providerId || process.env.ERP_SMOKE_KEEP_DATA === 'true') {
    if (providerId) log(`Conservando proveedor de prueba por ERP_SMOKE_KEEP_DATA=true: ${providerId}`);
    return;
  }

  const correlationFilter = correlationIds.length
    ? correlationIds.map((item) => `'${sqlQuote(item)}'`).join(', ')
    : 'NULL';
  const personaDelete = personaId
    ? `DELETE FROM persona_fisica_catalogo WHERE id = '${sqlQuote(personaId)}';`
    : '';

  runPsql(`
    BEGIN;
    DELETE FROM proveedor_scoring_applied_event WHERE proveedor_id = '${sqlQuote(providerId)}';
    DELETE FROM outbox_event
    WHERE aggregate_id = '${sqlQuote(providerId)}'
       OR correlation_id IN (${correlationFilter})
       OR payload::text LIKE '%${sqlQuote(providerId)}%';
    DELETE FROM bitacora
    WHERE entidad_id = '${sqlQuote(providerId)}'
       OR correlation_id IN (${correlationFilter});
    DELETE FROM alerta
    WHERE entidad_id = '${sqlQuote(providerId)}'
       OR correlation_id IN (${correlationFilter});
    DELETE FROM proveedor_scoring_snapshot WHERE proveedor_id = '${sqlQuote(providerId)}';
    DELETE FROM proveedor_score_evento WHERE proveedor_id = '${sqlQuote(providerId)}';
    DELETE FROM proveedor_score WHERE proveedor_id = '${sqlQuote(providerId)}';
    DELETE FROM proveedor_score_actual WHERE proveedor_id = '${sqlQuote(providerId)}';
    DELETE FROM proveedor_desempeno_evento WHERE proveedor_id = '${sqlQuote(providerId)}';
    ALTER TABLE proveedor_estado_historial DISABLE TRIGGER USER;
    DELETE FROM proveedor_estado_historial WHERE proveedor_id = '${sqlQuote(providerId)}';
    ALTER TABLE proveedor_estado_historial ENABLE TRIGGER USER;
    DELETE FROM proveedor_declaracion_formal WHERE proveedor_id = '${sqlQuote(providerId)}';
    DELETE FROM proveedor_cuenta_bancaria WHERE proveedor_id = '${sqlQuote(providerId)}';
    DELETE FROM proveedor_domicilio WHERE proveedor_id = '${sqlQuote(providerId)}';
    DELETE FROM proveedor_persona_relacion WHERE proveedor_id = '${sqlQuote(providerId)}';
    DELETE FROM proveedor_padron WHERE proveedor_id = '${sqlQuote(providerId)}';
    DELETE FROM proveedor WHERE id = '${sqlQuote(providerId)}';
    ${personaDelete}
    COMMIT;
  `);
}

async function main() {
  const env = parseEnv(ENV_PATH);
  const token = await getToken(env);
  const timestamp = new Date().toISOString().replaceAll(':', '-');
  const outputDir = path.join(OUTPUT_ROOT, timestamp);
  mkdirSync(outputDir, { recursive: true });

  const runId = randomUUID();
  const suffix = runId.replaceAll('-', '').slice(0, 3).toUpperCase();
  const rfc = buildSmokeRfc(suffix);
  const numericSuffix = String(Date.now()).slice(-8);
  const correlationIds = [];
  const nextCorrelationId = () => {
    const correlationId = randomUUID();
    correlationIds.push(correlationId);
    return correlationId;
  };
  const createdIds = { proveedorId: null, personaId: null };

  try {
    log(`Creando proveedor operativo ${rfc}`);

    const requirements = requireArray(
      await api('/proveedores/padron/requisitos', token, nextCorrelationId()),
      'GET /proveedores/padron/requisitos',
    );
    const requiredDocs = requirements
      .filter((item) => item && item.required !== false && typeof item.key === 'string')
      .map((item) => item.key.trim().toUpperCase())
      .filter(Boolean);
    const documentosPresentados = requiredDocs.length > 0
      ? requiredDocs
      : ['CONSTANCIA_SITUACION_FISCAL', 'OPINION_CUMPLIMIENTO', 'IDENTIFICACION_REPRESENTANTE'];

    const proveedor = await api('/proveedores', token, nextCorrelationId(), {
      method: 'POST',
      body: JSON.stringify({
        razon_social: `Smoke Proveedor Operativo ${suffix} SA de CV`,
        rfc,
        estatus: 'ACTIVO',
      }),
    });
    createdIds.proveedorId = proveedor.body.id;
    writeFileSync(path.join(outputDir, '01-proveedor-create.json'), JSON.stringify(proveedor, null, 2));

    const listByRfc = requireItems(
      await api(`/proveedores?rfc=${encodeURIComponent(rfc)}`, token, nextCorrelationId()),
      'GET /proveedores?rfc',
    );
    if (!listByRfc.some((item) => item.id === proveedor.body.id)) {
      throw new Error('El proveedor creado no aparece en el listado filtrado por RFC.');
    }

    const detail = requireRecord(await api(`/proveedores/${proveedor.body.id}`, token, nextCorrelationId()), 'GET /proveedores/{id}');
    if (detail.rfc !== rfc) throw new Error('El detalle del proveedor no conserva el RFC creado.');

    const updated = requireRecord(
      await api(`/proveedores/${proveedor.body.id}`, token, nextCorrelationId(), {
        method: 'PATCH',
        body: JSON.stringify({ razon_social: `Smoke Proveedor Operativo ${suffix} Actualizado SA de CV` }),
      }),
      'PATCH /proveedores/{id}',
    );
    if (!updated.razon_social.includes('Actualizado')) throw new Error('No se reflejo la actualizacion del proveedor.');

    const padron = requireRecord(
      await api(`/proveedores/${proveedor.body.id}/padron`, token, nextCorrelationId(), {
        method: 'POST',
        body: JSON.stringify({
          rfc,
          razon_social: updated.razon_social,
          tipo_proveedor: null,
          documentos_presentados: documentosPresentados,
          fecha_registro: new Date().toISOString(),
        }),
      }),
      'POST /proveedores/{id}/padron',
    );
    if (padron.estatus !== 'ACTIVO') throw new Error('El padron no quedo ACTIVO.');

    const contact = requireRecord(
      await api(`/proveedores/${proveedor.body.id}/contactos`, token, nextCorrelationId(), {
        method: 'POST',
        body: JSON.stringify({
          nombre: 'Contacto',
          apellido_paterno: 'Smoke',
          apellido_materno: 'Proveedor',
          tipo_relacion: 'REPRESENTANTE_LEGAL',
          porcentaje_participacion: 60,
          es_controlador: true,
          vigente: true,
        }),
      }),
      'POST /proveedores/{id}/contactos',
    );
    createdIds.personaId = contact.persona_id ?? contact.persona?.id ?? null;

    const contactUpdated = requireRecord(
      await api(`/proveedores/${proveedor.body.id}/contactos/${contact.id}`, token, nextCorrelationId(), {
        method: 'PATCH',
        body: JSON.stringify({ porcentaje_participacion: 55, vigente: true }),
      }),
      'PATCH /proveedores/{id}/contactos/{relacionId}',
    );
    if (Number(contactUpdated.porcentaje_participacion) !== 55) {
      throw new Error('No se actualizo el porcentaje de participacion del contacto.');
    }

    const domicilio = requireRecord(
      await api(`/proveedores/${proveedor.body.id}/domicilios`, token, nextCorrelationId(), {
        method: 'POST',
        body: JSON.stringify({
          tipo: 'FISCAL',
          calle: 'Calle Smoke',
          numero: '100',
          colonia: 'Centro',
          municipio: 'Oaxaca de Juarez',
          estado: 'Oaxaca',
          cp: '68000',
        }),
      }),
      'POST /proveedores/{id}/domicilios',
    );
    const domicilioUpdated = requireRecord(
      await api(`/proveedores/${proveedor.body.id}/domicilios/${domicilio.id}`, token, nextCorrelationId(), {
        method: 'PATCH',
        body: JSON.stringify({ numero: '101' }),
      }),
      'PATCH /proveedores/{id}/domicilios/{domicilioId}',
    );
    if (domicilioUpdated.numero !== '101') throw new Error('No se actualizo el domicilio del proveedor.');

    const cuenta = requireRecord(
      await api(`/proveedores/${proveedor.body.id}/cuentas-bancarias`, token, nextCorrelationId(), {
        method: 'POST',
        body: JSON.stringify({
          banco: 'Banco Smoke',
          beneficiario: updated.razon_social,
          numero_cuenta: `1002${numericSuffix}`,
          moneda: 'MXN',
          es_principal: true,
          activa: true,
        }),
      }),
      'POST /proveedores/{id}/cuentas-bancarias',
    );
    const cuentaUpdated = requireRecord(
      await api(`/proveedores/${proveedor.body.id}/cuentas-bancarias/${cuenta.id}`, token, nextCorrelationId(), {
        method: 'PATCH',
        body: JSON.stringify({ banco: 'Banco Smoke Actualizado', activa: true }),
      }),
      'PATCH /proveedores/{id}/cuentas-bancarias/{cuentaId}',
    );
    if (!cuentaUpdated.banco.includes('Actualizado')) throw new Error('No se actualizo la cuenta bancaria.');

    const declarationHash = createHash('sha256').update(`smoke-proveedor-${runId}`).digest('hex');
    const declaracion = requireRecord(
      await api(`/proveedores/${proveedor.body.id}/declaraciones`, token, nextCorrelationId(), {
        method: 'POST',
        body: JSON.stringify({
          tipo: 'NO_INHABILITACION',
          documento_hash: declarationHash,
          fecha_declaracion: new Date().toISOString(),
          vigente: true,
        }),
      }),
      'POST /proveedores/{id}/declaraciones',
    );
    if (declaracion.documento_hash !== declarationHash) throw new Error('La declaracion no conserva el hash enviado.');

    const readModels = {
      padron: requireRecord(await api(`/proveedores/${proveedor.body.id}/padron`, token, nextCorrelationId()), 'GET /proveedores/{id}/padron'),
      workflow: requireRecord(await api(`/proveedores/${proveedor.body.id}/workflow`, token, nextCorrelationId()), 'GET /proveedores/{id}/workflow'),
      contactos: requireArray(await api(`/proveedores/${proveedor.body.id}/contactos`, token, nextCorrelationId()), 'GET /proveedores/{id}/contactos'),
      domicilios: requireArray(await api(`/proveedores/${proveedor.body.id}/domicilios`, token, nextCorrelationId()), 'GET /proveedores/{id}/domicilios'),
      cuentas: requireArray(await api(`/proveedores/${proveedor.body.id}/cuentas-bancarias`, token, nextCorrelationId()), 'GET /proveedores/{id}/cuentas-bancarias'),
      documentos: requireArray(await api(`/proveedores/${proveedor.body.id}/documentos`, token, nextCorrelationId()), 'GET /proveedores/{id}/documentos'),
      declaraciones: requireArray(await api(`/proveedores/${proveedor.body.id}/declaraciones`, token, nextCorrelationId()), 'GET /proveedores/{id}/declaraciones'),
      relaciones: requireRecord(await api(`/proveedores/${proveedor.body.id}/relaciones`, token, nextCorrelationId()), 'GET /proveedores/{id}/relaciones'),
      alertas: requireArray(await api(`/proveedores/${proveedor.body.id}/alertas?limit=10`, token, nextCorrelationId()), 'GET /proveedores/{id}/alertas'),
      score: requireOptionalRecord(
        await api(`/proveedores/${proveedor.body.id}/score`, token, nextCorrelationId(), { allowFailure: true }),
        'GET /proveedores/{id}/score',
      ),
      scoreHistorial: requireOptionalArray(
        await api(`/proveedores/${proveedor.body.id}/score/historial?limit=10`, token, nextCorrelationId(), { allowFailure: true }),
        'GET /proveedores/{id}/score/historial',
      ),
      desempeno: requireOptionalRecord(
        await api(`/proveedores/${proveedor.body.id}/desempeno`, token, nextCorrelationId(), { allowFailure: true }),
        'GET /proveedores/{id}/desempeno',
      ),
      desempenoEventos: requireOptionalArray(
        await api(`/proveedores/${proveedor.body.id}/desempeno/eventos?limit=10`, token, nextCorrelationId(), { allowFailure: true }),
        'GET /proveedores/{id}/desempeno/eventos',
      ),
    };

    if (readModels.contactos.length < 1) throw new Error('No se listan contactos del proveedor.');
    if (readModels.domicilios.length < 1) throw new Error('No se listan domicilios del proveedor.');
    if (readModels.cuentas.length < 1) throw new Error('No se listan cuentas bancarias del proveedor.');
    if (readModels.declaraciones.length < 1) throw new Error('No se listan declaraciones del proveedor.');
    if (!Array.isArray(readModels.workflow.stages)) throw new Error('Workflow de proveedor no trae stages.');
    if (!Array.isArray(readModels.relaciones.personas)) throw new Error('Relaciones de proveedor no trae personas.');

    const summary = {
      outputDir,
      proveedor: {
        id: proveedor.body.id,
        rfc,
        razonSocial: updated.razon_social,
      },
      padron: {
        id: readModels.padron.id,
        estatus: readModels.padron.estatus,
        documentosPresentados,
        fechaVigenciaDocumentos: readModels.padron.fecha_vigencia_documentos,
      },
      counts: {
        contactos: readModels.contactos.length,
        domicilios: readModels.domicilios.length,
        cuentas: readModels.cuentas.length,
        documentos: readModels.documentos.length,
        declaraciones: readModels.declaraciones.length,
        alertas: readModels.alertas.length,
        scoreHistorial: readModels.scoreHistorial.length,
        desempenoEventos: readModels.desempenoEventos.length,
      },
      optionalReadModels: {
        scoreActualDisponible: Boolean(readModels.score),
        desempenoDisponible: Boolean(readModels.desempeno),
      },
      workflow: {
        state: readModels.workflow.workflow_state,
        habilitadoParaOperar: readModels.workflow.habilitado_para_operar,
        nextActions: readModels.workflow.next_actions ?? [],
      },
    };

    writeFileSync(path.join(outputDir, '02-read-models.json'), JSON.stringify(readModels, null, 2));
    writeFileSync(path.join(outputDir, '00-summary.json'), JSON.stringify(summary, null, 2));
    log(`PASS. Evidencia: ${path.join(outputDir, '00-summary.json')}`);
  } finally {
    cleanup({
      providerId: createdIds.proveedorId,
      personaId: createdIds.personaId,
      correlationIds,
    });
  }
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
