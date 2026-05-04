#!/usr/bin/env node
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { randomBytes } from 'node:crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const ENV_PATH = path.join(ROOT, '.env');
const EXAMPLE_ENV_PATH = path.join(ROOT, '.env.example');
const OUTPUT_DIR = path.join(ROOT, 'installer-output');
const INSTALL_LOG_PATH = path.join(OUTPUT_DIR, 'install.log');
const INSTALL_REPORT_PATH = path.join(OUTPUT_DIR, 'install-report.json');
const VERSION = 'v1.19.1';
const SERVICES = ['backend', 'frontend', 'keycloak', 'postgres', 'redis', 'minio'];

let activeReport = null;

function ensureOutputDir() {
  mkdirSync(OUTPUT_DIR, { recursive: true });
}

function writeStructuredLog(level, message) {
  ensureOutputDir();
  appendFileSync(INSTALL_LOG_PATH, `${new Date().toISOString()} ${level} ${message}\n`);
}

function writeReport(partial) {
  activeReport = { ...(activeReport ?? {}), ...partial };
  ensureOutputDir();
  writeFileSync(INSTALL_REPORT_PATH, JSON.stringify(activeReport, null, 2));
}

function log(message) {
  writeStructuredLog('INFO', message);
  console.log(`[erp-gob] ${message}`);
}

function warn(message) {
  writeStructuredLog('WARN', message);
  console.warn(`[erp-gob][warn] ${message}`);
}

