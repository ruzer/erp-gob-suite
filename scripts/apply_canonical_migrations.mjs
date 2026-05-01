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
const SUPPLEMENTAL_FEATURE_MIGRATIONS = [
  {
    name: '20260214_add_consumibles_projection_tables',
    dependencyTables: ['inventario', 'configuracion_stock', 'solicitud_resurtido', 'almacen'],
    requiredTables: ['consumibles_projection_almacen', 'consumibles_projection_kpis'],
    requiredColumns: {
      consumibles_projection_almacen: [
        'id',
        'almacen_id',
        'producto_id',
        'variante_id',
        'stock_actual',
        'stock_minimo',
        'stock_objetivo',
        'bajo_minimo',
        'cobertura_dias',
        'riesgo',
        'solicitudes_activas',
        'updated_at',
      ],
      consumibles_projection_kpis: [
        'id',
        'total_skus',
        'total_bajo_minimo',
        'total_solicitudes_activas',
        'cobertura_promedio',
        'riesgo_global',
        'updated_at',
      ],
    },
    requiredConstraints: [
      'consumibles_projection_almacen_pkey',
      'consumibles_projection_kpis_pkey',
      'consumibles_projection_almacen_fk_almacen',
    ],
    requiredIndexes: [
      'uq_consumibles_projection_almacen_sku',
      'idx_consumibles_projection_almacen_almacen',
      'idx_consumibles_projection_almacen_producto',
      'idx_consumibles_projection_almacen_bajo_minimo',
    ],
  },
  {
    name: '20260424120000_add_sc_multi_area_origin',
    altersExistingTables: true,
    dependencyTables: [
      'solicitud_cotizacion_renglon',
      'orden_compra_renglon',
      'necesidad',
      'area',
    ],
    requiredTables: ['solicitud_cotizacion_renglon', 'orden_compra_renglon'],
    requiredColumns: {
      solicitud_cotizacion_renglon: ['necesidad_id', 'area_id'],
      orden_compra_renglon: ['solicitud_cotizacion_renglon_id', 'necesidad_id', 'area_id'],
    },
    requiredConstraints: [
      'solicitud_cotizacion_renglon_necesidad_fk',
      'solicitud_cotizacion_renglon_area_fk',
      'orden_compra_renglon_solicitud_cotizacion_renglon_fk',
      'orden_compra_renglon_necesidad_fk',
      'orden_compra_renglon_area_fk',
    ],
    requiredIndexes: [
      'idx_solicitud_cotizacion_renglon_necesidad',
      'idx_solicitud_cotizacion_renglon_area',
      'uq_solicitud_cotizacion_renglon_necesidad',
      'uq_solicitud_cotizacion_renglon_sku_no_origen',
      'uq_solicitud_cotizacion_renglon_sku_null_variante_no_origen',
      'idx_orden_compra_renglon_solicitud_renglon',
      'idx_orden_compra_renglon_necesidad',
      'idx_orden_compra_renglon_area',
    ],
  },
  {
    name: '20260424131000_cuadro_multi_area_winner_origin',
    altersExistingTables: true,
    dependencyTables: ['cuadro_comparativo_renglon'],
    requiredTables: ['cuadro_comparativo_renglon'],
    requiredIndexes: ['uq_cuadro_renglon_ganador_por_item_origen'],
  },
  {
    name: '20260424133000_align_recepcion_order_context',
    altersExistingTables: true,
    dependencyTables: ['recepcion', 'recepcion_detalle'],
    requiredTables: ['recepcion', 'recepcion_detalle'],
    requiredColumns: {
      recepcion: ['orden_compra_id', 'proveedor_id', 'origen', 'motivo_recepcion', 'observaciones', 'referencia_entrega'],
      recepcion_detalle: ['orden_compra_renglon_id', 'condicion', 'observaciones'],
    },
    requiredConstraints: ['recepcion_estatus_valid', 'recepcion_origen_valid'],
    forbiddenConstraints: ['recepcion_fuente_chk'],
    requiredIndexes: ['idx_recepcion_proveedor', 'idx_recepcion_origen'],
  },
  {
    name: '20260424134000_seed_proveedor_scoring_modelo_2026',
    altersExistingTables: true,
    dependencyTables: ['proveedor_scoring_modelo', 'proveedor_scoring_componente', 'outbox_event'],
    requiredTables: ['proveedor_scoring_modelo', 'proveedor_scoring_componente'],
    requiredDataChecks: [
      {
        label: 'modelo global activo 2026 con componente CALIDAD',
        sql: `
          SELECT EXISTS (
            SELECT 1
            FROM proveedor_scoring_modelo m
            JOIN proveedor_scoring_componente c ON c.modelo_id = m.id
            WHERE m.ejercicio = 2026
              AND m.activo = true
              AND m.institucion_id IS NULL
              AND m.categoria_proveedor IS NULL
              AND c.activo = true
              AND upper(trim(c.codigo)) = 'CALIDAD'
          );
        `,
      },
    ],
  },
  {
    name: '20260423113000_add_parque_vehicular_avanzado',
    dependencyTables: ['gias_asset', 'persona', 'area', 'mantenimiento_orden_trabajo'],
    requiredTables: [
      'parque_vehicular_unidad',
      'parque_vehicular_lectura_odometro',
      'parque_vehicular_vencimiento',
      'parque_vehicular_movimiento',
      'parque_vehicular_asignacion_historial',
      'parque_vehicular_cola_mantenimiento',
    ],
    requiredColumns: {
      parque_vehicular_unidad: ['activo_id', 'estatus_operativo', 'kilometraje_actual', 'fecha_ultima_lectura_odometro'],
      parque_vehicular_lectura_odometro: ['id', 'unidad_vehicular_id', 'fecha', 'kilometraje', 'origen', 'is_anomalous', 'is_valid'],
      parque_vehicular_vencimiento: ['id', 'unidad_vehicular_id', 'tipo', 'fecha_vencimiento', 'alertar_desde_dias'],
      parque_vehicular_movimiento: ['id', 'unidad_vehicular_id', 'tipo', 'fecha_hora', 'movimiento_origen_id', 'is_cerrado'],
      parque_vehicular_asignacion_historial: ['id', 'unidad_vehicular_id', 'persona_id', 'area_id', 'is_actual'],
      parque_vehicular_cola_mantenimiento: ['id', 'unidad_vehicular_id', 'orden_trabajo_id', 'estado', 'prioridad'],
    },
    requiredConstraints: [
      'parque_vehicular_unidad_pkey',
      'fk_parque_vehicular_unidad_activo',
      'parque_vehicular_lectura_odometro_pkey',
      'fk_parque_vehicular_lectura_odometro_unidad',
      'parque_vehicular_vencimiento_pkey',
      'fk_parque_vehicular_vencimiento_unidad',
      'parque_vehicular_movimiento_pkey',
      'fk_parque_vehicular_movimiento_unidad',
      'parque_vehicular_asignacion_historial_pkey',
      'fk_parque_vehicular_asignacion_unidad',
      'parque_vehicular_cola_mantenimiento_pkey',
      'uq_parque_vehicular_cola_orden_trabajo',
      'fk_parque_vehicular_cola_unidad',
      'fk_parque_vehicular_cola_orden_trabajo',
    ],
    requiredIndexes: [
      'uq_parque_vehicular_movimiento_salida_abierta',
      'uq_parque_vehicular_movimiento_taller_abierto',
      'uq_parque_vehicular_asignacion_actual',
    ],
    requiredTriggers: ['trg_parque_vehicular_unidad_asset_categoria'],
  },
  {
    name: '20260423213000_add_facilities_inmuebles_avanzado',
    dependencyTables: ['gias_asset'],
    requiredTables: [
      'facilities_inmueble_incidencia',
      'facilities_inmueble_cumplimiento',
      'facilities_inmueble_subsistema',
    ],
    requiredColumns: {
      facilities_inmueble_incidencia: ['id', 'activo_id', 'area_afectada', 'severidad', 'estado', 'resumen'],
      facilities_inmueble_cumplimiento: ['id', 'activo_id', 'tipo', 'fecha_vencimiento', 'alertar_desde_dias'],
      facilities_inmueble_subsistema: ['id', 'activo_id', 'subsistema', 'estado', 'criticidad', 'contrato_servicio_id'],
    },
    requiredConstraints: [
      'facilities_inmueble_incidencia_pkey',
      'facilities_inmueble_incidencia_activo_id_fkey',
      'facilities_inmueble_cumplimiento_pkey',
      'facilities_inmueble_cumplimiento_activo_id_fkey',
      'facilities_inmueble_subsistema_pkey',
      'facilities_inmueble_subsistema_activo_id_fkey',
    ],
  },
];

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

