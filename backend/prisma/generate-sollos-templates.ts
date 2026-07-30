import 'dotenv/config';
import { createHash } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { Prisma, PrismaClient } from '@prisma/client';
import { renderTemplateToHtml } from '../src/lib/template-engine/renderTemplateToHtml';
import type { ReportTemplate } from '../src/lib/template-engine/template';
import {
  buildTypeKeyedData,
  normalizeTypeItemFilterConfig,
  parseTypeItemFiltersRecord,
  type ConsultationFieldType,
  type FieldMapping,
} from '../src/modules/providers/canonical-builder.service';
import { catalogSollosProduct } from '../src/modules/providers/catalog-sollos-product.service';
import {
  buildSollosReportTemplate,
  validateSollosReportTemplate,
  type SollosBrandReference,
  type SollosReportFieldConfig,
  type SollosReportFieldType,
} from '../src/modules/templates/sollos-template-builder.service';
import {
  SOLLOS_TEMPLATE_PRODUCTS,
  type SollosTemplatePersonType,
} from '../src/modules/templates/sollos-template-products';

const prisma = new PrismaClient();
const apply = process.argv.includes('--apply');
const refreshGenerated = process.argv.includes('--refresh-generated');
const app = { prisma } as unknown as FastifyInstance;

type DraftFieldType = SollosReportFieldType & {
  typeItemFilters?: unknown;
};

type DraftFieldMapping = FieldMapping & {
  uiStartLine?: number;
  uiEndLine?: number;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asArray<T>(value: unknown, label: string): T[] {
  if (!Array.isArray(value)) throw new Error(`${label} não é uma lista.`);
  return value as T[];
}

function normalizeFieldTypes(value: unknown): DraftFieldType[] {
  return asArray<Record<string, unknown>>(value, 'fieldTypes').map(
    (raw, index) => {
      const key = String(raw.key ?? '').trim();
      const label = String(raw.label ?? '').trim();
      const reportFieldConfig = asRecord(raw.reportFieldConfig);
      const fields = Array.isArray(reportFieldConfig.fields)
        ? reportFieldConfig.fields
        : [];
      if (!key || !label || fields.length === 0) {
        throw new Error(
          `Tipo ${index + 1} sem chave, rótulo ou campos de relatório.`,
        );
      }
      return {
        id: String(raw.id ?? `sollos-type-${key}`),
        key,
        label,
        description:
          raw.description == null ? undefined : String(raw.description),
        color: raw.color == null ? undefined : String(raw.color),
        icon: raw.icon == null ? undefined : String(raw.icon),
        typeItemFilters: raw.typeItemFilters,
        reportFieldConfig:
          reportFieldConfig as unknown as SollosReportFieldConfig,
      };
    },
  );
}

function normalizeFieldMappings(value: unknown): DraftFieldMapping[] {
  return asArray<Record<string, unknown>>(value, 'fieldMappings').map(
    (raw, index) => {
      const fieldTypeKey = String(raw.fieldTypeKey ?? '').trim();
      const jsonPath = String(raw.jsonPath ?? '').trim();
      if (!fieldTypeKey || !jsonPath) {
        throw new Error(`Mapeamento ${index + 1} sem tipo ou caminho JSON.`);
      }
      return {
        fieldTypeKey,
        jsonPath,
        label: String(raw.label ?? fieldTypeKey),
        ...(typeof raw.uiStartLine === 'number'
          ? { uiStartLine: raw.uiStartLine }
          : {}),
        ...(typeof raw.uiEndLine === 'number'
          ? { uiEndLine: raw.uiEndLine }
          : {}),
      };
    },
  );
}

function isCollectionEvidence(
  typeKey: string,
  mappedValue: unknown,
  mappings: DraftFieldMapping[],
  typeFilter: ReturnType<typeof normalizeTypeItemFilterConfig>,
): boolean {
  if (Array.isArray(mappedValue)) return true;
  if (
    mappings.some(
      (mapping) =>
        mapping.fieldTypeKey === typeKey &&
        (mapping.jsonPath.includes('[*]') ||
          /(?:^|\.)(OCORRENCIAS|ITENS|LISTA|REGISTROS)(?:\.|$)/i.test(
            mapping.jsonPath,
          )),
    )
  ) {
    return true;
  }
  return typeFilter.fieldMappings.some((mapping) =>
    /(?:^|\.)(OCORRENCIAS|ITENS|LISTA|REGISTROS)(?:\.|$)/i.test(
      mapping.sourceTrechoPath ?? '',
    ),
  );
}

function buildMappedSample(
  representativeResponse: unknown,
  fieldTypes: DraftFieldType[],
  mappings: DraftFieldMapping[],
  typeItemFiltersValue: unknown,
  updatedAt: Date,
): {
  mappedData: Record<string, unknown>;
  reportFieldTypes: DraftFieldType[];
} {
  const sampleResponse = JSON.stringify(representativeResponse);
  const filters = parseTypeItemFiltersRecord(typeItemFiltersValue) ?? {};
  const mappedData: Record<string, unknown> = {};
  const reportFieldTypes: DraftFieldType[] = [];

  for (const fieldType of fieldTypes) {
    const typeMappings = mappings.filter(
      (mapping) => mapping.fieldTypeKey === fieldType.key,
    );
    if (typeMappings.length === 0) {
      throw new Error(`O tipo ${fieldType.key} não possui trecho de origem.`);
    }
    const typeFilter = normalizeTypeItemFilterConfig(
      filters[fieldType.key] ?? {
        version: 2,
        groups: fieldType.typeItemFilters ?? [],
        fieldMappings: [],
        dedupFieldIds: [],
      },
    );
    if (typeFilter.fieldMappings.length === 0) {
      throw new Error(
        `O tipo ${fieldType.key} não possui DE-PARA de campos para o preview.`,
      );
    }
    const mappedValue = buildTypeKeyedData({
      sampleResponse,
      trechoMappings: typeMappings,
      fieldType: fieldType as ConsultationFieldType,
      typeItemFilterConfig: typeFilter,
    });
    mappedData[fieldType.key] = mappedValue;
    reportFieldTypes.push({
      ...fieldType,
      isCollection: isCollectionEvidence(
        fieldType.key,
        mappedValue,
        mappings,
        typeFilter,
      ),
    });
  }

  const identity = findIdentity(mappedData);
  const responseRecord = asRecord(representativeResponse);
  const protocol =
    firstString(responseRecord, ['protocol', 'PROTOCOLO', 'REQUISICAO']) ??
    `SOLLOS-${updatedAt.getTime()}`;
  mappedData.protocol = protocol;
  mappedData.template = {
    protocol,
    date: updatedAt.toLocaleDateString('pt-BR', { timeZone: 'UTC' }),
    company: 'Consultas PRO',
  };
  mappedData.cliente = identity;

  return { mappedData, reportFieldTypes };
}

function firstString(
  record: Record<string, unknown>,
  keys: string[],
): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}