function die(message) {
  writeStructuredLog('ERROR', message);
  if (activeReport) {
    writeReport({ result: 'FAILURE', error: message, finishedAt: new Date().toISOString() });
  }
  console.error(`[erp-gob][error] ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) {
      args._.push(token);
      continue;
    }
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      args[key] = true;
      continue;
    }
    args[key] = next;
    i += 1;
  }
  return args;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    stdio: 'inherit',
    env: { ...process.env, ...(options.env ?? {}) },
    shell: false,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function capture(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env, ...(options.env ?? {}) },
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function ensureCommands() {
  ['docker', 'git', 'curl', 'node', 'lsof'].forEach((command) => {
    try {
      capture('which', [command]);
    } catch {
      die(`Falta comando requerido: ${command}`);
    }
  });
}

function parseNodeMajorVersion(rawVersion) {
  const match = /^v(\d+)/.exec(rawVersion.trim());
  return match ? Number(match[1]) : NaN;
}

function assertNodeVersion() {
  const version = capture('node', ['-v']);
  const major = parseNodeMajorVersion(version);
  if (!Number.isFinite(major) || major < 18) {
    die(`Node.js >= 18 es requerido. Versión detectada: ${version}`);
  }
  return version;
}

async function assertPortsAvailable() {
  const requiredPorts = [80, 443];
  const advisoryPorts = [8080, 9000, 5432];
  const unavailable = [];
  const advisoryBusy = [];
  for (const port of [...requiredPorts, ...advisoryPorts]) {
    try {
      capture('lsof', ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN']);
      if (requiredPorts.includes(port)) {
        unavailable.push(port);
      } else {
        advisoryBusy.push(port);
      }
    } catch {
      // port is free when lsof exits non-zero
    }
  }
  if (unavailable.length > 0) {
    die(`Puertos ocupados: ${unavailable.join(', ')}. Libéralos antes de instalar.`);
  }
  if (advisoryBusy.length > 0) {
    warn(`Puertos detectados en uso (no bloqueantes para esta suite): ${advisoryBusy.join(', ')}`);
  }
}

async function runPreflight() {
  ensureCommands();
  const dockerVersion = capture('docker', ['--version']);
  const dockerComposeVersion = capture('docker', ['compose', 'version']);
  const nodeVersion = assertNodeVersion();
  await assertPortsAvailable();
  writeReport({
    docker: 'ok',
    dockerVersion,
    dockerCompose: dockerComposeVersion,
    nodeVersion,
  });
}

function parseEnvFile(filePath) {
  const content = readFileSync(filePath, 'utf8');
  const result = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const index = line.indexOf('=');
    if (index < 0) continue;
    const key = line.slice(0, index).trim();
    const value = line.slice(index + 1);
    result[key] = value;
  }
  return result;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || `${value}`.trim().length === 0) {
    return fallback;
  }

  const normalized = `${value}`.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }
  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }
  return fallback;
}

function normalizeTenantKey(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function randomSecret(length = 24) {
  return randomBytes(length).toString('base64url');
}

function profilePath(name) {
  return path.join(ROOT, 'profiles', `${name}.env`);
}

async function promptIfMissing(options) {
  if (options.yes) {
    return options;
  }

  const rl = readline.createInterface({ input, output });
  const next = { ...options };
  if (!next.profile) next.profile = (await rl.question('Perfil [demo/piloto/prod] (demo): ')).trim() || 'demo';
  if (!next['institution-name']) next['institution-name'] = (await rl.question('Nombre de la institución: ')).trim() || 'ERP-GOB Demo';
  if (!next['tenant-key']) next['tenant-key'] = (await rl.question('Clave tenant/subdominio: ')).trim() || 'demo';
  if (!next.state) next.state = (await rl.question('Estado o ámbito normativo: ')).trim() || 'Oaxaca';
  await rl.close();
  return next;
}

function buildInstallConfig(options) {
  const profile = options.profile || 'demo';
  const profileFile = profilePath(profile);
  if (!existsSync(profileFile)) {
    die(`Perfil inexistente: ${profile}`);
  }
  const base = parseEnvFile(EXAMPLE_ENV_PATH);
  const profileEnv = parseEnvFile(profileFile);
  const tenantKey = normalizeTenantKey(options['tenant-key'] || profileEnv.ERP_TENANT_KEY || 'demo');
  const baseDomain = options['base-domain'] || 'erp.gob.local';
  const appHost = `${tenantKey}.${baseDomain}`;
  const installProfile = profileEnv.INSTALL_PROFILE || profile;
  const isDemo = installProfile === 'demo';

  const env = {
    ...base,
    ...profileEnv,
    POSTGRES_PASSWORD: isDemo ? 'erp_demo_postgres' : randomSecret(18),
    KEYCLOAK_ADMIN_PASSWORD: isDemo ? 'erp_demo_keycloak' : randomSecret(18),
    KEYCLOAK_DB_PASSWORD: isDemo ? 'erp_demo_keycloak_db' : randomSecret(18),
    MINIO_ROOT_PASSWORD: isDemo ? 'erp_demo_minio' : randomSecret(18),
    KEYCLOAK_API_CLIENT_SECRET: isDemo ? 'erp_demo_api_secret' : randomSecret(24),
    KEYCLOAK_API_DIRECT_GRANTS:
      options['api-direct-grants']
      ?? profileEnv.KEYCLOAK_API_DIRECT_GRANTS
      ?? (isDemo ? 'true' : 'false'),
    KEYCLOAK_BACKEND_CLIENT_SECRET: isDemo ? 'erp_demo_backend_secret' : randomSecret(24),
    ERP_FRONTEND_TESTER_PASSWORD: isDemo ? 'Frontend123!' : randomSecret(12),
    ERP_CAPTURISTA_PASSWORD: isDemo ? 'Capturista123!' : randomSecret(12),
    ERP_REVISOR_PASSWORD: isDemo ? 'Revisor123!' : randomSecret(12),
    ERP_FINANZAS_PASSWORD: isDemo ? 'Finanzas123!' : randomSecret(12),
    ERP_OIC_PASSWORD: isDemo ? 'Oic123456!' : randomSecret(12),
    ERP_ADMIN_PASSWORD: isDemo ? 'Admin123456!' : randomSecret(12),
    APP_URL: options['app-url'] || `https://${appHost}`,
    API_URL: `https://api.${baseDomain}`,
    KEYCLOAK_PUBLIC_URL: `https://auth.${baseDomain}`,
    APP_ALLOWED_ORIGINS: options['allowed-origins'] || `https://${appHost},https://${baseDomain}`,
    INSTALL_PROFILE: installProfile,
    ERP_INSTITUTION_NAME: options['institution-name'] || profileEnv.ERP_INSTITUTION_NAME || 'ERP-GOB',
    ERP_TENANT_KEY: tenantKey,
    ERP_INSTITUTION_STATE: options.state || profileEnv.ERP_INSTITUTION_STATE || 'Oaxaca',
    ERP_NORMATIVE_LAW: options.law || profileEnv.ERP_NORMATIVE_LAW || `Ley de Adquisiciones del Estado de ${options.state || profileEnv.ERP_INSTITUTION_STATE || 'Oaxaca'}`,
    ERP_NORMATIVE_LICITACION_THRESHOLD: options['licitacion-threshold'] || profileEnv.ERP_NORMATIVE_LICITACION_THRESHOLD || '1200000',
    ERP_NORMATIVE_INVITACION_THRESHOLD: options['invitacion-threshold'] || profileEnv.ERP_NORMATIVE_INVITACION_THRESHOLD || '350000',
    ERP_BRANDING_NAME: options['branding-name'] || profileEnv.ERP_BRANDING_NAME || options['institution-name'] || 'ERP-GOB',
    ERP_BRANDING_PRIMARY_COLOR: options['primary-color'] || profileEnv.ERP_BRANDING_PRIMARY_COLOR || '#0B2D4F',
    ERP_BRANDING_SECONDARY_COLOR: options['secondary-color'] || profileEnv.ERP_BRANDING_SECONDARY_COLOR || '#C39A35',
    ERP_BRANDING_LOGO_URL: options['logo-url'] || profileEnv.ERP_BRANDING_LOGO_URL || '',
    ERP_ACTIVE_MODULES: options.modules || profileEnv.ERP_ACTIVE_MODULES || 'CONTRACTUAL,INVENTARIO,PATRIMONIAL,OBSERVABILIDAD,FINANZAS',
    ERP_UNIT_NAME: options['unit-name'] || profileEnv.ERP_UNIT_NAME || 'Dirección General de Administración',
    ERP_AREA_NAME: options['area-name'] || profileEnv.ERP_AREA_NAME || 'Área Solicitante',
    ERP_AREA_TYPE: options['area-type'] || profileEnv.ERP_AREA_TYPE || 'ADMINISTRATIVA',
  };

  return {
    profile: installProfile,
    tenantKey,
    baseDomain,
    appHost,
    env,
  };
}

