import type { FastifyInstance } from 'fastify';
import type { HttpMethod, Prisma, ProviderAuthType, ProviderProduct } from '@prisma/client';
import { ConflictError, NotFoundError } from '../../core/errors';
import { getAdminTargetTenant, getEffectiveIntegrationSettingsForTenant } from '../../lib/integration-settings';
import { callProviderOperation, callProviderProduct } from './provider-client.service';
import { normalizeProviderPayload } from './normalization.service';
import { mergeNormalizedPayloads } from './merge.service';
import { generateOpaqueToken, sha256 } from '../../lib/hash';

export async function createProvider(app: FastifyInstance, payload: {
  name: string;
  slug: string;
  baseUrl: string;
  authType?: ProviderAuthType;
  credentials?: Record<string, unknown>;
  defaultHeaders?: Record<string, string>;
}) {
  const exists = await app.prisma.provider.findUnique({ where: { slug: payload.slug } });
  if (exists) throw new ConflictError('Já existe um provedor com este slug');

  return app.prisma.provider.create({
    data: payload as any,
  });
}

function productCallSlice(
  product: Pick<ProviderProduct, 'endpointPath' | 'method' | 'headersTemplate' | 'queryTemplate' | 'bodyTemplate' | 'timeoutMs'>,
): ProviderProduct {
  return product as ProviderProduct;
}

export async function testProviderProduct(app: FastifyInstance, input: {
  productId: string;
  actorUserId?: string;
  context: Record<string, unknown>;
  bodyTemplate?: unknown;
  queryTemplate?: Record<string, unknown>;
  headersTemplate?: Record<string, unknown>;
}) {
  const product = await app.prisma.providerProduct.findUnique({
    where: { id: input.productId },
    include: {
      provider: true,
      mappings: {
        include: { canonicalField: true },
        orderBy: { sortOrder: 'asc' },
      },
    },
  });

  if (!product) throw new NotFoundError('Produto do provedor não encontrado');

  const forCall = productCallSlice({
    endpointPath: product.endpointPath,
    method: product.method,
    headersTemplate: input.headersTemplate !== undefined ? input.headersTemplate as never : product.headersTemplate,
    queryTemplate: input.queryTemplate !== undefined ? input.queryTemplate as never : product.queryTemplate,
    bodyTemplate: input.bodyTemplate !== undefined ? input.bodyTemplate as never : product.bodyTemplate,
    timeoutMs: product.timeoutMs,
  });

  const execution = await callProviderProduct(app, product.provider, forCall, input.context);
  const normalized = normalizeProviderPayload(execution.response.payload, product.mappings);

  // Gerar um protocolo único no formato REQ-xxxxxxxx no ato do teste
  const protocol = `REQ-${Math.floor(10000000 + Math.random() * 90000000)}`;
  if (execution.response.payload && typeof execution.response.payload === 'object' && !Array.isArray(execution.response.payload)) {
    (execution.response.payload as any).protocol = protocol;
  }
  if (normalized && typeof normalized === 'object' && !Array.isArray(normalized)) {
    (normalized as any).protocol = protocol;
  }

  const adminTenant = await getAdminTargetTenant(app.prisma);
  const integrationSettings = await getEffectiveIntegrationSettingsForTenant(
    app.prisma,
    adminTenant?.id ?? null,
  );
  if (integrationSettings.verboseProviderTestLogs) {
    app.log.debug({ productId: input.productId, request: execution.request }, 'provider_test_verbose');
  }

  const log = await app.prisma.providerTestLog.create({
    data: {
      providerId: product.providerId,
      productId: product.id,
      createdById: input.actorUserId,
      requestPayload: execution.request as never,
      responsePayload: execution.response.payload as never,
      normalizedPayload: normalized as never,
      statusCode: execution.response.statusCode,
      success: execution.response.statusCode >= 200 && execution.response.statusCode < 300,
    },
  });

  return {
    testLogId: log.id,
    request: execution.request,
    response: execution.response,
    normalizedPayload: normalized,
  };
}

/** Chamada de teste sem produto persistido (ex.: formulário "Nova consulta"). */
export async function testProviderProductDraft(app: FastifyInstance, input: {
  providerId: string;
  endpointPath: string;
  method: HttpMethod;
  actorUserId?: string;
  context: Record<string, unknown>;
  bodyTemplate?: unknown;
  queryTemplate?: Record<string, unknown>;
  headersTemplate?: Record<string, unknown>;
}) {
  const provider = await app.prisma.provider.findUnique({
    where: { id: input.providerId },
  });

  if (!provider) throw new NotFoundError('Provedor não encontrado');

  const productStub = {
    endpointPath: input.endpointPath,
    method: input.method,
    headersTemplate: input.headersTemplate !== undefined ? input.headersTemplate as never : null,
    queryTemplate: input.queryTemplate !== undefined ? input.queryTemplate as never : null,
    bodyTemplate: input.bodyTemplate !== undefined ? input.bodyTemplate as never : null,
    timeoutMs: null,
  } as ProviderProduct;

  const execution = await callProviderProduct(app, provider, productStub, input.context);

  // Gerar um protocolo único no formato REQ-xxxxxxxx no ato do teste
  const protocol = `REQ-${Math.floor(10000000 + Math.random() * 90000000)}`;
  if (execution.response.payload && typeof execution.response.payload === 'object' && !Array.isArray(execution.response.payload)) {
    (execution.response.payload as any).protocol = protocol;
  }

  const adminTenantDraft = await getAdminTargetTenant(app.prisma);
  const integrationSettingsDraft = await getEffectiveIntegrationSettingsForTenant(
    app.prisma,
    adminTenantDraft?.id ?? null,
  );
  if (integrationSettingsDraft.verboseProviderTestLogs) {
    app.log.debug({ providerId: input.providerId, request: execution.request }, 'provider_test_verbose_draft');
  }

  const log = await app.prisma.providerTestLog.create({
    data: {
      providerId: provider.id,
      productId: null,
      createdById: input.actorUserId,
      requestPayload: execution.request as never,
      responsePayload: execution.response.payload as never,
      statusCode: execution.response.statusCode,
      success: execution.response.statusCode >= 200 && execution.response.statusCode < 300,
    },
  });

  return {
    testLogId: log.id,
    request: execution.request,
    response: execution.response,
    normalizedPayload: null as null,
  };
}

