#!/usr/bin/env node
import { createRequire } from 'node:module';

function parseArgs(argv) {
  const result = {};
  for (let index = 2; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      result[key] = 'true';
      continue;
    }
    result[key] = next;
    index += 1;
  }
  return result;
}

function normalizeCode(value) {
  return String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_')
    .replace(/[^A-Z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

const args = parseArgs(process.argv);
const require = createRequire('/usr/src/app/package.json');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const institutionName = args['institution-name'] || process.env.ERP_INSTITUTION_NAME || 'ERP-GOB';
const tenantKey = normalizeCode(args['tenant-key'] || process.env.ERP_TENANT_KEY || 'demo').toLowerCase();
const stateName = args.state || process.env.ERP_INSTITUTION_STATE || 'Oaxaca';
const lawName = args.law || process.env.ERP_NORMATIVE_LAW || `Ley de Adquisiciones del Estado de ${stateName}`;
const licitacionThreshold = Number(args['licitacion-threshold'] || process.env.ERP_NORMATIVE_LICITACION_THRESHOLD || '1200000');
const invitacionThreshold = Number(args['invitacion-threshold'] || process.env.ERP_NORMATIVE_INVITACION_THRESHOLD || '350000');
const brandingName = args['branding-name'] || process.env.ERP_BRANDING_NAME || institutionName;
const brandingLogoUrl = args['branding-logo-url'] || process.env.ERP_BRANDING_LOGO_URL || null;
const primaryColor = args['primary-color'] || process.env.ERP_BRANDING_PRIMARY_COLOR || '#0B2D4F';
const secondaryColor = args['secondary-color'] || process.env.ERP_BRANDING_SECONDARY_COLOR || '#C39A35';
const appUrl = args['app-url'] || process.env.APP_URL || `https://${tenantKey}.erp.gob.local`;
const domain = new URL(appUrl).host;
const activeModules = String(args.modules || process.env.ERP_ACTIVE_MODULES || 'CONTRACTUAL,INVENTARIO,PATRIMONIAL,OBSERVABILIDAD,FINANZAS')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);
const unitName = args['unit-name'] || process.env.ERP_UNIT_NAME || 'Dirección General de Administración';
const areaName = args['area-name'] || process.env.ERP_AREA_NAME || 'Área Solicitante';
const areaType = (args['area-type'] || process.env.ERP_AREA_TYPE || 'ADMINISTRATIVA').trim().toUpperCase();
const dryRun = args['dry-run'] === 'true';

if (!Number.isFinite(licitacionThreshold) || !Number.isFinite(invitacionThreshold)) {
  throw new Error('Los umbrales normativos deben ser numéricos.');
}

async function main() {
  const activeConfig = await prisma.configuracionNormativa.findFirst({
    where: { is_active: true },
    orderBy: [{ valid_from: 'desc' }, { created_at: 'desc' }],
  });

  if (!activeConfig) {
    throw new Error('No existe configuración normativa activa para bootstrap institucional.');
  }

  const templateCode = normalizeCode(`PLANTILLA_${tenantKey}_${stateName}`);
  const templateKey = `ADMIN_NORMATIVA_PLANTILLA::${templateCode}`;
  const institutionConfigKey = `ADMIN_INSTITUCION::${normalizeCode(tenantKey)}`;

  const existingTemplate = await prisma.parametroNormativo.findFirst({
    where: {
      configuracion_normativa_id: activeConfig.id,
      clave: { equals: templateKey, mode: 'insensitive' },
    },
  });

  const templateValue = {
    clave: templateCode,
    estado: stateName,
    ley: lawName,
    descripcion: `Plantilla normativa bootstrap para ${institutionName}`,
    umbral_licitacion: licitacionThreshold,
    umbral_invitacion: invitacionThreshold,
    checklist_plantilla_id: null,
    activa: true,
  };

  const institution = await prisma.institucion.findFirst({
    where: {
      nombre: { equals: institutionName.trim(), mode: 'insensitive' },
    },
  });

  const institutionRecord = institution || {
    id: 'PENDING',
    nombre: institutionName.trim(),
    ambito: 'ESTATAL',
    estatus: 'ACTIVA',
  };

  const institutionConfigValue = {
    institucionId: institution?.id ?? institutionRecord.id,
    clave: normalizeCode(tenantKey),
    estado: stateName,
    configuracion: {
      branding: {
        nombre: brandingName,
        logoUrl: brandingLogoUrl,
        primaryColor,
        secondaryColor,
        dominio: domain,
      },
      normativa: {
        plantilla_normativa_id: existingTemplate?.id ?? 'PENDING_TEMPLATE',
      },
      modulos_activos: activeModules,
    },
  };

  if (dryRun) {
    console.log(JSON.stringify({
      dryRun: true,
      activeConfigId: activeConfig.id,
      templateKey,
      institutionConfigKey,
      institution: institutionRecord,
      plantillaNormativa: templateValue,
      institucionConfig: institutionConfigValue,
      unitName,
      areaName,
      areaType,
    }, null, 2));
    return;
  }

  const ensuredInstitution = institution || await prisma.institucion.create({
    data: {
      nombre: institutionName.trim(),
      ambito: 'ESTATAL',
      estatus: 'ACTIVA',
    },
  });

  const plantilla = existingTemplate
    ? await prisma.parametroNormativo.update({
        where: { id: existingTemplate.id },
        data: {
          tipo_dato: 'object',
          valor: templateValue,
          fundamento_legal: lawName,
        },
      })
    : await prisma.parametroNormativo.create({
        data: {
          configuracion_normativa_id: activeConfig.id,
          clave: templateKey,
          tipo_dato: 'object',
          valor: templateValue,
          fundamento_legal: lawName,
        },
      });

  const configPayload = {
    institucionId: ensuredInstitution.id,
    clave: normalizeCode(tenantKey),
    estado: stateName,
    configuracion: {
      branding: {
        nombre: brandingName,
        logoUrl: brandingLogoUrl,
        primaryColor,
        secondaryColor,
        dominio: domain,
      },
      normativa: {
        plantilla_normativa_id: plantilla.id,
      },
      modulos_activos: activeModules,
    },
  };

  const existingInstitutionConfig = await prisma.parametroNormativo.findFirst({
    where: {
      configuracion_normativa_id: activeConfig.id,
      clave: { equals: institutionConfigKey, mode: 'insensitive' },
    },
  });

  if (existingInstitutionConfig) {
    await prisma.parametroNormativo.update({
      where: { id: existingInstitutionConfig.id },
      data: {
        tipo_dato: 'object',
        valor: configPayload,
        fundamento_legal: 'Bootstrap institucional ERP-GOB',
      },
    });
  } else {
    await prisma.parametroNormativo.create({
      data: {
        configuracion_normativa_id: activeConfig.id,
        clave: institutionConfigKey,
        tipo_dato: 'object',
        valor: configPayload,
        fundamento_legal: 'Bootstrap institucional ERP-GOB',
      },
    });
  }

  const unidad = await prisma.unidadAdministrativa.findFirst({
    where: {
      institucion_id: ensuredInstitution.id,
      nombre: { equals: unitName.trim(), mode: 'insensitive' },
    },
  }) || await prisma.unidadAdministrativa.create({
    data: {
      institucion_id: ensuredInstitution.id,
      nombre: unitName.trim(),
      responsable: 'Administrador ERP-GOB',
    },
  });

  const area = await prisma.area.findFirst({
    where: {
      unidad_administrativa_id: unidad.id,
      nombre: { equals: areaName.trim(), mode: 'insensitive' },
    },
  }) || await prisma.area.create({
    data: {
      unidad_administrativa_id: unidad.id,
      nombre: areaName.trim(),
      tipo_area: areaType,
    },
  });

  console.log(JSON.stringify({
    institutionId: ensuredInstitution.id,
    institutionName: ensuredInstitution.nombre,
    tenantKey,
    templateId: plantilla.id,
    configId: existingInstitutionConfig?.id ?? 'created',
    unidadAdministrativaId: unidad.id,
    areaId: area.id,
    appUrl,
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
