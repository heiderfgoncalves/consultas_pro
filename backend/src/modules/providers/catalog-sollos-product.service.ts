import type { FastifyInstance } from 'fastify';
import type { Prisma } from '@prisma/client';
import { AppError, ConflictError, NotFoundError } from '../../core/errors';
import { mergeReportFieldConfigs } from '../templates/sollos-template-builder.service';
import {
  assertFactoryEndpointAllowed,
  assertFactoryProviderAllowed,
} from './factory-provider-policy';

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

/**
 * A trava de destino agora vem da politica por provedor. A regra da Sollos
 * (https + api.sollosconsultas.com.br + /json/homologa.aspx) e preservada
 * integralmente em FACTORY_PROVIDER_POLICIES.
 */

export async function catalogSollosProduct(
  app: FastifyInstance,
  input: CatalogSollosInput,
) {
  const provider = await app.prisma.provider.findUnique({
    where: { id: input.providerId },
  });
  if (!provider) throw new NotFoundError('Provedor não encontrado');
  const policy = assertFactoryProviderAllowed(provider);
  assertFactoryEndpointAllowed(
    policy,
    provider.baseUrl,
    input.product.endpointPath,
  );
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
        select: {
          id: true,
          reportFieldConfig: true,
          mappings: {
            select: {
              product: {
                select: { providerId: true },
              },
            },
          },
        },
      });
      if (current) {
        if (fieldType.reportFieldConfig !== undefined) {
          const mappedProviderIds = new Set(
            current.mappings.map((mapping) => mapping.product.providerId),
          );
          const belongsToSollos =
            mappedProviderIds.size === 0 ||
            mappedProviderIds.has(input.providerId);
          if (!belongsToSollos) {
            throw new AppError(
              409,
              'PROVIDER_CANONICAL_COLLISION',
              `O tipo ${fieldType.key} pertence a outro provedor e não pode ser reaproveitado pela Sollos`,
            );
          }
          const mergedConfig = mergeReportFieldConfigs(
            current.reportFieldConfig,
            fieldType.reportFieldConfig,
          );
          if (
            JSON.stringify(mergedConfig) !==
            JSON.stringify(current.reportFieldConfig)
          ) {
            await tx.canonicalFieldCatalog.update({
              where: { id: current.id },
              data: {
                reportFieldConfig:
                  mergedConfig as unknown as Prisma.InputJsonValue,
              },
            });
          }
        }
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
        code: `${policy.slug}-${input.product.externalId}`,
        // Destino ja validado contra a allowlist do provedor.
        externalId: input.product.externalId,
        endpointPath: input.product.endpointPath,
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
