import type { FastifyInstance } from 'fastify';
import { Prisma, Role } from '@prisma/client';
import { authenticate, requireRoles } from '../../core/auth';
import { ConflictError, NotFoundError } from '../../core/errors';
import { ok } from '../../core/http';
import { createInvite } from '../auth/auth.service';
import { hashPassword } from '../../lib/hash';
import { normalizeDocument } from '../../lib/documents';
import { slugify } from '../../lib/slug';
import {
  createAdminCompanySchema,
  createAdminUserSchema,
  createCanonicalFieldSchema,
  createCompanyInviteSchema,
  createConsultationTypeSchema,
  createMappingSchema,
  createProviderOperationSchema,
  createProviderProductSchema,
  createProviderSchema,
  createTokenSchema,
  linkUserToCompanySchema,
  previewMergeSchema,
  testProductDraftSchema,
  testProductSchema,
  updateCanonicalFieldSchema,
  updateMappingSchema,
  updateProviderOperationSchema,
  updateProviderProductSchema,
  updateProviderSchema,
} from './admin.schemas';
import {
  createApiToken,
  createProvider,
  previewMerge,
  testProviderOperation,
  testProviderProduct,
  testProviderProductDraft,
} from '../providers/providers.service';

export async function registerAdminRoutes(app: FastifyInstance) {
  const adminOnly = { preHandler: [authenticate, requireRoles(['PLATFORM_ADMIN'])] };

  app.get('/admin/dashboard', adminOnly, async (_request, reply) => {
    const [companyCount, userCount, consultationCount, providerCount, totals] = await Promise.all([
      app.prisma.company.count(),
      app.prisma.user.count(),
      app.prisma.consultation.count(),
      app.prisma.provider.count(),
      app.prisma.ledgerEntry.aggregate({
        _sum: { amount: true },
      }),
    ]);

    return ok(reply, {
      companyCount,
      userCount,
      consultationCount,
      providerCount,
      totalLedgerVolume: totals._sum.amount ?? 0,
    });
  });

  app.get('/admin/technical/overview', adminOnly, async (_request, reply) => {
    const [failedExecutions, queuedConsultations, recentTests] = await Promise.all([
      app.prisma.consultationExecution.count({ where: { status: 'FAILED' } }),
      app.prisma.consultation.count({ where: { status: 'QUEUED' } }),
      app.prisma.providerTestLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);

    return ok(reply, {
      failedExecutions,
      queuedConsultations,
      recentTests,
    });
  });

  app.get('/admin/users', adminOnly, async (_request, reply) => {
    const users = await app.prisma.user.findMany({
      include: { company: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    return ok(reply, users);
  });

  app.post('/admin/users', adminOnly, async (request, reply) => {
    const payload = createAdminUserSchema.parse(request.body);

    const user = await app.prisma.user.create({
      data: {
        fullName: payload.fullName,
        email: payload.email,
        document: normalizeDocument(payload.document),
        phone: payload.phone,
        passwordHash: await hashPassword(payload.password),
        role: payload.role as Role,
        companyId: payload.companyId ?? null,
      },
    });

    return ok(reply, user, 201);
  });

  app.patch('/admin/users/:userId/company', adminOnly, async (request, reply) => {
    const params = request.params as { userId: string };
    const payload = linkUserToCompanySchema.parse(request.body);

    const updated = await app.prisma.user.update({
      where: { id: params.userId },
      data: { companyId: payload.companyId },
    });

    return ok(reply, updated);
  });

  app.get('/admin/companies', adminOnly, async (_request, reply) => {
    const companies = await app.prisma.company.findMany({
      include: {
        wallet: true,
        _count: { select: { users: true, consultations: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    return ok(reply, companies);
  });

  app.post('/admin/companies', adminOnly, async (request, reply) => {
    const payload = createAdminCompanySchema.parse(request.body);
    const slugBase = slugify(payload.name);
    let slug = slugBase;
    let cursor = 1;

    while (await app.prisma.company.findUnique({ where: { slug } })) {
      cursor += 1;
      slug = `${slugBase}-${cursor}`;
    }

    const company = await app.prisma.company.create({
      data: {
        tenantId: payload.tenantId,
        name: payload.name,
        slug,
        document: normalizeDocument(payload.document),
        email: payload.email,
        phone: payload.phone,
        wallet: { create: { balance: 0 } },
      },
      include: { wallet: true },
    });

    return ok(reply, company, 201);
  });

  app.post('/admin/invites/company', adminOnly, async (request, reply) => {
    const payload = createCompanyInviteSchema.parse(request.body);
    return ok(reply, await createInvite(app, {
      type: 'COMPANY',
      email: payload.email,
      invitedByUserId: request.authUser?.userId,
      metadata: payload.metadata,
    }), 201);
  });

  app.post('/admin/invites/user', adminOnly, async (request, reply) => {
    const body = request.body as {
      email: string;
      companyId: string;
      roleToAssign: 'COMPANY_MANAGER' | 'USER';
      metadata?: Record<string, unknown>;
    };

    return ok(reply, await createInvite(app, {
      type: 'USER',
      email: body.email,
      companyId: body.companyId,
      roleToAssign: body.roleToAssign,
      invitedByUserId: request.authUser?.userId,
      metadata: body.metadata,
    }), 201);
  });

  app.get('/admin/catalog/consultation-types', adminOnly, async (_request, reply) => {
    return ok(reply, await app.prisma.consultationType.findMany({
      orderBy: { name: 'asc' },
    }));
  });

  app.post('/admin/catalog/consultation-types', adminOnly, async (request, reply) => {
    const payload = createConsultationTypeSchema.parse(request.body);
    return ok(reply, await app.prisma.consultationType.create({ data: payload }), 201);
  });

  app.get('/admin/catalog/canonical-fields', adminOnly, async (_request, reply) => {
    return ok(reply, await app.prisma.canonicalFieldCatalog.findMany({
      orderBy: { pathKey: 'asc' },
    }));
  });

  app.post('/admin/catalog/canonical-fields', adminOnly, async (request, reply) => {
    const payload = createCanonicalFieldSchema.parse(request.body);
    return ok(reply, await app.prisma.canonicalFieldCatalog.create({ data: payload }), 201);
  });

  app.patch('/admin/catalog/canonical-fields/:fieldId', adminOnly, async (request, reply) => {
    const params = request.params as { fieldId: string };
    const payload = updateCanonicalFieldSchema.parse(request.body);

    const field = await app.prisma.canonicalFieldCatalog.findUnique({ where: { id: params.fieldId } });
    if (!field) throw new NotFoundError('Campo canônico não encontrado');

    const updated = await app.prisma.canonicalFieldCatalog.update({
      where: { id: params.fieldId },
      data: payload,
    });
    return ok(reply, updated);
  });

  app.delete('/admin/catalog/canonical-fields/:fieldId', adminOnly, async (request, reply) => {
    const params = request.params as { fieldId: string };

    const mappingCount = await app.prisma.providerFieldMapping.count({
      where: { canonicalFieldId: params.fieldId },
    });
    if (mappingCount > 0) {
      throw new ConflictError('Não é possível remover: existem mapeamentos de produto usando este campo');
    }

    await app.prisma.canonicalFieldCatalog.delete({ where: { id: params.fieldId } });
    return ok(reply, { deleted: true });
  });

  app.get('/admin/providers', adminOnly, async (_request, reply) => {
    return ok(reply, await app.prisma.provider.findMany({
      include: {
        operations: { orderBy: { createdAt: 'asc' } },
        products: {
          include: {
            consultationType: true,
            mappings: {
              include: { canonicalField: true },
              orderBy: { sortOrder: 'asc' },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    }));
  });

  app.post('/admin/providers', adminOnly, async (request, reply) => {
    const payload = createProviderSchema.parse(request.body);
    return ok(reply, await createProvider(app, payload), 201);
  });

  app.patch('/admin/providers/:providerId', adminOnly, async (request, reply) => {
    const params = request.params as { providerId: string };
    const payload = updateProviderSchema.parse(request.body);

    const current = await app.prisma.provider.findUnique({ where: { id: params.providerId } });
    if (!current) throw new NotFoundError('Provedor não encontrado');

    if (payload.slug && payload.slug !== current.slug) {
      const taken = await app.prisma.provider.findUnique({ where: { slug: payload.slug } });
      if (taken) throw new ConflictError('Já existe um provedor com este slug');
    }

    const updated = await app.prisma.provider.update({
      where: { id: params.providerId },
      data: payload,
      include: {
        operations: true,
        products: {
          include: {
            consultationType: true,
            mappings: { include: { canonicalField: true }, orderBy: { sortOrder: 'asc' } },
          },
        },
      },
    });

    return ok(reply, updated);
  });

  app.delete('/admin/providers/:providerId', adminOnly, async (request, reply) => {
    const params = request.params as { providerId: string };

    const execCount = await app.prisma.consultationExecution.count({
      where: { providerId: params.providerId },
    });
    if (execCount > 0) {
      throw new ConflictError('Não é possível remover o provedor: existem execuções de consulta vinculadas');
    }

    try {
      await app.prisma.$transaction(async (tx) => {
        await tx.providerTestLog.deleteMany({ where: { providerId: params.providerId } });
        const products = await tx.providerProduct.findMany({
          where: { providerId: params.providerId },
          select: { id: true },
        });
        const productIds = products.map((p) => p.id);
        if (productIds.length) {
          const consultationItems = await tx.consultationItem.findMany({
            where: { providerProductId: { in: productIds } },
            select: { id: true },
          });
          const consultationItemIds = consultationItems.map((i) => i.id);
          await tx.consultationExecution.deleteMany({
            where: {
              OR: [
                { productId: { in: productIds } },
                ...(consultationItemIds.length
                  ? [{ consultationItemId: { in: consultationItemIds } }]
                  : []),
              ],
            },
          });
          await tx.templateItem.deleteMany({ where: { providerProductId: { in: productIds } } });
          await tx.consultationItem.deleteMany({ where: { providerProductId: { in: productIds } } });
          await tx.providerFieldMapping.deleteMany({ where: { productId: { in: productIds } } });
          await tx.providerProduct.deleteMany({ where: { id: { in: productIds } } });
        }
        await tx.providerOperation.deleteMany({ where: { providerId: params.providerId } });
        await tx.provider.delete({ where: { id: params.providerId } });
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new ConflictError('Não é possível remover o provedor: existem referências no banco');
      }
      throw error;
    }

    return ok(reply, { deleted: true });
  });

  app.post('/admin/providers/operations', adminOnly, async (request, reply) => {
    const payload = createProviderOperationSchema.parse(request.body);
    return ok(reply, await app.prisma.providerOperation.create({
      data: payload,
    }), 201);
  });

  app.patch('/admin/providers/operations/:operationId', adminOnly, async (request, reply) => {
    const params = request.params as { operationId: string };
    const payload = updateProviderOperationSchema.parse(request.body);

    const op = await app.prisma.providerOperation.findUnique({ where: { id: params.operationId } });
    if (!op) throw new NotFoundError('Operação não encontrada');

    const updated = await app.prisma.providerOperation.update({
      where: { id: params.operationId },
      data: payload,
    });
    return ok(reply, updated);
  });

  app.delete('/admin/providers/operations/:operationId', adminOnly, async (request, reply) => {
    const params = request.params as { operationId: string };

    try {
      await app.prisma.providerTestLog.deleteMany({ where: { operationId: params.operationId } });
      await app.prisma.providerOperation.delete({ where: { id: params.operationId } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new ConflictError('Não é possível remover a operação: existem referências no banco');
      }
      throw error;
    }

    return ok(reply, { deleted: true });
  });

  app.post('/admin/providers/products', adminOnly, async (request, reply) => {
    const payload = createProviderProductSchema.parse(request.body);
    return ok(reply, await app.prisma.providerProduct.create({
      data: {
        ...payload,
        cost: payload.cost,
      },
    }), 201);
  });

  app.patch('/admin/providers/products/:productId', adminOnly, async (request, reply) => {
    const params = request.params as { productId: string };
    const payload = updateProviderProductSchema.parse(request.body);

    const product = await app.prisma.providerProduct.findUnique({ where: { id: params.productId } });
    if (!product) throw new NotFoundError('Produto não encontrado');

    if (payload.code && payload.code !== product.code) {
      const taken = await app.prisma.providerProduct.findUnique({
        where: { providerId_code: { providerId: product.providerId, code: payload.code } },
      });
      if (taken) throw new ConflictError('Já existe um produto com este código neste provedor');
    }

    const data: Prisma.ProviderProductUpdateInput = {};
    if (payload.consultationTypeId !== undefined) {
      data.consultationType = payload.consultationTypeId
        ? { connect: { id: payload.consultationTypeId } }
        : { disconnect: true };
    }
    if (payload.name !== undefined) data.name = payload.name;
    if (payload.code !== undefined) data.code = payload.code;
    if (payload.externalId !== undefined) data.externalId = payload.externalId;
    if (payload.endpointPath !== undefined) data.endpointPath = payload.endpointPath;
    if (payload.method !== undefined) data.method = payload.method;
    if (payload.timeoutMs !== undefined) data.timeoutMs = payload.timeoutMs;
    if (payload.cost !== undefined) data.cost = payload.cost;
    if (payload.isActive !== undefined) data.isActive = payload.isActive;
    if (payload.queryTemplate !== undefined) {
      data.queryTemplate = payload.queryTemplate === null ? Prisma.JsonNull : (payload.queryTemplate as Prisma.InputJsonValue);
    }
    if (payload.bodyTemplate !== undefined) {
      data.bodyTemplate = payload.bodyTemplate === null ? Prisma.JsonNull : (payload.bodyTemplate as Prisma.InputJsonValue);
    }
    if (payload.headersTemplate !== undefined) {
      data.headersTemplate = payload.headersTemplate === null ? Prisma.JsonNull : (payload.headersTemplate as Prisma.InputJsonValue);
    }
    if (payload.sampleRequest !== undefined) {
      data.sampleRequest = payload.sampleRequest === null ? Prisma.JsonNull : (payload.sampleRequest as Prisma.InputJsonValue);
    }
    if (payload.sampleResponse !== undefined) {
      data.sampleResponse = payload.sampleResponse === null ? Prisma.JsonNull : (payload.sampleResponse as Prisma.InputJsonValue);
    }

    const updated = await app.prisma.providerProduct.update({
      where: { id: params.productId },
      data,
      include: {
        consultationType: true,
        mappings: { include: { canonicalField: true }, orderBy: { sortOrder: 'asc' } },
      },
    });

    return ok(reply, updated);
  });

  app.delete('/admin/providers/products/:productId', adminOnly, async (request, reply) => {
    const params = request.params as { productId: string };

    const execCount = await app.prisma.consultationExecution.count({
      where: { productId: params.productId },
    });
    if (execCount > 0) {
      throw new ConflictError('Não é possível remover o produto: existem execuções vinculadas');
    }

    try {
      await app.prisma.$transaction(async (tx) => {
        const items = await tx.consultationItem.findMany({
          where: { providerProductId: params.productId },
          select: { id: true },
        });
        const itemIds = items.map((i) => i.id);
        await tx.consultationExecution.deleteMany({
          where: {
            OR: [
              { productId: params.productId },
              ...(itemIds.length ? [{ consultationItemId: { in: itemIds } }] : []),
            ],
          },
        });
        await tx.templateItem.deleteMany({ where: { providerProductId: params.productId } });
        await tx.consultationItem.deleteMany({ where: { providerProductId: params.productId } });
        await tx.providerTestLog.deleteMany({ where: { productId: params.productId } });
        await tx.providerFieldMapping.deleteMany({ where: { productId: params.productId } });
        await tx.providerProduct.delete({ where: { id: params.productId } });
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new ConflictError('Não é possível remover o produto: existem referências no banco');
      }
      throw error;
    }

    return ok(reply, { deleted: true });
  });

  app.post('/admin/providers/mappings', adminOnly, async (request, reply) => {
    const payload = createMappingSchema.parse(request.body);
    return ok(reply, await app.prisma.providerFieldMapping.create({
      data: payload,
    }), 201);
  });

  app.patch('/admin/providers/mappings/:mappingId', adminOnly, async (request, reply) => {
    const params = request.params as { mappingId: string };
    const payload = updateMappingSchema.parse(request.body);

    const mapping = await app.prisma.providerFieldMapping.findUnique({ where: { id: params.mappingId } });
    if (!mapping) throw new NotFoundError('Mapeamento não encontrado');

    const updated = await app.prisma.providerFieldMapping.update({
      where: { id: params.mappingId },
      data: payload,
      include: { canonicalField: true, product: true },
    });

    return ok(reply, updated);
  });

  app.delete('/admin/providers/mappings/:mappingId', adminOnly, async (request, reply) => {
    const params = request.params as { mappingId: string };

    const mapping = await app.prisma.providerFieldMapping.findUnique({ where: { id: params.mappingId } });
    if (!mapping) throw new NotFoundError('Mapeamento não encontrado');

    await app.prisma.providerFieldMapping.delete({ where: { id: params.mappingId } });
    return ok(reply, { deleted: true });
  });

  app.get('/admin/providers/:providerId/config', adminOnly, async (request, reply) => {
    const params = request.params as { providerId: string };
    return ok(reply, await app.prisma.provider.findUnique({
      where: { id: params.providerId },
      include: {
        operations: true,
        products: {
          include: {
            consultationType: true,
            mappings: {
              include: { canonicalField: true },
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
      },
    }));
  });

  app.post('/admin/providers/products/test-draft', adminOnly, async (request, reply) => {
    const payload = testProductDraftSchema.parse(request.body);

    return ok(reply, await testProviderProductDraft(app, {
      providerId: payload.providerId,
      endpointPath: payload.endpointPath,
      method: payload.method,
      actorUserId: request.authUser?.userId,
      context: payload.context,
      bodyTemplate: payload.bodyTemplate,
      queryTemplate: payload.queryTemplate,
      headersTemplate: payload.headersTemplate,
    }));
  });

  app.post('/admin/providers/products/:productId/test', adminOnly, async (request, reply) => {
    const params = request.params as { productId: string };
    const payload = testProductSchema.parse(request.body);

    return ok(reply, await testProviderProduct(app, {
      productId: params.productId,
      actorUserId: request.authUser?.userId,
      context: payload.context,
      bodyTemplate: payload.bodyTemplate,
      queryTemplate: payload.queryTemplate,
      headersTemplate: payload.headersTemplate,
    }));
  });

  app.post('/admin/providers/operations/:operationId/test', adminOnly, async (request, reply) => {
    const params = request.params as { operationId: string };
    const payload = testProductSchema.parse(request.body);

    return ok(reply, await testProviderOperation(app, {
      operationId: params.operationId,
      actorUserId: request.authUser?.userId,
      context: payload.context,
    }));
  });

  app.post('/admin/merge/preview', adminOnly, async (request, reply) => {
    const payload = previewMergeSchema.parse(request.body);
    return ok(reply, await previewMerge(app, {
      actorUserId: request.authUser?.userId,
      executionIds: payload.executionIds,
      testLogIds: payload.testLogIds,
    }));
  });

  app.get('/admin/test-logs', adminOnly, async (_request, reply) => {
    return ok(reply, await app.prisma.providerTestLog.findMany({
      include: {
        provider: true,
        product: true,
        operation: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }));
  });

  app.get('/admin/tokens', adminOnly, async (_request, reply) => {
    return ok(reply, await app.prisma.apiToken.findMany({
      include: { tenant: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }));
  });

  app.post('/admin/tokens', adminOnly, async (request, reply) => {
    const payload = createTokenSchema.parse(request.body);

    return ok(reply, await createApiToken(app, {
      tenantId: payload.tenantId,
      label: payload.label,
      scopes: payload.scopes,
      expiresAt: payload.expiresAt ? new Date(payload.expiresAt) : null,
      createdById: request.authUser?.userId,
    }), 201);
  });

  app.post('/admin/companies/:companyId/credit', adminOnly, async (request, reply) => {
    const params = request.params as { companyId: string };
    const body = request.body as { amount: number; description?: string };

    const wallet = await app.prisma.wallet.findUnique({
      where: { companyId: params.companyId },
    });

    if (!wallet) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Carteira não encontrada' } });
    }

    const updated = await app.prisma.$transaction(async (tx) => {
      const nextBalance = wallet.balance.add(body.amount);

      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: nextBalance },
      });

      return tx.ledgerEntry.create({
        data: {
          walletId: wallet.id,
          companyId: params.companyId,
          type: 'CREDIT',
          amount: body.amount,
          balanceBefore: wallet.balance,
          balanceAfter: nextBalance,
          description: body.description ?? 'Crédito administrativo',
          metadata: { source: 'ADMIN_PANEL' },
        },
      });
    });

    return ok(reply, updated, 201);
  });
}
