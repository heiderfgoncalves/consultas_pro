import type { FastifyInstance } from 'fastify';
import type { Prisma } from '@prisma/client';
import { AppError, ConflictError, NotFoundError } from '../../core/errors';

type CatalogSollosInput = {
  providerId: string;
  manualApproval: true;
  product: {
    name: string;
    externalId: string;
    endpointPath: string;
    method: 'POST';
    bodyTemplate?: unknown;
    sampleResponse?: unknown;
    typeItemFilters?: unknown;
  };
  fieldTypes: Array<{
    key: string;
    label: string;
    description?: string;
    uiItemFilters?: unknown;
    reportFieldConfig?: unknown;
  }>;
  fieldMappings: Array<{
    fieldTypeKey: string;
    jsonPath: string;
    uiStartLine?: number;
    uiEndLine?: number;
  }>;
  samplingEvidence: {
    attempted: number;
    succeeded: number;
    failed: number;
    uniquePathCount: number;
    officialSampleCount: number;
  };
};

function isSollosProvider(provider: { name: string; slug: string }) {
  return (
    provider.slug.toLowerCase() === 'sollos' ||
    provider.name.toLowerCase().includes('sollos')
  );
}

function assertHomologationEndpoint(
  baseUrl: string,
  endpointPath: string,
) {
  const target = new URL(endpointPath, baseUrl);
  const safe =
    target.protocol === 'https:' &&
    target.hostname === 'api.sollosconsultas.com.br' &&
    target.pathname.toLowerCase() === '/json/homologa.aspx';

  if (!safe) {
    throw new AppError(
      400,
      'HOMOLOGATION_ENDPOINT_REQUIRED',
      'A Fábrica de Templates permite catalogar somente a homologação da Sollos',
    );
  }
}

export async function catalogSollosProduct(
  app: FastifyInstance,
  input: CatalogSollosInput,
) {
  const provider = await app.prisma.provider.findUnique({
    where: { id: input.providerId },
  });
  if (!provider) throw new NotFoundError('Provedor Sollos não encontrado');
  if (!isSollosProvider(provider)) {
    throw new AppError(
      400,
      'SOLLOS_PROVIDER_REQUIRED',
      'O catálogo oficial só pode ser aplicado ao provedor Sollos',
    );
  }
  assertHomologationEndpoint(provider.baseUrl, input.product.endpointPath);
  if (
    input.product.bodyTemplate === undefined ||
    input.product.sampleResponse === undefined
  ) {
    throw new AppError(
      400,
      'CATALOG_EVIDENCE_REQUIRED',
      'A configuração de requisição e a amostra validada são obrigatórias',
    );
  }

  const existing = await app.prisma.providerProduct.findFirst({
    where: {
      providerId: input.providerId,
      externalId: input.product.externalId,
    },
    select: { id: true },
  });
  if (existing) {
    throw new ConflictError(
      `O produto Sollos ${input.product.externalId} já está catalogado`,
    );
  }

  const requestedTypes = new Map(
    input.fieldTypes.map((fieldType) => [fieldType.key, fieldType]),
  );
  const missingType = input.fieldMappings.find(
    (mapping) => !requestedTypes.has(mapping.fieldTypeKey),
  );
  if (missingType) {
    throw new AppError(
      400,
      'MAPPING_TYPE_MISSING',
      `O tipo ${missingType.fieldTypeKey} não acompanha o mapeamento`,
    );
  }

  return app.prisma.$transaction(async (tx) => {
    const canonicalIds = new Map<string, string>();

    for (const fieldType of requestedTypes.values()) {
      const current = await tx.canonicalFieldCatalog.findUnique({
        where: { pathKey: fieldType.key },
        select: { id: true },
      });
      if (current) {
        canonicalIds.set(fieldType.key, current.id);
        continue;
      }

      const created = await tx.canonicalFieldCatalog.create({
        data: {
          pathKey: fieldType.key,
          label: fieldType.label,
          dataType: 'object',
          description:
            fieldType.description ??
            `Tipo descoberto e aprovado na Fábrica de Templates Sollos`,
          ...(fieldType.uiItemFilters !== undefined
            ? {
                uiItemFilters:
                  fieldType.uiItemFilters as Prisma.InputJsonValue,
              }
            : {}),
          ...(fieldType.reportFieldConfig !== undefined
            ? {
                reportFieldConfig:
                  fieldType.reportFieldConfig as Prisma.InputJsonValue,
              }
            : {}),
        },
      });
      canonicalIds.set(fieldType.key, created.id);
    }

    const product = await tx.providerProduct.create({
      data: {
        providerId: input.providerId,
        name: input.product.name,
        code: `sollos-${input.product.externalId}`,
        externalId: input.product.externalId,
        endpointPath: '/json/homologa.aspx',
        method: 'POST',
        cost: 0,
        consultationPrice: 0,
        isActive: false,
        bodyTemplate: input.product.bodyTemplate as Prisma.InputJsonValue,
        sampleResponse: input.product.sampleResponse as Prisma.InputJsonValue,
        typeItemFilters:
          input.product.typeItemFilters === undefined
            ? undefined
            : (input.product.typeItemFilters as Prisma.InputJsonValue),
        integrationOverrides: {
          onExhausted: 'require_manual_review',
        },
      },
    });

    for (const [sortOrder, mapping] of input.fieldMappings.entries()) {
      const canonicalFieldId = canonicalIds.get(mapping.fieldTypeKey);
      if (!canonicalFieldId) {
        throw new AppError(
          400,
          'MAPPING_TYPE_MISSING',
          `O tipo ${mapping.fieldTypeKey} não pôde ser catalogado`,
        );
      }
      await tx.providerFieldMapping.create({
        data: {
          productId: product.id,
          canonicalFieldId,
          sourcePath: mapping.jsonPath,
          uiStartLine: mapping.uiStartLine,
          uiEndLine: mapping.uiEndLine,
          sortOrder,
          notes: JSON.stringify({
            source: 'fabrica-templates-sollos',
            manualApproval: input.manualApproval,
            samplingEvidence: input.samplingEvidence,
          }),
        },
      });
    }

    return tx.providerProduct.findUniqueOrThrow({
      where: { id: product.id },
      include: {
        mappings: {
          include: { canonicalField: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
  });
}