function findIdentity(root: Record<string, unknown>): {
  nome: string;
  documento: string;
} {
  let name = '';
  let document = '';
  const visited = new Set<object>();

  const visit = (value: unknown) => {
    if (name && document) return;
    if (!value || typeof value !== 'object' || visited.has(value as object)) return;
    visited.add(value as object);
    if (Array.isArray(value)) {
      value.slice(0, 8).forEach(visit);
      return;
    }
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      const normalized = key
        .normalize('NFD')
        .replace(/\p{M}/gu, '')
        .toLowerCase();
      if (
        !name &&
        typeof child === 'string' &&
        /(nome|razao_social|nome_empresarial)/.test(normalized)
      ) {
        name = child;
      }
      if (
        !document &&
        (typeof child === 'string' || typeof child === 'number') &&
        /(cpf|cnpj|documento|cpfcnpj)/.test(normalized)
      ) {
        const digits = String(child).replace(/\D/g, '');
        if (digits.length === 11 || digits.length === 14) document = digits;
      }
      visit(child);
    }
  };

  visit(root);
  return {
    nome: name || 'Dado não localizado na amostra',
    documento: document || '',
  };
}

function personCode(personType: SollosTemplatePersonType): string {
  if (personType === 'PF') return 'F';
  if (personType === 'PJ') return 'J';
  return '{{#is_cpf}}F{{/is_cpf}}{{#is_cnpj}}J{{/is_cnpj}}';
}