function runScalarQuery(databaseUrl, sql) {
  return execFileSync('psql', [databaseUrl, '-v', 'ON_ERROR_STOP=1', '-At', '-c', sql], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  }).trim();
}

function shouldApplyCanonicalMigrations(databaseUrl) {
  const publicTableCount = Number(
    runScalarQuery(
      databaseUrl,
      "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';",
    ),
  );

  if (Number.isNaN(publicTableCount)) {
    throw new Error('No se pudo determinar el estado del esquema actual.');
  }

  if (publicTableCount === 0) {
    console.log('[migrate] Base vacia detectada; se aplicaran migraciones canonicas');
    return true;
  }

  const requiredTables = ['usuario', 'producto', 'proveedor', 'expediente'];
  const presentTablesRaw = runScalarQuery(
    databaseUrl,
    `SELECT COALESCE(string_agg(table_name, ',' ORDER BY table_name), '')
     FROM information_schema.tables
     WHERE table_schema = 'public'
       AND table_name IN (${requiredTables.map((table) => `'${table}'`).join(', ')});`,
  );
  const presentTables = new Set(
    presentTablesRaw
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
  );

  const missingTables = requiredTables.filter((table) => !presentTables.has(table));
  if (missingTables.length === 0) {
    console.log(
      `[migrate] Esquema institucional existente detectado (${publicTableCount} tablas); se omiten migraciones canonicas`,
    );
    return false;
  }

  throw new Error(
    `Esquema parcial detectado (${publicTableCount} tablas publicas, faltan tablas base: ${missingTables.join(
      ', ',
    )}). Abortando para evitar una reaplicacion inconsistente de migraciones.`,
  );
}

