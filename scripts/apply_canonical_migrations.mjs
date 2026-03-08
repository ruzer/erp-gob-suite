#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const migrationsDir = path.join(ROOT, 'docs', 'db', 'migrations');
const migrationOrderFile = path.join(ROOT, 'docs', 'db', 'MIGRATION_ORDER_CANONICAL.md');

function requireDatabaseUrl() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL es requerido para aplicar migraciones canonicas.');
  }
  return process.env.DATABASE_URL;
}

function extractUpSql(filePath) {
  const contents = readFileSync(filePath, 'utf8');
  if (filePath.toUpperCase().includes('_DEPRECATED.SQL') || contents.includes('-- DEPRECATED')) {
    return null;
  }

  const lines = contents.split(/\r?\n/);
  const upMarkerIndex = lines.findIndex((line) => /^\s*--\s*UP\b/i.test(line));
  const downMarkerIndex = lines.findIndex(
    (line, idx) => idx > upMarkerIndex && /^\s*--\s*DOWN\b/i.test(line),
  );

  if (upMarkerIndex < 0 || downMarkerIndex < 0 || downMarkerIndex <= upMarkerIndex) {
    throw new Error(`Marcadores UP/DOWN invalidos en ${filePath}`);
  }

  const sql = lines.slice(upMarkerIndex + 1, downMarkerIndex).join('\n').trim();
  if (!sql) {
    throw new Error(`Seccion UP vacia en ${filePath}`);
  }
  return `${sql}\n`;
}

function loadCanonicalMigrationOrder() {
  if (!existsSync(migrationOrderFile)) {
    throw new Error(`No existe el orden canonico: ${migrationOrderFile}`);
  }

  const content = readFileSync(migrationOrderFile, 'utf8');
  const files = [];
  const seen = new Set();

  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^\s*\d+\.\s+`([^`]+\.sql)`\s*$/);
    if (!match) continue;
    const file = match[1].trim();
    if (!file) continue;
    if (seen.has(file)) {
      throw new Error(`Migracion duplicada en orden canonico: ${file}`);
    }
    seen.add(file);
    files.push(file);
  }

  if (files.length === 0) {
    throw new Error(`No se pudieron leer migraciones canonicas desde ${migrationOrderFile}`);
  }

  return files;
}

function resolveMigrationExecutionOrder() {
  const diskMigrations = readdirSync(migrationsDir)
    .filter((name) => name.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b));

  const canonicalMigrations = loadCanonicalMigrationOrder();
  const diskSet = new Set(diskMigrations);
  const canonicalSet = new Set(canonicalMigrations);

  const unlisted = diskMigrations.filter((file) => !canonicalSet.has(file));
  if (unlisted.length > 0) {
    throw new Error(`Migraciones activas fuera del orden canonico: ${unlisted.join(', ')}`);
  }

  const missing = canonicalMigrations.filter((file) => !diskSet.has(file));
  if (missing.length > 0) {
    throw new Error(`Orden canonico referencia archivos faltantes: ${missing.join(', ')}`);
  }

  return canonicalMigrations;
}

function applySql(databaseUrl, sql) {
  execFileSync('psql', [databaseUrl, '-v', 'ON_ERROR_STOP=1', '-f', '-'], {
    stdio: ['pipe', 'inherit', 'inherit'],
    input: sql,
  });
}

function main() {
  const databaseUrl = requireDatabaseUrl();
  const executionOrder = resolveMigrationExecutionOrder();

  console.log(`[migrate] Aplicando ${executionOrder.length} migraciones canonicas (UP-only)`);

  for (const file of executionOrder) {
    const fullPath = path.join(migrationsDir, file);
    const sql = extractUpSql(fullPath);
    if (!sql) {
      console.log(`[migrate] omitida: ${file} (deprecated)`);
      continue;
    }
    console.log(`[migrate] ${file}`);
    applySql(databaseUrl, sql);
  }

  console.log('[migrate] Migraciones canonicas aplicadas correctamente');
}

main();