function buildBodyTemplate(
  referenceBody: unknown,
  productId: string,
  personType: SollosTemplatePersonType,
): Prisma.InputJsonValue {
  const cloned = structuredClone(asRecord(referenceBody));
  cloned.CodigoProduto = productId;
  const params = asRecord(cloned.Parametros);
  params.CPFCNPJ = '${{document}}';
  params.TipoPessoa = personCode(personType);
  cloned.Parametros = params;
  return cloned as Prisma.InputJsonValue;
}

function isGeneratedTemplateLayout(layout: unknown): boolean {
  const metadata = asRecord(asRecord(layout).metadata);
  const sollosTemplate = asRecord(metadata.sollosTemplate);
  return (
    sollosTemplate.generator === 'consultas-pro-sollos-report-builder' &&
    sollosTemplate.publicationStatus === 'READY_FOR_MANUAL_REVIEW'
  );
}

function readReferenceLayout(value: unknown): ReportTemplate {
  const layout = asRecord(value);
  if (
    !Array.isArray(layout.frames) ||
    !Array.isArray(layout.elements) ||
    layout.frames.length === 0 ||
    layout.elements.length === 0
  ) {
    throw new Error(
      'O template visual do 1079 não possui páginas e componentes reutilizáveis.',
    );
  }
  return value as ReportTemplate;
}

