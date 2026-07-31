import 'dotenv/config';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { Prisma, PrismaClient, HttpMethod } from '@prisma/client';
import { renderTemplateToHtml } from '../src/lib/template-engine/renderTemplateToHtml';
import type { ReportTemplate } from '../src/lib/template-engine/template';
import {
  buildConsultasProReportTemplate,
  validateConsultasProReportTemplate,
  type ConsultasProBrandReference,
  type ConsultasProReportField,
  type ConsultasProReportFieldType,
} from '../src/modules/templates/consultas-pro-report-builder.service';
import {
  BRASILCRED_RADAR_PRONAMPE_TYPES,
  BRASILCRED_RADAR_PRONAMPE_LEAF_COUNT,
  BRASILCRED_TEMPLATE_PRODUCTS,
  type BrasilCredTypeSpec,
} from '../src/modules/templates/brasilcred-template-products';
import {
  auditRadarPronampeLineage,
  buildRadarPronampeMappedData as buildMappedData,
} from '../src/modules/templates/brasilcred-radar-pronampe.mapper';

const prisma = new PrismaClient();
const apply = process.argv.includes('--apply');

const SAMPLES_PATH = path.join(__dirname, 'brasilcred-radar-pronampe-samples.json');
const BRAND_REFERENCE_TEMPLATE_ID = 'sollos-template-1079';

type Sample = {
  document: string;
  status: string;
  capturedAt: string;
  referencePdf: string | null;
  response: Record<string, unknown>;
};

function toReportFieldTypes(
  mapped: Record<string, unknown>,
): ConsultasProReportFieldType[] {
  return BRASILCRED_RADAR_PRONAMPE_TYPES.filter(
    (type) => mapped[type.key] !== undefined,
  ).map((type: BrasilCredTypeSpec) => {
    const fields: ConsultasProReportField[] = type.fields
      .filter((field) => !field.auditOnly)
      .map((field, index) => ({
        id: `field_${type.key.toLowerCase()}_${field.key}`,
        key: field.key,
        label: field.label,
        sortOrder: index,
        dataType: field.dataType,
      }));
    return {
      id: `bc-type-${type.key}`,
      key: type.key,
      label: type.label,
      description: type.description,
      isCollection: type.isCollection,
      reportFieldConfig: { version: 1, title: type.label, fields },
    };
  });
}

function loadSamples(): Sample[] {
  const raw = JSON.parse(fs.readFileSync(SAMPLES_PATH, 'utf-8')) as {
    samples: Sample[];
  };
  if (!Array.isArray(raw.samples) || raw.samples.length === 0) {
    throw new Error('Nenhuma amostra Radar PRONAMPE disponivel.');
  }
  return raw.samples;
}

/** Escolhe a amostra mais completa como base do layout. */
function pickRichestSample(samples: Sample[]): Sample {
  return [...samples].sort(
    (a, b) =>
      Object.keys(buildMappedData(b.response)).filter(
        (k) => buildMappedData(b.response)[k] !== undefined,
      ).length -
      Object.keys(buildMappedData(a.response)).filter(
        (k) => buildMappedData(a.response)[k] !== undefined,
      ).length,
  )[0];
}

/**
 * Localiza a matriz visual protegida (produto 1079). O id varia por ambiente,
 * entao a busca e por evidencia: template do 1079 que carrega a logo oficial
 * incorporada. A geracao e bloqueada se a matriz nao existir — o padrao
 * Consultas PRO nao pode ser reproduzido sem ela.
 */