export async function testProviderOperation(app: FastifyInstance, input: {
  operationId: string;
  actorUserId?: string;
  context: Record<string, unknown>;
}) {
  const operation = await app.prisma.providerOperation.findUnique({
    where: { id: input.operationId },
    include: { provider: true },
  });

  if (!operation) throw new NotFoundError('Operação do provedor não encontrada');

  const execution = await callProviderOperation(app, operation.provider, operation, input.context);

  const log = await app.prisma.providerTestLog.create({
    data: {
      providerId: operation.providerId,
      operationId: operation.id,
      createdById: input.actorUserId,
      requestPayload: execution.request as never,
      responsePayload: execution.response.payload as never,
      statusCode: execution.response.statusCode,
      success: execution.response.statusCode >= 200 && execution.response.statusCode < 300,
    },
  });

  return {
    testLogId: log.id,
    request: execution.request,
    response: execution.response,
  };
}

export async function previewMerge(app: FastifyInstance, input: {
  executionIds?: string[];
  testLogIds?: string[];
  actorUserId?: string;
}) {
  const [executions, testLogs] = await Promise.all([
    input.executionIds?.length
      ? app.prisma.consultationExecution.findMany({
          where: { id: { in: input.executionIds } },
          select: { id: true, normalizedPayload: true },
        })
      : Promise.resolve([]),
    input.testLogIds?.length
      ? app.prisma.providerTestLog.findMany({
          where: { id: { in: input.testLogIds } },
          select: { id: true, normalizedPayload: true },
        })
      : Promise.resolve([]),
  ]);

  const payloads = [
    ...executions.map((item) => item.normalizedPayload).filter(Boolean),
    ...testLogs.map((item) => item.normalizedPayload).filter(Boolean),
  ] as Array<Record<string, unknown>>;

  const mergedPayload = mergeNormalizedPayloads(payloads);

  if (mergedPayload && typeof mergedPayload === 'object' && !(mergedPayload as any).protocol) {
    (mergedPayload as any).protocol = `REQ-${Math.floor(10000000 + Math.random() * 90000000)}`;
  }

  const log = await app.prisma.mergeLog.create({
    data: {
      createdById: input.actorUserId,
      sourceReferenceIds: [
        ...executions.map((item) => item.id),
        ...testLogs.map((item) => item.id),
      ],
      mergedPayload: mergedPayload as never,
      strategy: 'DEEP_MERGE_ARRAY_DEDUP',
    },
  });

  return {
    mergeLogId: log.id,
    mergedPayload,
    sourceCount: payloads.length,
  };
}

export async function createApiToken(app: FastifyInstance, input: {
  tenantId?: string;
  companyId?: string;
  createdById?: string;
  label: string;
  scopes?: Record<string, unknown>;
  expiresAt?: Date | null;
  allowedOrigins?: string[];
}) {
  if (input.companyId && input.tenantId) {
    throw new ConflictError('Informe apenas tenantId ou companyId para o token');
  }

  let ownerType: 'TENANT' | 'COMPANY' | 'INTERNAL' = 'INTERNAL';
  let tenantId: string | undefined;
  let companyId: string | undefined;

  if (input.companyId) {
    const company = await app.prisma.company.findUnique({ where: { id: input.companyId } });
    if (!company) throw new NotFoundError('Empresa não encontrada');
    ownerType = 'COMPANY';
    companyId = company.id;
    tenantId = company.tenantId ?? undefined;
  } else if (input.tenantId) {
    const tenant = await app.prisma.tenant.findUnique({ where: { id: input.tenantId } });
    if (!tenant) throw new NotFoundError('Tenant não encontrado');
    ownerType = 'TENANT';
    tenantId = tenant.id;
  }

  const rawToken = generateOpaqueToken(24);
  const tokenHash = sha256(rawToken);

  const apiToken = await app.prisma.apiToken.create({
    data: {
      ownerType,
      tenantId,
      companyId,
      createdById: input.createdById,
      label: input.label,
      tokenHash,
      last4: rawToken.slice(-4),
      scopes: input.scopes as Prisma.InputJsonValue | undefined,
      allowedOrigins: input.allowedOrigins ? (input.allowedOrigins as Prisma.InputJsonValue) : undefined,
      expiresAt: input.expiresAt ?? null,
    },
  });

  return {
    token: rawToken,
    apiToken,
  };
}