function layoutFingerprint(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function assertDraftReady(draft: {
  externalId: string;
  status: string;
  attemptedSamples: number;
  successfulSamples: number;
  failedSamples: number;
  validSamples: number;
  invalidSamples: number;
  totalLeafPathCount: number;
  coveredLeafPathCount: number;
}) {
  const ready =
    draft.status === 'READY_FOR_MANUAL_REVIEW' &&
    draft.attemptedSamples > 0 &&
    draft.successfulSamples === draft.attemptedSamples &&
    draft.failedSamples === 0 &&
    draft.validSamples === draft.attemptedSamples &&
    draft.invalidSamples === 0 &&
    draft.coveredLeafPathCount === draft.totalLeafPathCount;
  if (!ready) {
    throw new Error(
      `O produto ${draft.externalId} não possui evidência integral de homologação.`,
    );
  }
}

async function main() {
  console.log(
    apply
      ? 'MODO APLICAR · catálogo inativo e templates privados'
      : 'MODO AUDITORIA · nenhuma alteração será gravada',
  );

  const provider = await prisma.provider.findFirst({
    where: {
      OR: [
        { slug: { equals: 'sollos', mode: 'insensitive' } },
        { name: { contains: 'sollos', mode: 'insensitive' } },
      ],
    },
  });
  if (!provider) throw new Error('Provedor Sollos não encontrado.');

  const referenceProduct = await prisma.providerProduct.findFirst({
    where: { providerId: provider.id, externalId: '1079' },
    select: { id: true, bodyTemplate: true, endpointPath: true },
  });
  if (!referenceProduct) {
    throw new Error('O produto de referência 1079 não está catalogado.');
  }
  if (referenceProduct.endpointPath.toLowerCase() !== '/json/homologa.aspx') {
    throw new Error('O produto 1079 não aponta para a homologação Sollos.');
  }

  const referenceTemplate = await prisma.template.findFirst({
    where: {
      visibility: 'GLOBAL',
      items: { some: { providerProductId: referenceProduct.id } },
      layout: { not: Prisma.DbNull },
    },
    select: { id: true, layout: true },
    orderBy: { createdAt: 'asc' },
  });
  if (!referenceTemplate) {
    throw new Error('O template visual global do 1079 não foi encontrado.');
  }
  const brandReference: SollosBrandReference = {
    templateId: referenceTemplate.id,
    layout: readReferenceLayout(referenceTemplate.layout),
  };
  const referenceFingerprint = layoutFingerprint(referenceTemplate.layout);

  const admin = await prisma.user.findFirst({
    where: { role: 'PLATFORM_ADMIN' },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  });
  if (!admin) throw new Error('Administrador da plataforma não encontrado.');

  const drafts = await prisma.sollosFactoryDraft.findMany({
    where: {
      providerId: provider.id,
      externalId: {
        in: SOLLOS_TEMPLATE_PRODUCTS.map((product) => product.productId),
      },
    },
  });
  const draftsById = new Map(drafts.map((draft) => [draft.externalId, draft]));
  const missingDrafts = SOLLOS_TEMPLATE_PRODUCTS.filter(
    (product) => !draftsById.has(product.productId),
  );
  if (missingDrafts.length > 0) {
    throw new Error(
      `Faltam rascunhos: ${missingDrafts
        .map((product) => product.productId)
        .join(', ')}.`,
    );
  }

  const targetTypeKeys = [
    ...new Set(
      drafts.flatMap((draft) =>
        normalizeFieldTypes(draft.fieldTypes).map((fieldType) => fieldType.key),
      ),
    ),
  ];
  const canonicalOwnership = await prisma.canonicalFieldCatalog.findMany({
    where: { pathKey: { in: targetTypeKeys } },
    select: {
      pathKey: true,
      mappings: {
        select: {
          product: {
            select: { providerId: true },
          },
        },
      },
    },
  });
  const providerCollisions = canonicalOwnership.filter((canonical) => {
    const ownerIds = new Set(
      canonical.mappings.map((mapping) => mapping.product.providerId),
    );
    return ownerIds.size > 0 && !ownerIds.has(provider.id);
  });
  if (providerCollisions.length > 0) {
    throw new Error(
      `Tipos pertencentes a outro provedor: ${providerCollisions
        .map((canonical) => canonical.pathKey)
        .join(', ')}.`,
    );
  }

  const existingProducts = await prisma.providerProduct.findMany({
    where: {
      providerId: provider.id,
      externalId: {
        in: SOLLOS_TEMPLATE_PRODUCTS.map((product) => product.productId),
      },
    },
  });
  const productsById = new Map(
    existingProducts.map((product) => [product.externalId ?? '', product]),
  );
  const unsafeExistingProducts = existingProducts.filter(
    (product) =>
      product.externalId !== '1079' &&
      (product.endpointPath.toLowerCase() !== '/json/homologa.aspx' ||
        product.isActive ||
        product.cost.toNumber() !== 0 ||
        product.consultationPrice.toNumber() !== 0),
  );
  if (unsafeExistingProducts.length > 0) {
    throw new Error(
      `Produtos existentes fora da política segura: ${unsafeExistingProducts
        .map((product) => product.externalId)
        .join(', ')}.`,
    );
  }

  let audited = 0;
  let createdProducts = 0;
  let createdTemplates = 0;
  let preserved = 0;

  for (const spec of SOLLOS_TEMPLATE_PRODUCTS) {
    const draft = draftsById.get(spec.productId)!;
    assertDraftReady(draft);
    const fieldTypes = normalizeFieldTypes(draft.fieldTypes);
    const fieldMappings = normalizeFieldMappings(draft.fieldMappings);
    const { mappedData, reportFieldTypes } = buildMappedSample(
      draft.representativeResponse,
      fieldTypes,
      fieldMappings,
      draft.typeItemFilters,
      draft.updatedAt,
    );
    const layout = buildSollosReportTemplate({
      productId: spec.productId,
      productName: spec.productName,
      personType: spec.personType,
      fieldTypes: reportFieldTypes,
      mappedData,
      samplingEvidence: {
        validSamples: draft.validSamples,
        totalSamples: draft.attemptedSamples,
        coveredLeafPathCount: draft.coveredLeafPathCount,
        totalLeafPathCount: draft.totalLeafPathCount,
        draftUpdatedAt: draft.updatedAt.toISOString(),
      },
      brandReference,
    });
    const audit = validateSollosReportTemplate(
      layout,
      reportFieldTypes,
      brandReference,
    );
    if (!audit.valid) {
      throw new Error(
        `Template ${spec.productId} inválido:\n${audit.errors.join('\n')}`,
      );
    }
    for (const frame of layout.frames) {
      const rendered = renderTemplateToHtml(
        layout,
        frame.id,
        mappedData,
      ).html;
      if (/\{\{[^}]+\}\}/.test(rendered)) {
        throw new Error(
          `Template ${spec.productId}, página ${frame.name}, deixou expressão sem resolver.`,
        );
      }
    }
    audited += 1;

    if (spec.preserveExistingTemplate) {
      preserved += 1;
      console.log(
        `[${spec.productId}] preservado · ${audit.typeCount} tipos · ${audit.fieldCount} campos no rascunho`,
      );
      continue;
    }

    let providerProduct = productsById.get(spec.productId);
    if (!providerProduct && apply) {
      providerProduct = await catalogSollosProduct(app, {
        providerId: provider.id,
        manualApproval: true,
        product: {
          name: spec.productName,
          externalId: spec.productId,
          endpointPath: '/json/homologa.aspx',
          method: 'POST',
          bodyTemplate: buildBodyTemplate(
            referenceProduct.bodyTemplate,
            spec.productId,
            spec.personType,
          ),
          sampleResponse: draft.representativeResponse,
          typeItemFilters: draft.typeItemFilters,
        },
        fieldTypes: fieldTypes.map((fieldType) => ({
          key: fieldType.key,
          label: fieldType.label,
          description: fieldType.description ?? undefined,
          uiItemFilters: fieldType.typeItemFilters,
          reportFieldConfig: fieldType.reportFieldConfig,
        })),
        fieldMappings: fieldMappings.map((mapping) => ({
          fieldTypeKey: mapping.fieldTypeKey,
          jsonPath: mapping.jsonPath,
          uiStartLine: mapping.uiStartLine,
          uiEndLine: mapping.uiEndLine,
        })),
        samplingEvidence: {
          attempted: draft.attemptedSamples,
          succeeded: draft.successfulSamples,
          failed: draft.failedSamples,
          uniquePathCount: draft.uniquePathCount,
          officialSampleCount: draft.officialSampleCount,
        },
      });
      productsById.set(spec.productId, providerProduct);
      createdProducts += 1;
    }

    const templateId = `sollos-template-${spec.productId}`;
    const existingTemplate = await prisma.template.findUnique({
      where: { id: templateId },
      select: { id: true, layout: true },
    });
    if (
      existingTemplate &&
      !isGeneratedTemplateLayout(existingTemplate.layout)
    ) {
      throw new Error(
        `O identificador ${templateId} já pertence a um template não gerado pela fábrica.`,
      );
    }

    if (apply && providerProduct) {
      let templateIdToLink = existingTemplate?.id;
      if (!existingTemplate || refreshGenerated) {
        const template = await prisma.template.upsert({
          where: { id: templateId },
          create: {
            id: templateId,
            userId: admin.id,
            name: spec.productName,
            description:
              `[REVISÃO MANUAL] Produto Sollos ${spec.productId}. ` +
              `${audit.typeCount} tipos, ${audit.fieldCount} campos e ${audit.frameCount} páginas. ` +
              'Homologação, custo zero e publicação privada.',
            visibility: 'PRIVATE',
            layout: layout as unknown as Prisma.InputJsonValue,
          },
          update: {
            name: spec.productName,
            description:
              `[REVISÃO MANUAL] Produto Sollos ${spec.productId}. ` +
              `${audit.typeCount} tipos, ${audit.fieldCount} campos e ${audit.frameCount} páginas. ` +
              'Homologação, custo zero e publicação privada.',
            visibility: 'PRIVATE',
            layout: layout as unknown as Prisma.InputJsonValue,
          },
        });
        templateIdToLink = template.id;
        if (!existingTemplate) createdTemplates += 1;
      }
      if (!templateIdToLink) {
        throw new Error(`Template ${spec.productId} não pôde ser preparado.`);
      }
      await prisma.templateItem.upsert({
        where: {
          templateId_providerProductId: {
            templateId: templateIdToLink,
            providerProductId: providerProduct.id,
          },
        },
        create: {
          templateId: templateIdToLink,
          providerProductId: providerProduct.id,
          sortOrder: 0,
          alias: spec.productName,
        },
        update: {
          sortOrder: 0,
          alias: spec.productName,
        },
      });
    }

    console.log(
      `[${spec.productId}] ${existingTemplate ? 'existente' : 'pronto'} · ` +
        `${audit.typeCount} tipos · ${audit.fieldCount} campos · ${audit.frameCount} páginas`,
    );
  }

  const protectedReference = await prisma.template.findUnique({
    where: { id: referenceTemplate.id },
    select: { layout: true },
  });
  if (
    !protectedReference ||
    layoutFingerprint(protectedReference.layout) !== referenceFingerprint
  ) {
    throw new Error(
      'A proteção falhou: o template visual 1079 foi alterado durante a operação.',
    );
  }

  console.log(
    `RESUMO · ${audited}/30 auditados · ${preserved} preservado · ` +
      `${createdProducts} produtos criados · ${createdTemplates} templates criados`,
  );
  if (!apply) {
    console.log('Use --apply somente após revisar esta auditoria.');
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