function renderEnv(env) {
  const orderedKeys = [
    'POSTGRES_USER','POSTGRES_PASSWORD','POSTGRES_DB',
    'KEYCLOAK_ADMIN','KEYCLOAK_ADMIN_PASSWORD','KEYCLOAK_DB_USER','KEYCLOAK_DB_PASSWORD',
    'MINIO_ROOT_USER','MINIO_ROOT_PASSWORD','MINIO_PUBLIC_URL',
    'APP_URL','API_URL','KEYCLOAK_PUBLIC_URL','FRONTEND_KEYCLOAK_PUBLIC_URL','KEYCLOAK_REALM','KEYCLOAK_CLIENT_ID','KEYCLOAK_API_CLIENT_ID','KEYCLOAK_API_CLIENT_SECRET','KEYCLOAK_API_DIRECT_GRANTS','KEYCLOAK_BACKEND_CLIENT_SECRET','FRONTEND_CSRF_MODE','APP_ALLOWED_ORIGINS',
    'ERP_FRONTEND_TESTER_PASSWORD','ERP_CAPTURISTA_PASSWORD','ERP_REVISOR_PASSWORD','ERP_FINANZAS_PASSWORD','ERP_OIC_PASSWORD','ERP_ADMIN_PASSWORD',
    'INSTALL_PROFILE','ERP_INSTITUTION_NAME','ERP_TENANT_KEY','ERP_INSTITUTION_STATE','ERP_NORMATIVE_LAW','ERP_NORMATIVE_LICITACION_THRESHOLD','ERP_NORMATIVE_INVITACION_THRESHOLD','ERP_BRANDING_NAME','ERP_BRANDING_PRIMARY_COLOR','ERP_BRANDING_SECONDARY_COLOR','ERP_BRANDING_LOGO_URL','ERP_ACTIVE_MODULES','ERP_UNIT_NAME','ERP_AREA_NAME','ERP_AREA_TYPE',
  ];
  return `${orderedKeys.map((key) => `${key}=${env[key] ?? ''}`).join('\n')}\n`;
}

function normalizeOrigin(rawValue) {
  try {
    return new URL(rawValue).origin;
  } catch {
    return null;
  }
}

function parseOriginList(rawValue) {
  if (typeof rawValue !== 'string' || rawValue.trim().length === 0) {
    return [];
  }

  return unique(
    rawValue
      .split(/[,\s]+/)
      .map((value) => normalizeOrigin(value))
      .filter(Boolean),
  );
}

function isLocalPublicUrl(value) {
  if (!value) return true;
  try {
    const hostname = new URL(value).hostname.trim().toLowerCase();
    return hostname === 'localhost' || hostname === '127.0.0.1';
  } catch {
    return true;
  }
}

function resolveBaseDomain(env) {
  const fromKeycloak = normalizeOrigin(env.KEYCLOAK_PUBLIC_URL);
  if (fromKeycloak) {
    const host = new URL(fromKeycloak).hostname;
    if (host.startsWith('auth.') && host.length > 'auth.'.length) {
      return host.slice('auth.'.length);
    }
  }

  const fromApp = normalizeOrigin(env.APP_URL);
  if (fromApp) {
    const host = new URL(fromApp).hostname;
    const parts = host.split('.');
    if (parts.length >= 3) {
      return parts.slice(1).join('.');
    }
  }

  return 'erp.gob.local';
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function resolveKeycloakPublicUrl(env) {
  const configured = normalizeOrigin(env.KEYCLOAK_PUBLIC_URL);
  if (configured) {
    return configured.replace(/\/+$/, '');
  }

  return `https://auth.${resolveBaseDomain(env)}`;
}

function buildCurlResolveArgs(url) {
  const parsed = new URL(url);
  if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
    return [];
  }

  const port = parsed.port || (parsed.protocol === 'https:' ? '443' : '80');
  return ['--resolve', `${parsed.hostname}:${port}:127.0.0.1`];
}