function quoteSqlLiteral(value) {
  return `'${value.replaceAll("'", "''")}'`;
}

function existingPublicTables(databaseUrl, tables) {
  const raw = runScalarQuery(
    databaseUrl,
    `SELECT COALESCE(string_agg(table_name, ',' ORDER BY table_name), '')
     FROM information_schema.tables
     WHERE table_schema = 'public'
       AND table_name IN (${tables.map(quoteSqlLiteral).join(', ')});`,
  );

  return new Set(
    raw
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
  );
}

function assertPublicTablesExist(databaseUrl, tables, label) {
  const existing = existingPublicTables(databaseUrl, tables);
  const missing = tables.filter((table) => !existing.has(table));
  if (missing.length > 0) {
    throw new Error(`${label}; faltan tablas requeridas: ${missing.join(', ')}`);
  }
}

function runListQuery(databaseUrl, sql) {
  const raw = runScalarQuery(databaseUrl, sql);
  return new Set(
    raw
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
  );
}

function assertSupplementalMigrationShape(databaseUrl, migration) {
  for (const [table, columns] of Object.entries(migration.requiredColumns ?? {})) {
    const existingColumns = runListQuery(
      databaseUrl,
      `SELECT COALESCE(string_agg(column_name, ',' ORDER BY column_name), '')
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = ${quoteSqlLiteral(table)}
         AND column_name IN (${columns.map(quoteSqlLiteral).join(', ')});`,
    );
    const missingColumns = columns.filter((column) => !existingColumns.has(column));
    if (missingColumns.length > 0) {
      throw new Error(
        `Esquema incompleto para ${migration.name}; ${table} no tiene columnas: ${missingColumns.join(', ')}`,
      );
    }
  }

  const requiredConstraints = migration.requiredConstraints ?? [];
  if (requiredConstraints.length > 0) {
    const existingConstraints = runListQuery(
      databaseUrl,
      `SELECT COALESCE(string_agg(conname, ',' ORDER BY conname), '')
       FROM pg_constraint
       WHERE connamespace = 'public'::regnamespace
         AND conname IN (${requiredConstraints.map(quoteSqlLiteral).join(', ')});`,
    );
    const missingConstraints = requiredConstraints.filter((constraint) => !existingConstraints.has(constraint));
    if (missingConstraints.length > 0) {
      throw new Error(
        `Esquema incompleto para ${migration.name}; faltan constraints: ${missingConstraints.join(', ')}`,
      );
    }
  }

  const requiredIndexes = migration.requiredIndexes ?? [];
  if (requiredIndexes.length > 0) {
    const existingIndexes = runListQuery(
      databaseUrl,
      `SELECT COALESCE(string_agg(indexname, ',' ORDER BY indexname), '')
       FROM pg_indexes
       WHERE schemaname = 'public'
         AND indexname IN (${requiredIndexes.map(quoteSqlLiteral).join(', ')});`,
    );
    const missingIndexes = requiredIndexes.filter((index) => !existingIndexes.has(index));
    if (missingIndexes.length > 0) {
      throw new Error(
        `Esquema incompleto para ${migration.name}; faltan indices: ${missingIndexes.join(', ')}`,
      );
    }
  }

  const requiredTriggers = migration.requiredTriggers ?? [];
  if (requiredTriggers.length > 0) {
    const existingTriggers = runListQuery(
      databaseUrl,
      `SELECT COALESCE(string_agg(trigger_name, ',' ORDER BY trigger_name), '')
       FROM information_schema.triggers
       WHERE trigger_schema = 'public'
         AND trigger_name IN (${requiredTriggers.map(quoteSqlLiteral).join(', ')});`,
    );
    const missingTriggers = requiredTriggers.filter((trigger) => !existingTriggers.has(trigger));
    if (missingTriggers.length > 0) {
      throw new Error(
        `Esquema incompleto para ${migration.name}; faltan triggers: ${missingTriggers.join(', ')}`,
      );
    }
  }

  const forbiddenConstraints = migration.forbiddenConstraints ?? [];
  if (forbiddenConstraints.length > 0) {
    const existingForbiddenConstraints = runListQuery(
      databaseUrl,
      `SELECT COALESCE(string_agg(conname, ',' ORDER BY conname), '')
       FROM pg_constraint
       WHERE connamespace = 'public'::regnamespace
         AND conname IN (${forbiddenConstraints.map(quoteSqlLiteral).join(', ')});`,
    );
    const presentForbiddenConstraints = forbiddenConstraints.filter((constraint) =>
      existingForbiddenConstraints.has(constraint),
    );
    if (presentForbiddenConstraints.length > 0) {
      throw new Error(
        `Esquema obsoleto para ${migration.name}; constraints heredados presentes: ${presentForbiddenConstraints.join(', ')}`,
      );
    }
  }

  const requiredDataChecks = migration.requiredDataChecks ?? [];
  for (const check of requiredDataChecks) {
    const raw = runScalarQuery(databaseUrl, check.sql);
    if (raw !== 't' && raw !== 'true' && raw !== '1') {
      throw new Error(
        `Datos requeridos ausentes para ${migration.name}; check fallido: ${check.label}`,
      );
    }
  }
}

