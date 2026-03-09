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

function log(message) { console.log(`[erp-gob] ${message}`); }
function warn(message) { console.warn(`[erp-gob][warn] ${message}`); }
function die(message) { console.error(`[erp-gob][error] ${message}`); process.exit(1); }

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
  ['docker', 'git', 'curl'].forEach((command) => {
    try {
      capture('which', [command]);
    } catch {
      die(`Falta comando requerido: ${command}`);
    }
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
    'MINIO_ROOT_USER','MINIO_ROOT_PASSWORD',
    'APP_URL','API_URL','KEYCLOAK_PUBLIC_URL','KEYCLOAK_REALM','KEYCLOAK_CLIENT_ID','KEYCLOAK_API_CLIENT_ID','KEYCLOAK_API_CLIENT_SECRET','KEYCLOAK_BACKEND_CLIENT_SECRET','FRONTEND_CSRF_MODE','APP_ALLOWED_ORIGINS',
    'ERP_FRONTEND_TESTER_PASSWORD','ERP_CAPTURISTA_PASSWORD','ERP_REVISOR_PASSWORD','ERP_FINANZAS_PASSWORD','ERP_OIC_PASSWORD','ERP_ADMIN_PASSWORD',
    'INSTALL_PROFILE','ERP_INSTITUTION_NAME','ERP_TENANT_KEY','ERP_INSTITUTION_STATE','ERP_NORMATIVE_LAW','ERP_NORMATIVE_LICITACION_THRESHOLD','ERP_NORMATIVE_INVITACION_THRESHOLD','ERP_BRANDING_NAME','ERP_BRANDING_PRIMARY_COLOR','ERP_BRANDING_SECONDARY_COLOR','ERP_BRANDING_LOGO_URL','ERP_ACTIVE_MODULES','ERP_UNIT_NAME','ERP_AREA_NAME','ERP_AREA_TYPE',
  ];
  return `${orderedKeys.map((key) => `${key}=${env[key] ?? ''}`).join('\n')}\n`;
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

function waitForUrl(url, resolveHost, expectedStatus, tries = 60) {
  for (let attempt = 1; attempt <= tries; attempt += 1) {
    try {
      const headers = capture('curl', ['-k', '-I', '--resolve', `${resolveHost}:443:127.0.0.1`, url], { env: { LC_ALL: 'C' } });
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
  waitForUrl(`${env.APP_URL}/login`, extractHost(env.APP_URL), 200, 30);
  waitForUrl(`https://${extractHost(env.API_URL)}/`, extractHost(env.API_URL), 404, 5);
}

function smoke(env) {
  const appHost = extractHost(env.APP_URL);
  waitForUrl(`${env.APP_URL}/login`, appHost, 200, 30);
  const authRedirect = capture('curl', ['-k', '-I', '--resolve', `${appHost}:443:127.0.0.1`, `${env.APP_URL}/api/auth/login`]);
  if (!authRedirect.includes(`redirect_uri=${encodeURIComponent(`${env.APP_URL}/api/auth/callback`)}`)) {
    die('El redirect_uri OIDC no coincide con el origen público configurado.');
  }
  const dashboard = capture('curl', ['-k', '-I', '--resolve', `${appHost}:443:127.0.0.1`, `${env.APP_URL}/dashboard`]);
  if (!(dashboard.includes('HTTP/2 302') || dashboard.includes('HTTP/1.1 302'))) {
    die('Dashboard no redirigió a login sin sesión como se esperaba.');
  }
  log('Smoke post-install PASS');
}

async function cmdInstall(rawOptions) {
  ensureCommands();
  const normalized = { ...rawOptions };
  if (!normalized.profile && normalized._[1] && !normalized._[1].startsWith('--')) {
    normalized.profile = normalized._[1];
    normalized.yes = true;
  }
  const options = await promptIfMissing(normalized);
  const config = buildInstallConfig(options);
  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(ENV_PATH, renderEnv(config.env), 'utf8');
  writeFileSync(path.join(OUTPUT_DIR, 'install-summary.json'), JSON.stringify({ profile: config.profile, appUrl: config.env.APP_URL, tenantKey: config.tenantKey }, null, 2));
  ensureHosts(config, Boolean(options['skip-hosts']));
  run('git', ['submodule', 'update', '--init', '--recursive']);
  if (!options['skip-start']) {
    composeUp();
    waitForUrl(`${config.env.APP_URL}/login`, extractHost(config.env.APP_URL), 200, 60);
    runBootstrap(config.env);
    validateInstalledStack(config.env);
    if (!options['skip-smoke']) {
      smoke(config.env);
    }
  }
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

function cmdBootstrap(options) {
  const env = loadCurrentEnv();
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
}

function cmdUpgrade(options) {
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
  runBootstrap(env);
  validateInstalledStack(env);
  smoke(env);
  log('Upgrade completado');
}

function help() {
  console.log(`ERP-GOB installer\n\nUso:\n  ./erp-gob install demo\n  ./erp-gob install [--profile demo|piloto|prod] [--institution-name NOMBRE] [--tenant-key CLAVE] [--state ESTADO] [--yes]\n  ./erp-gob validate\n  ./erp-gob smoke\n  ./erp-gob bootstrap [--dry-run]\n  ./erp-gob upgrade [--skip-backup]\n`);
}

const options = parseArgs(process.argv);
const command = options._[0] || 'help';

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
  case 'bootstrap':
    cmdBootstrap(options);
    break;
  case 'upgrade':
    cmdUpgrade(options);
    break;
  default:
    help();
}