async function loadBrandReference(): Promise<ConsultasProBrandReference> {
  const candidates = await prisma.template.findMany({
    where: {
      OR: [
        { id: BRAND_REFERENCE_TEMPLATE_ID },
        { name: { contains: 'COMPLETA BRASIL + SCORE CPF', mode: 'insensitive' } },
      ],
    },
    select: { id: true, name: true, layout: true },
  });
  const reference = candidates.find((candidate) => {
    const layout = candidate.layout as unknown as ReportTemplate | null;
    return layout?.elements?.some(
      (element) =>
        element.type === 'image' &&
        typeof element.data?.src === 'string' &&
        element.data.src.startsWith('data:image/'),
    );
  });
  if (!reference?.layout) {
    throw new Error(
      'Matriz visual do produto 1079 (com logo oficial) nao encontrada. O padrao Consultas PRO nao pode ser reproduzido sem ela.',
    );
  }
  console.log(`Matriz visual: ${reference.id} — ${reference.name}`);
  return {
    templateId: reference.id,
    layout: reference.layout as unknown as ReportTemplate,
  };
}

async function main() {
  const spec = BRASILCRED_TEMPLATE_PRODUCTS[0];
  const samples = loadSamples();
  const brandReference = await loadBrandReference();

  console.log(
    `Radar PRONAMPE — ${samples.length} amostras | ${BRASILCRED_RADAR_PRONAMPE_LEAF_COUNT} caminhos mapeados`,
  );

  // Prova de contrato: toda amostra atravessa o de-para sem perder valor.
  // Usa o mesmo auditor consumido pelos testes, para nao existirem duas regras.
  let checkedValues = 0;
  for (const sample of samples) {
    for (const item of auditRadarPronampeLineage(sample.response)) {
      if (item.status === 'divergente') {
        throw new Error(
          `[${sample.document}] ${item.typeKey}.${item.fieldKey}: origem ` +
            `${JSON.stringify(item.sourceValue)} virou ${JSON.stringify(item.previewValue)}`,
        );
      }
      if (item.status === 'ok') checkedValues += 1;
    }
  }
  console.log(
    `Contrato origem -> PARA: ${checkedValues} valores conferidos, 0 divergencias`,
  );

  const base = pickRichestSample(samples);
  const mappedData = buildMappedData(base.response);
  const fieldTypes = toReportFieldTypes(mappedData);

  const layout = buildConsultasProReportTemplate({
    productId: spec.productId,
    productName: spec.productName,
    personType: spec.personType,
    fieldTypes,
    mappedData,
    samplingEvidence: {
      validSamples: samples.length,
      totalSamples: samples.length,
      coveredLeafPathCount: BRASILCRED_RADAR_PRONAMPE_LEAF_COUNT,
      totalLeafPathCount: BRASILCRED_RADAR_PRONAMPE_LEAF_COUNT,
      draftUpdatedAt: new Date(base.capturedAt).toISOString(),
    },
    brandReference,
    providerSlug: 'brasilcred',
  });

  const audit = validateConsultasProReportTemplate(layout, fieldTypes, brandReference);
  if (!audit.valid) {
    throw new Error(`Template invalido:\n${audit.errors.join('\n')}`);
  }
  console.log(
    `Template: ${audit.frameCount} paginas | ${audit.typeCount} tipos | ${audit.fieldCount} campos`,
  );

  // Toda pagina precisa renderizar com a amostra real, sem expressao pendente.
  for (const sample of samples) {
    const data = buildMappedData(sample.response);
    for (const frame of layout.frames) {
      const html = renderTemplateToHtml(layout, frame.id, data).html;
      const pending = html.match(/\{\{[^}]+\}\}/g);
      if (pending) {
        throw new Error(
          `[${sample.document}] pagina ${frame.name} deixou expressao sem resolver: ${pending[0]}`,
        );
      }
    }
  }
  console.log(
    `Renderizacao: ${layout.frames.length * samples.length} paginas sem expressao pendente`,
  );

  if (!apply) {
    console.log('\nDry-run concluido. Use --apply para gravar no banco.');
    return;
  }

  const provider = await prisma.provider.findFirst({
    where: { slug: 'brasil-cred' },
  });
  if (!provider) throw new Error('Provedor brasil-cred nao encontrado.');

  const admin = await prisma.user.findFirst({ where: { role: 'PLATFORM_ADMIN' } });
  if (!admin) throw new Error('Administrador da plataforma nao encontrado.');

  await prisma.$transaction(async (tx) => {
    const canonicalIds = new Map<string, string>();
    for (const type of BRASILCRED_RADAR_PRONAMPE_TYPES) {
      const reportFieldConfig = {
        version: 1,
        title: type.label,
        fields: type.fields
          .filter((field) => !field.auditOnly)
          .map((field, index) => ({
            id: `field_${type.key.toLowerCase()}_${field.key}`,
            key: field.key,
            label: field.label,
            sortOrder: index,
            dataType: field.dataType,
          })),
      };
      const canonical = await tx.canonicalFieldCatalog.upsert({
        where: { pathKey: type.key },
        update: {
          label: type.label,
          description: type.description,
          reportFieldConfig: reportFieldConfig as unknown as Prisma.InputJsonValue,
        },
        create: {
          pathKey: type.key,
          label: type.label,
          dataType: 'object',
          description: type.description,
          reportFieldConfig: reportFieldConfig as unknown as Prisma.InputJsonValue,
        },
      });
      canonicalIds.set(type.key, canonical.id);
    }

    const product = await tx.providerProduct.upsert({
      where: {
        providerId_code: { providerId: provider.id, code: 'RADAR_PRONAMPE_PJ' },
      },
      update: {
        sampleResponse: base.response as unknown as Prisma.InputJsonValue,
      },
      create: {
        providerId: provider.id,
        name: spec.productName,
        code: 'RADAR_PRONAMPE_PJ',
        externalId: spec.productId,
        endpointPath: spec.endpointPath,
        method: HttpMethod.POST,
        cost: 0,
        consultationPrice: 0,
        isActive: false,
        bodyTemplate: { document: '$document' } as unknown as Prisma.InputJsonValue,
        sampleResponse: base.response as unknown as Prisma.InputJsonValue,
      },
    });

    await tx.providerFieldMapping.deleteMany({
      where: {
        productId: product.id,
        notes: { contains: 'fabrica-templates-brasilcred' },
      },
    });
    let sortOrder = 0;
    for (const type of BRASILCRED_RADAR_PRONAMPE_TYPES) {
      const canonicalFieldId = canonicalIds.get(type.key)!;
      await tx.providerFieldMapping.create({
        data: {
          productId: product.id,
          canonicalFieldId,
          sourcePath: type.sourcePath || '$',
          sortOrder: sortOrder++,
          notes: JSON.stringify({
            source: 'fabrica-templates-brasilcred',
            contract: 'RadarPronampeResult',
            fields: type.fields.map((f) => ({
              key: f.key,
              sourcePath: f.sourcePath,
            })),
          }),
        },
      });
    }

    const templateId = `brasilcred-template-${spec.productId}`;
    const template = await tx.template.upsert({
      where: { id: templateId },
      update: {
        name: spec.productName,
        visibility: 'PRIVATE',
        layout: layout as unknown as Prisma.InputJsonValue,
      },
      create: {
        id: templateId,
        userId: admin.id,
        name: spec.productName,
        description:
          `[REVISÃO MANUAL] Radar PRONAMPE (Brasil Cred). ` +
          `${audit.typeCount} tipos, ${audit.fieldCount} campos e ${audit.frameCount} páginas. ` +
          `Contrato RadarPronampeResult, ${samples.length} amostras reais, padrão CONSULTAS_PRO_1079.`,
        visibility: 'PRIVATE',
        layout: layout as unknown as Prisma.InputJsonValue,
      },
    });

    await tx.templateItem.upsert({
      where: {
        templateId_providerProductId: {
          templateId: template.id,
          providerProductId: product.id,
        },
      },
      update: {},
      create: {
        templateId: template.id,
        providerProductId: product.id,
        sortOrder: 0,
      },
    });

    console.log(`\nGravado: produto ${product.code} (inativo)`);
    console.log(`Gravado: ${canonicalIds.size} tipos canonicos`);
    console.log(`Gravado: template ${template.id} (PRIVATE)`);
  });
}

main()
  .catch((error) => {
    console.error('\nFALHOU:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