function isLocalhostUrl(value) {
  const origin = normalizeOrigin(value);
  if (!origin) return false;

  try {
    const parsed = new URL(origin);
    return parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

function captureHttp(url, { method = 'GET', headers = {}, body, includeHeaders = false } = {}) {
  const parsed = new URL(url);
  const args = ['-sS'];

  if (includeHeaders) {
    args.push('-I');
  }

  if (parsed.protocol === 'https:') {
    args.push('-k');
  }

  args.push(...buildCurlResolveArgs(url));

  if (!includeHeaders && method !== 'GET') {
    args.push('-X', method);
  }

  Object.entries(headers).forEach(([key, value]) => {
    args.push('-H', `${key}: ${value}`);
  });

  if (body !== undefined) {
    args.push('--data-raw', typeof body === 'string' ? body : JSON.stringify(body));
  }

  args.push('-w', '__HTTP_STATUS__%{http_code}', url);

  const raw = capture('curl', args);
  const marker = '__HTTP_STATUS__';
  const markerIndex = raw.lastIndexOf(marker);
  const payload = markerIndex >= 0 ? raw.slice(0, markerIndex) : raw;
  const status = markerIndex >= 0 ? Number(raw.slice(markerIndex + marker.length)) : 0;

  let json = null;
  try {
    json = payload ? JSON.parse(payload) : null;
  } catch {
    json = null;
  }

  return { status, payload, json };
}

function shouldEnableApiDirectGrants(env) {
  return parseBoolean(env.KEYCLOAK_API_DIRECT_GRANTS, (env.INSTALL_PROFILE || '').trim() === 'demo');
}

function buildAudienceMapper(name, audience) {
  return {
    name,
    protocol: 'openid-connect',
    protocolMapper: 'oidc-audience-mapper',
    consentRequired: false,
    config: {
      'included.client.audience': audience,
      'id.token.claim': 'false',
      'access.token.claim': 'true',
    },
  };
}

function buildRealmRolesMapper() {
  return {
    name: 'realm-roles',
    protocol: 'openid-connect',
    protocolMapper: 'oidc-usermodel-realm-role-mapper',
    consentRequired: false,
    config: {
      multivalued: 'true',
      'userinfo.token.claim': 'false',
      'id.token.claim': 'false',
      'access.token.claim': 'true',
      'claim.name': 'realm_access.roles',
      'jsonType.label': 'String',
    },
  };
}

function mergeProtocolMappers(existing = [], desired = []) {
  const byName = new Map(existing.map((mapper) => [mapper.name, mapper]));
  desired.forEach((mapper) => {
    byName.set(mapper.name, mapper);
  });
  return Array.from(byName.values());
}

function buildFrontendClientConfig(env) {
  const tenantKey = normalizeTenantKey(env.ERP_TENANT_KEY || 'demo');
  const baseDomain = resolveBaseDomain(env);
  const origins = [];
  const installProfile = String(env.INSTALL_PROFILE || '').trim().toLowerCase();

  const addOrigin = (value) => {
    const origin = normalizeOrigin(value);
    if (origin) {
      origins.push(origin);
    }
  };

  addOrigin(env.APP_URL);
  parseOriginList(env.APP_ALLOWED_ORIGINS).forEach(addOrigin);
  addOrigin(`https://${baseDomain}`);
  if (tenantKey.length > 0) {
    addOrigin(`https://${tenantKey}.${baseDomain}`);
  }
  if (installProfile === 'demo') {
    addOrigin('http://localhost:3100');
    addOrigin('http://localhost:13001');
  }

  const explicitOrigins = unique(origins);
  const wildcardOrigin = `https://*.${baseDomain}`;
  const webOrigins = unique([...explicitOrigins, wildcardOrigin]);
  const redirectUris = unique([...explicitOrigins.map((origin) => `${origin}/*`), `${wildcardOrigin}/*`]);

  return {
    baseDomain,
    redirectUris,
    webOrigins,
    postLogoutRedirectUris: redirectUris.join(' '),
  };
}

function ensureHosts(config, skipHosts = false) {
  if (skipHosts) {
    warn('Se omite modificación de /etc/hosts por opción del usuario.');
    return;
  }

  const hostsPath = '/etc/hosts';
  const markerStart = '# ERP-GOB HOSTS START';
  const markerEnd = '# ERP-GOB HOSTS END';
  const hosts = [
    config.baseDomain,
    `api.${config.baseDomain}`,
    `auth.${config.baseDomain}`,
    config.appHost,
  ];
  const block = `${markerStart}\n127.0.0.1 ${Array.from(new Set(hosts)).join(' ')}\n${markerEnd}`;

  try {
    const current = existsSync(hostsPath) ? readFileSync(hostsPath, 'utf8') : '';
    const cleaned = current.replace(new RegExp(`${markerStart}[\\s\\S]*?${markerEnd}\\n?`, 'g'), '').trimEnd();
    const next = `${cleaned}\n\n${block}\n`;
    writeFileSync(hostsPath, next, 'utf8');
    log(`/etc/hosts actualizado para ${config.appHost}`);
  } catch (error) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
    const instructionPath = path.join(OUTPUT_DIR, 'hosts.patch');
    writeFileSync(instructionPath, `${block}\n`, 'utf8');
    warn(`No fue posible escribir /etc/hosts. Se generó ${instructionPath}`);
  }
}

function composeUp() {
  run('docker', ['compose', 'up', '--build', '-d']);
}

async function getKeycloakAdminToken(env, tries = 60) {
  const keycloakPublicUrl = resolveKeycloakPublicUrl(env);
  const username = env.KEYCLOAK_ADMIN || 'admin';
  const password = env.KEYCLOAK_ADMIN_PASSWORD;

  if (!password) {
    die('Falta KEYCLOAK_ADMIN_PASSWORD para reconciliar el cliente OIDC.');
  }

  const body = new URLSearchParams({
    client_id: 'admin-cli',
    username,
    password,
    grant_type: 'password',
  });

  for (let attempt = 1; attempt <= tries; attempt += 1) {
    try {
      const response = captureHttp(`${keycloakPublicUrl}/realms/master/protocol/openid-connect/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });

      if (response.status >= 200 && response.status < 300) {
        const payload = response.json;
        if (payload?.access_token) {
          return payload.access_token;
        }
      }
    } catch {
      // retry until Keycloak becomes ready
    }

    await sleep(1_000);
  }

  die('Timeout autenticando contra Keycloak Admin API.');
}

async function getKeycloakClient(env, clientId) {
  const keycloakPublicUrl = resolveKeycloakPublicUrl(env);
  const realm = env.KEYCLOAK_REALM || 'erp';
  const accessToken = await getKeycloakAdminToken(env);
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };

  const clientResponse = captureHttp(
    `${keycloakPublicUrl}/admin/realms/${encodeURIComponent(realm)}/clients?clientId=${encodeURIComponent(clientId)}`,
    { headers },
  );

  if (!(clientResponse.status >= 200 && clientResponse.status < 300)) {
    die(`No fue posible consultar el cliente ${clientId} en Keycloak (${clientResponse.status}).`);
  }

  const clients = Array.isArray(clientResponse.json) ? clientResponse.json : [];
  const clientSummary = clients.find((entry) => entry.clientId === clientId) ?? clients[0];
  if (!clientSummary?.id) {
    die(`Cliente ${clientId} no encontrado en Keycloak.`);
  }

  const fullClientResponse = captureHttp(
    `${keycloakPublicUrl}/admin/realms/${encodeURIComponent(realm)}/clients/${clientSummary.id}`,
    { headers },
  );

  if (!(fullClientResponse.status >= 200 && fullClientResponse.status < 300)) {
    die(`No fue posible cargar la configuración completa del cliente ${clientId} (${fullClientResponse.status}).`);
  }

  const client = fullClientResponse.json;
  return { accessToken, headers, client, keycloakPublicUrl, realm };
}

async function getKeycloakRealm(env) {
  const keycloakPublicUrl = resolveKeycloakPublicUrl(env);
  const realm = env.KEYCLOAK_REALM || 'erp';
  const accessToken = await getKeycloakAdminToken(env);
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };

  const realmResponse = captureHttp(
    `${keycloakPublicUrl}/admin/realms/${encodeURIComponent(realm)}`,
    { headers },
  );

  if (!(realmResponse.status >= 200 && realmResponse.status < 300) || !realmResponse.json) {
    die(`No fue posible cargar la configuración del realm ${realm} en Keycloak (${realmResponse.status}).`);
  }

  return { accessToken, headers, realmConfig: realmResponse.json, keycloakPublicUrl, realm };
}

async function updateKeycloakClient({ keycloakPublicUrl, realm, headers, client, clientId }) {
  const updateResponse = captureHttp(
    `${keycloakPublicUrl}/admin/realms/${encodeURIComponent(realm)}/clients/${client.id}`,
    {
      method: 'PUT',
      headers,
      body: client,
    },
  );

  if (!(updateResponse.status >= 200 && updateResponse.status < 300)) {
    const reason = updateResponse.payload || 'sin detalle';
    die(`No fue posible reconciliar el cliente ${clientId} en Keycloak (${updateResponse.status}): ${reason}`);
  }
}

async function updateKeycloakRealm({ keycloakPublicUrl, realm, headers, realmConfig }) {
  const updateResponse = captureHttp(
    `${keycloakPublicUrl}/admin/realms/${encodeURIComponent(realm)}`,
    {
      method: 'PUT',
      headers,
      body: realmConfig,
    },
  );

  if (!(updateResponse.status >= 200 && updateResponse.status < 300)) {
    const reason = updateResponse.payload || 'sin detalle';
    die(`No fue posible reconciliar el realm ${realm} en Keycloak (${updateResponse.status}): ${reason}`);
  }
}

async function syncKeycloakRealm(env) {
  const { headers, realmConfig, keycloakPublicUrl, realm } = await getKeycloakRealm(env);
  const nextRealm = JSON.parse(JSON.stringify(realmConfig));
  const frontendUrl = resolveKeycloakPublicUrl(env);

  nextRealm.attributes = {
    ...(nextRealm.attributes ?? {}),
    frontendUrl,
  };

  await updateKeycloakRealm({ keycloakPublicUrl, realm, headers, realmConfig: nextRealm });

  log(`Realm Keycloak ${realm} reconciliado con frontendUrl ${frontendUrl}`);
}

async function syncKeycloakFrontendClient(env) {
  const clientId = env.KEYCLOAK_CLIENT_ID || 'erp-frontend';
  const { headers, client, keycloakPublicUrl, realm } = await getKeycloakClient(env, clientId);

  const { baseDomain, redirectUris, webOrigins, postLogoutRedirectUris } = buildFrontendClientConfig(env);
  const nextClient = JSON.parse(JSON.stringify(client));
  nextClient.redirectUris = redirectUris;
  nextClient.webOrigins = webOrigins;
  nextClient.attributes = {
    ...(nextClient.attributes ?? {}),
    'pkce.code.challenge.method': 'S256',
    'post.logout.redirect.uris': postLogoutRedirectUris,
  };

  await updateKeycloakClient({ keycloakPublicUrl, realm, headers, client: nextClient, clientId });

  log(
    `Cliente Keycloak ${clientId} reconciliado para ${baseDomain} (${redirectUris.join(', ')})`,
  );
}

async function syncKeycloakApiClient(env) {
  const clientId = env.KEYCLOAK_API_CLIENT_ID || 'erp-api';
  const { headers, client, keycloakPublicUrl, realm } = await getKeycloakClient(env, clientId);
  const nextClient = JSON.parse(JSON.stringify(client));
  const directGrantsEnabled = shouldEnableApiDirectGrants(env);

  nextClient.directAccessGrantsEnabled = directGrantsEnabled;
  nextClient.protocolMappers = mergeProtocolMappers(nextClient.protocolMappers ?? [], [
    buildAudienceMapper('audience-erp-api', clientId),
    buildAudienceMapper('audience-account', 'account'),
    buildRealmRolesMapper(),
  ]);

  await updateKeycloakClient({ keycloakPublicUrl, realm, headers, client: nextClient, clientId });

  log(
    `Cliente Keycloak ${clientId} reconciliado para API directa (direct grants ${directGrantsEnabled ? 'ON' : 'OFF'})`,
  );
}

async function syncKeycloakClients(env) {
  if (isLocalhostUrl(resolveKeycloakPublicUrl(env))) {
    const username = env.KEYCLOAK_ADMIN || 'admin';
    const password = env.KEYCLOAK_ADMIN_PASSWORD;
    if (!password) {
      die('Falta KEYCLOAK_ADMIN_PASSWORD para reconciliar Keycloak local.');
    }

    run('docker', [
      'compose', 'exec', '-T', 'keycloak',
      '/opt/keycloak/bin/kcadm.sh', 'config', 'credentials',
      '--server', 'http://localhost:8080',
      '--realm', 'master',
      '--user', username,
      '--password', password,
    ]);
    run('docker', [
      'compose', 'exec', '-T', 'keycloak',
      '/opt/keycloak/bin/kcadm.sh', 'update', 'realms/master',
      '-s', 'sslRequired=none',
    ]);
  }

  await syncKeycloakRealm(env);
  await syncKeycloakFrontendClient(env);
  await syncKeycloakApiClient(env);
}

function waitForUrl(url, expectedStatus, tries = 60) {
  for (let attempt = 1; attempt <= tries; attempt += 1) {
    try {
      const parsed = new URL(url);
      const args = [];
      if (parsed.protocol === 'https:') {
        args.push('-k');
      }
      args.push('-I', ...buildCurlResolveArgs(url), url);
      const headers = capture('curl', args, { env: { LC_ALL: 'C' } });
      if (headers.includes(`HTTP/2 ${expectedStatus}`) || headers.includes(`HTTP/1.1 ${expectedStatus}`)) {
        return;
      }
    } catch {}
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1000);
  }
  die(`Timeout esperando ${url} -> ${expectedStatus}`);
}

function runBootstrap(env) {
  run('docker', [
    'compose', 'exec', '-T', 'backend',
    'node', '/workspace/scripts/bootstrap_institution.mjs',
    '--institution-name', env.ERP_INSTITUTION_NAME,
    '--tenant-key', env.ERP_TENANT_KEY,
    '--state', env.ERP_INSTITUTION_STATE,
    '--law', env.ERP_NORMATIVE_LAW,
    '--licitacion-threshold', env.ERP_NORMATIVE_LICITACION_THRESHOLD,
    '--invitacion-threshold', env.ERP_NORMATIVE_INVITACION_THRESHOLD,
    '--app-url', env.APP_URL,
    '--branding-name', env.ERP_BRANDING_NAME,
    '--branding-logo-url', env.ERP_BRANDING_LOGO_URL || '',
    '--primary-color', env.ERP_BRANDING_PRIMARY_COLOR,
    '--secondary-color', env.ERP_BRANDING_SECONDARY_COLOR,
    '--modules', env.ERP_ACTIVE_MODULES,
    '--unit-name', env.ERP_UNIT_NAME,
    '--area-name', env.ERP_AREA_NAME,
    '--area-type', env.ERP_AREA_TYPE,
  ]);
}

function loadCurrentEnv() {
  if (!existsSync(ENV_PATH)) die('No existe .env. Ejecuta `erp-gob install` primero.');
  return parseEnvFile(ENV_PATH);
}

function reconcilePublicSurfaceEnv(env, options = {}) {
  const baseDomain = options['base-domain'] || 'erp.gob.local';

  const nextEnv = { ...env };

  if (options['app-url']) {
    nextEnv.APP_URL = options['app-url'];
  }

  if (options['api-url']) {
    nextEnv.API_URL = options['api-url'];
  }

  if (options['keycloak-public-url']) {
    nextEnv.KEYCLOAK_PUBLIC_URL = options['keycloak-public-url'];
  }

  if (options['allowed-origins']) {
    nextEnv.APP_ALLOWED_ORIGINS = options['allowed-origins'];
  } else {
    const configuredOrigins = (env.APP_ALLOWED_ORIGINS || '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
    const hasOnlyLocalOrigins =
      configuredOrigins.length === 0 ||
      configuredOrigins.every((origin) => {
        try {
          const hostname = new URL(origin).hostname.trim().toLowerCase();
          return hostname === 'localhost' || hostname === '127.0.0.1';
        } catch {
          return true;
        }
      });
    if (hasOnlyLocalOrigins && !isLocalPublicUrl(nextEnv.APP_URL)) {
      nextEnv.APP_ALLOWED_ORIGINS = `${nextEnv.APP_URL},https://${baseDomain}`;
    }
  }

  return nextEnv;
}

function persistEnvIfChanged(nextEnv) {
  const current = existsSync(ENV_PATH) ? readFileSync(ENV_PATH, 'utf8') : '';
  const rendered = renderEnv(nextEnv);
  if (current === rendered) {
    return false;
  }
  writeFileSync(ENV_PATH, rendered, 'utf8');
  return true;
}

function extractHost(url) {
  return new URL(url).host;
}

function validateInstalledStack(env) {
  ensureCommands();
  const ps = capture('docker', ['compose', 'ps']);
  ['backend', 'frontend', 'keycloak', 'postgres', 'redis', 'minio', 'proxy'].forEach((service) => {
    if (!ps.includes(`erp-suite-${service}`)) {
      die(`Servicio no encontrado en docker compose ps: ${service}`);
    }
  });
  const apiOrigin = normalizeOrigin(env.API_URL);
  waitForUrl(`${env.APP_URL}/login`, 200, 30);
  waitForUrl(`${apiOrigin || `https://${extractHost(env.API_URL)}`}/`, 404, 5);
  waitForUrl(`${resolveKeycloakPublicUrl(env)}/realms/${env.KEYCLOAK_REALM || 'erp'}/.well-known/openid-configuration`, 200, 30);

  const keycloakPublicUrl = resolveKeycloakPublicUrl(env);
  const expectedIssuer = `${keycloakPublicUrl}/realms/${env.KEYCLOAK_REALM || 'erp'}`;
  const wellKnown = captureHttp(`${expectedIssuer}/.well-known/openid-configuration`);
  if (wellKnown.json?.issuer !== expectedIssuer) {
    die(`Keycloak expone issuer inválido. Esperado: ${expectedIssuer}. Actual: ${wellKnown.json?.issuer || '<vacío>'}`);
  }
}

function smoke(env) {
  waitForUrl(`${env.APP_URL}/login`, 200, 30);
  const keycloakPublicUrl = resolveKeycloakPublicUrl(env);
  waitForUrl(`${keycloakPublicUrl}/realms/${env.KEYCLOAK_REALM || 'erp'}/.well-known/openid-configuration`, 200, 30);
  const expectedIssuer = `${keycloakPublicUrl}/realms/${env.KEYCLOAK_REALM || 'erp'}`;
  const wellKnown = captureHttp(`${expectedIssuer}/.well-known/openid-configuration`);
  if (wellKnown.json?.issuer !== expectedIssuer) {
    die(`Keycloak well-known publicó issuer inválido. Esperado: ${expectedIssuer}. Actual: ${wellKnown.json?.issuer || '<vacío>'}`);
  }
  const authorizationEndpoint = String(wellKnown.json?.authorization_endpoint || '');
  if (!authorizationEndpoint.startsWith(`${expectedIssuer}/protocol/openid-connect/auth`)) {
    die(`Keycloak well-known publicó authorization_endpoint inválido: ${authorizationEndpoint || '<vacío>'}`);
  }
  const authRedirect = capture('curl', ['-k', '-I', ...buildCurlResolveArgs(`${env.APP_URL}/api/auth/login`), `${env.APP_URL}/api/auth/login`]);
  if (!authRedirect.includes(`redirect_uri=${encodeURIComponent(`${env.APP_URL}/api/auth/callback`)}`)) {
    die('El redirect_uri OIDC no coincide con el origen público configurado.');
  }
  if (!authRedirect.includes(`${keycloakPublicUrl}/realms/${env.KEYCLOAK_REALM || 'erp'}/protocol/openid-connect/auth`)) {
    die('El login OIDC no está redirigiendo al host público configurado de Keycloak.');
  }
  const dashboard = capture('curl', ['-k', '-I', ...buildCurlResolveArgs(`${env.APP_URL}/dashboard`), `${env.APP_URL}/dashboard`]);
  if (!(dashboard.includes('HTTP/2 302') || dashboard.includes('HTTP/1.1 302'))) {
    die('Dashboard no redirigió a login sin sesión como se esperaba.');
  }
  log('Smoke post-install PASS');
}

async function cmdInstall(rawOptions) {
  ensureOutputDir();
  writeFileSync(INSTALL_LOG_PATH, '');
  const normalized = { ...rawOptions };
  if (!normalized.profile && normalized._[1] && !normalized._[1].startsWith('--')) {
    normalized.profile = normalized._[1];
    normalized.yes = true;
  }
  const options = await promptIfMissing(normalized);
  const config = buildInstallConfig(options);
  writeReport({
    version: VERSION,
    profile: config.profile,
    services: SERVICES,
    timestamp: new Date().toISOString(),
    result: 'RUNNING',
    appUrl: config.env.APP_URL,
    tenantKey: config.tenantKey,
  });
  await runPreflight();
  writeFileSync(ENV_PATH, renderEnv(config.env), 'utf8');
  writeFileSync(path.join(OUTPUT_DIR, 'install-summary.json'), JSON.stringify({ profile: config.profile, appUrl: config.env.APP_URL, tenantKey: config.tenantKey }, null, 2));
  ensureHosts(config, Boolean(options['skip-hosts']));
  run('git', ['submodule', 'update', '--init', '--recursive']);
  if (!options['skip-start']) {
    composeUp();
    await syncKeycloakClients(config.env);
    waitForUrl(`${config.env.APP_URL}/login`, 200, 60);
    runBootstrap(config.env);
    validateInstalledStack(config.env);
    if (!options['skip-smoke']) {
      smoke(config.env);
    }
  }
  writeReport({ result: 'SUCCESS', finishedAt: new Date().toISOString() });
  log(`Instalación completa. Acceso principal: ${config.env.APP_URL}`);
}

function cmdValidate() {
  const env = loadCurrentEnv();
  validateInstalledStack(env);
  log('Validación de instalación PASS');
}

function cmdSmoke() {
  const env = loadCurrentEnv();
  smoke(env);
}

function cmdSmokePatrimonialMultiArea() {
  loadCurrentEnv();
  run('node', [path.join(ROOT, 'scripts', 'smoke_patrimonial_multi_area.mjs')]);
}

function cmdSmokeAdminPersonas() {
  loadCurrentEnv();
  run('node', [path.join(ROOT, 'scripts', 'smoke_admin_personas.mjs')]);
}

function cmdSmokeMantenimiento() {
  loadCurrentEnv();
  run('node', [path.join(ROOT, 'scripts', 'smoke_mantenimiento_operativo.mjs')]);
}

function cmdSmokeInventarioGlobal() {
  loadCurrentEnv();
  run('node', [path.join(ROOT, 'scripts', 'smoke_inventario_global.mjs')]);
}

function cmdSmokeProveedores() {
  loadCurrentEnv();
  run('node', [path.join(ROOT, 'scripts', 'smoke_proveedores_operativo.mjs')]);
}

function cmdSmokeCompraMultiAreaOperativa() {
  loadCurrentEnv();
  run('node', [path.join(ROOT, 'scripts', 'smoke_compra_multi_area_operativa.mjs')]);
}

async function cmdAuthSync() {
  const currentEnv = loadCurrentEnv();
  const env = reconcilePublicSurfaceEnv(currentEnv);
  const changed = persistEnvIfChanged(env);
  await syncKeycloakClients(env);
  if (changed) {
    log(`Entorno público reconciliado en .env (${env.APP_URL})`);
  }
  log('Sincronización de Keycloak PASS');
}

async function cmdBootstrap(options) {
  const env = loadCurrentEnv();
  const effectiveEnv = {
    ...env,
    APP_URL: options['app-url'] || env.APP_URL,
    ERP_TENANT_KEY: options['tenant-key'] || env.ERP_TENANT_KEY,
    KEYCLOAK_PUBLIC_URL: options['keycloak-public-url'] || env.KEYCLOAK_PUBLIC_URL,
  };
  run('docker', [
    'compose', 'exec', '-T', 'backend',
    'node', '/workspace/scripts/bootstrap_institution.mjs',
    '--institution-name', options['institution-name'] || env.ERP_INSTITUTION_NAME,
    '--tenant-key', options['tenant-key'] || env.ERP_TENANT_KEY,
    '--state', options.state || env.ERP_INSTITUTION_STATE,
    '--law', options.law || env.ERP_NORMATIVE_LAW,
    '--licitacion-threshold', options['licitacion-threshold'] || env.ERP_NORMATIVE_LICITACION_THRESHOLD,
    '--invitacion-threshold', options['invitacion-threshold'] || env.ERP_NORMATIVE_INVITACION_THRESHOLD,
    '--app-url', options['app-url'] || env.APP_URL,
    '--branding-name', options['branding-name'] || env.ERP_BRANDING_NAME,
    '--branding-logo-url', options['branding-logo-url'] || env.ERP_BRANDING_LOGO_URL || '',
    '--primary-color', options['primary-color'] || env.ERP_BRANDING_PRIMARY_COLOR,
    '--secondary-color', options['secondary-color'] || env.ERP_BRANDING_SECONDARY_COLOR,
    '--modules', options.modules || env.ERP_ACTIVE_MODULES,
    '--unit-name', options['unit-name'] || env.ERP_UNIT_NAME,
    '--area-name', options['area-name'] || env.ERP_AREA_NAME,
    '--area-type', options['area-type'] || env.ERP_AREA_TYPE,
    ...(options['dry-run'] ? ['--dry-run'] : []),
  ]);
  if (!options['dry-run']) {
    await syncKeycloakClients(effectiveEnv);
  }
}

async function cmdUpgrade(options) {
  ensureCommands();
  if (!options['skip-backup']) {
    run('sh', [path.join(ROOT, 'scripts', 'backup.sh')]);
  }
  try {
    run('git', ['pull', '--ff-only']);
  } catch {
    warn('No fue posible ejecutar git pull --ff-only. Continúo con el código actual.');
  }
  run('git', ['submodule', 'update', '--init', '--recursive', '--remote']);
  composeUp();
  const env = loadCurrentEnv();
  await syncKeycloakClients(env);
  runBootstrap(env);
  validateInstalledStack(env);
  smoke(env);
  log('Upgrade completado');
}

function help() {
  console.log(`ERP-GOB installer\n\nUso:\n  erp-gob install demo\n  erp-gob install [--profile demo|piloto|prod] [--institution-name NOMBRE] [--tenant-key CLAVE] [--state ESTADO] [--yes]\n  erp-gob validate\n  erp-gob smoke\n  erp-gob smoke-patrimonial\n  erp-gob smoke-admin-personas\n  erp-gob smoke-mantenimiento\n  erp-gob smoke-inventario-global\n  erp-gob smoke-proveedores\n  erp-gob smoke-compra-multi-area\n  erp-gob auth-sync\n  erp-gob bootstrap [--dry-run]\n  erp-gob upgrade [--skip-backup]\n  erp-gob version\n`);
}

const options = parseArgs(process.argv);
const command = options.version ? 'version' : (options._[0] || 'help');

switch (command) {
  case 'install':
    await cmdInstall(options);
    break;
  case 'validate':
    cmdValidate();
    break;
  case 'smoke':
    cmdSmoke();
    break;
  case 'smoke-patrimonial':
  case 'smoke:patrimonial':
    cmdSmokePatrimonialMultiArea();
    break;
  case 'smoke-admin-personas':
  case 'smoke:admin-personas':
    cmdSmokeAdminPersonas();
    break;
  case 'smoke-mantenimiento':
  case 'smoke:mantenimiento':
    cmdSmokeMantenimiento();
    break;
  case 'smoke-inventario-global':
  case 'smoke:inventario-global':
    cmdSmokeInventarioGlobal();
    break;
  case 'smoke-proveedores':
  case 'smoke:proveedores':
    cmdSmokeProveedores();
    break;
  case 'smoke-compra-multi-area':
  case 'smoke:compra-multi-area':
    cmdSmokeCompraMultiAreaOperativa();
    break;
  case 'auth-sync':
    await cmdAuthSync();
    break;
  case 'bootstrap':
    await cmdBootstrap(options);
    break;
  case 'upgrade':
    await cmdUpgrade(options);
    break;
  case 'version':
    console.log(`ERP-GOB Installer ${VERSION}`);
    break;
  default:
    help();
}