function resolveSupplementalMigrationSql(migrationName) {
  const candidates = [
    {
      filePath: path.join(process.cwd(), 'prisma', 'migrations', migrationName, 'migration.sql'),
      mode: 'raw',
    },
    {
      filePath: path.join(ROOT, 'backend', 'core', 'backend', 'prisma', 'migrations', migrationName, 'migration.sql'),
      mode: 'raw',
    },
    {
      filePath: path.join(ROOT, 'backend', 'docs', 'db', 'migrations', `${migrationName}.sql`),
      mode: 'canonical',
    },
  ];

  const found = candidates.find((candidate) => existsSync(candidate.filePath));
  if (!found) {
    throw new Error(
      `No se encontro la migracion feature ${migrationName} en: ${candidates.map((candidate) => candidate.filePath).join(', ')}`,
    );
  }

  if (found.mode === 'canonical') {
    return extractUpSql(found.filePath);
  }

  return readFileSync(found.filePath, 'utf8');
}

function applySupplementalFeatureMigrations(databaseUrl) {
  console.log('[migrate] Validando migraciones feature suplementarias');

  for (const migration of SUPPLEMENTAL_FEATURE_MIGRATIONS) {
    if (migration.altersExistingTables) {
      assertPublicTablesExist(
        databaseUrl,
        migration.dependencyTables ?? [],
        `No se puede aplicar ${migration.name} sobre un esquema parcial`,
      );

      try {
        assertSupplementalMigrationShape(databaseUrl, migration);
        console.log(`[migrate] feature omitida: ${migration.name} (forma existente)`);
      } catch (error) {
        console.log(`[migrate] feature ${migration.name}`);
        applySql(databaseUrl, resolveSupplementalMigrationSql(migration.name));
        assertSupplementalMigrationShape(databaseUrl, migration);
      }
      continue;
    }

    const existing = existingPublicTables(databaseUrl, migration.requiredTables);
    if (existing.size === migration.requiredTables.length) {
      assertSupplementalMigrationShape(databaseUrl, migration);
      console.log(`[migrate] feature omitida: ${migration.name} (tablas existentes)`);
      continue;
    }

    if (existing.size > 0) {
      const missing = migration.requiredTables.filter((table) => !existing.has(table));
      throw new Error(
        `Esquema parcial para ${migration.name}; tablas presentes=${[...existing].join(', ')}, faltantes=${missing.join(', ')}`,
      );
    }

    assertPublicTablesExist(
      databaseUrl,
      migration.dependencyTables ?? [],
      `No se puede aplicar ${migration.name} sobre un esquema parcial`,
    );

    console.log(`[migrate] feature ${migration.name}`);
    applySql(databaseUrl, resolveSupplementalMigrationSql(migration.name));
    assertSupplementalMigrationShape(databaseUrl, migration);
  }

  console.log('[migrate] Migraciones feature suplementarias listas');
}

function main() {
  const databaseUrl = requireDatabaseUrl();
  const applyCanonical = shouldApplyCanonicalMigrations(databaseUrl);

  if (applyCanonical) {
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

  applySupplementalFeatureMigrations(databaseUrl);
}

main();
