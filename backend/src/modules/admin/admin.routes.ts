import type { FastifyInstance } from 'fastify';
import { Prisma, Role } from '@prisma/client';
import { authenticate, requireRoles } from '../../core/auth';
import { ConflictError, NotFoundError } from '../../core/errors';
import { ok } from '../../core/http';
import {
  createInvite,
  resendInviteById,
  revokeInviteById,
} from '../auth/auth.service';
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
  adminCompanyCreditSchema,
  linkUserToCompanySchema,
  listProductSessionAssignmentsQuerySchema,
  listAdminAuditQuerySchema,
  listAdminInvitesQuerySchema,
  listCompanyLedgerQuerySchema,
  patchAdminTokenSchema,
  previewMergeSchema,
  putProductSessionAssignmentsSchema,
  testProductDraftSchema,
  testProductSchema,
  templateVariableExpressionSchema,
  updateCanonicalFieldSchema,
  updateMappingSchema,
  updateProviderOperationSchema,
  updateProviderProductSchema,
  updateAdminCompanySchema,
  updateAdminUserSchema,
  updateProviderSchema,
  putRoleEndpointAccessSchema,
} from './admin.schemas';
import { logAdminAudit } from './admin.service';
import {
  getEndpointAccessSnapshot,
  replaceEndpointAccessMatrix,
} from './endpoint-access.service';
import {
  createApiToken,
  createProvider,
  previewMerge,
  testProviderOperation,
  testProviderProduct,
  testProviderProductDraft,
} from '../providers/providers.service';

function stripPassword<T extends { passwordHash: string }>(user: T): Omit<T, 'passwordHash'> {
  const { passwordHash: _p, ...rest } = user;
  return rest;
}

function collectTemplateVariableExpressions(input: unknown): string[] {
  const expressions: string[] = [];

  if (typeof input === 'string') {
    const matches = input.match(/\$\{[^}]+\}/g);
    if (matches) expressions.push(...matches);
    return expressions;
  }

  if (Array.isArray(input)) {
    for (const item of input) {
      expressions.push(...collectTemplateVariableExpressions(item));
    }
    return expressions;
  }

  if (input && typeof input === 'object') {
    for (const value of Object.values(input as Record<string, unknown>)) {
      expressions.push(...collectTemplateVariableExpressions(value));
    }
  }

  return expressions;
}

export async function registerAdminRoutes(app: FastifyInstance) {
  const adminOnly = { preHandler: [authenticate, requireRoles(['PLATFORM_ADMIN'])] };

  app.get('/admin/access/endpoints', adminOnly, async (_request, reply) => {
    return ok(reply, await getEndpointAccessSnapshot(app));
  });

  app.put('/admin/access/endpoints', adminOnly, async (request, reply) => {
    const payload = putRoleEndpointAccessSchema.parse(request.body);
    await replaceEndpointAccessMatrix(app, payload.matrix);

    await logAdminAudit(app, {
      actorUserId: request.authUser?.userId,
      action: 'ENDPOINT_ACCESS_MATRIX_UPDATED',
      entityType: 'ROLE_ENDPOINT_POLICY',
      metadata: { cells: payload.matrix.length },
    });

    return ok(reply, await getEndpointAccessSnapshot(app));
  });

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

    return ok(reply, users.map((u) => stripPassword(u)));
  });

  app.get('/admin/users/:userId', adminOnly, async (request, reply) => {
    const params = request.params as { userId: string };
    const user = await app.prisma.user.findUnique({
      where: { id: params.userId },
      include: { company: true },
    });
    if (!user) throw new NotFoundError('Usuário não encontrado');
    return ok(reply, stripPassword(user));
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
      include: { company: true },
    });

    await logAdminAudit(app, {
      actorUserId: request.authUser?.userId,
      action: 'USER_CREATED',
      entityType: 'USER',
      entityId: user.id,
      metadata: { email: user.email },
    });

    return ok(reply, stripPassword(user), 201);
  });

  app.patch('/admin/users/:userId', adminOnly, async (request, reply) => {
    const params = request.params as { userId: string };
    const payload = updateAdminUserSchema.parse(request.body);

    const existing = await app.prisma.user.findUnique({ where: { id: params.userId } });
    if (!existing) throw new NotFoundError('Usuário não encontrado');
    if (existing.role === 'PLATFORM_ADMIN' && payload.role !== undefined) {
      throw new ConflictError('Não é permitido alterar o papel de administradores da plataforma');
    }

    if (payload.email && payload.email !== existing.email) {
      const taken = await app.prisma.user.findUnique({ where: { email: payload.email } });
      if (taken) throw new ConflictError('E-mail já em uso');
    }

    if (payload.document !== undefined && payload.document !== null) {
      const doc = normalizeDocument(payload.document);
      if (doc !== existing.document) {
        const taken = await app.prisma.user.findUnique({ where: { document: doc } });
        if (taken) throw new ConflictError('Documento já em uso');
      }
    }

    const data: Prisma.UserUpdateInput = {};
    if (payload.fullName !== undefined) data.fullName = payload.fullName;
    if (payload.email !== undefined) data.email = payload.email;
    if (payload.document !== undefined) {
      data.document = payload.document === null ? null : normalizeDocument(payload.document);
    }
    if (payload.phone !== undefined) data.phone = payload.phone;
    if (payload.role !== undefined) data.role = payload.role;
    if (payload.companyId !== undefined) {
      if (payload.companyId === null) {
        data.company = { disconnect: true };
      } else {
        data.company = { connect: { id: payload.companyId } };
      }
    }
    if (payload.accountStatus !== undefined) {
      data.accountStatus = payload.accountStatus;
      data.isActive = payload.accountStatus === 'ACTIVE';
    }
    if (payload.password) data.passwordHash = await hashPassword(payload.password);

    const updated = await app.prisma.user.update({
      where: { id: params.userId },
      data,
      include: { company: true },
    });

    await logAdminAudit(app, {
      actorUserId: request.authUser?.userId,
      action: 'USER_UPDATED',
      entityType: 'USER',
      entityId: params.userId,
      metadata: { fields: Object.keys(payload) },
    });

    return ok(reply, stripPassword(updated));
  });

  app.delete('/admin/users/:userId', adminOnly, async (request, reply) => {
    const params = request.params as { userId: string };
    if (request.authUser?.userId === params.userId) {
      throw new ConflictError('Não é possível excluir o próprio usuário');
    }

    const existing = await app.prisma.user.findUnique({ where: { id: params.userId } });
    if (!existing) throw new NotFoundError('Usuário não encontrado');
    if (existing.role === 'PLATFORM_ADMIN') {
      throw new ConflictError('Não é possível excluir administradores da plataforma');
    }

    try {
      await app.prisma.user.delete({ where: { id: params.userId } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new ConflictError('Não é possível excluir: existem registros vinculados ao usuário');
      }
      throw error;
    }

    await logAdminAudit(app, {
      actorUserId: request.authUser?.userId,
      action: 'USER_DELETED',
      entityType: 'USER',
      entityId: params.userId,
    });

    return ok(reply, { deleted: true });
  });

  app.patch('/admin/users/:userId/company', adminOnly, async (request, reply) => {
    const params = request.params as { userId: string };
    const payload = linkUserToCompanySchema.parse(request.body);

    const updated = await app.prisma.user.update({
      where: { id: params.userId },
      data: { companyId: payload.companyId },
      include: { company: true },
    });

    await logAdminAudit(app, {
      actorUserId: request.authUser?.userId,
      action: 'USER_COMPANY_LINKED',
      entityType: 'USER',
      entityId: params.userId,
      metadata: { companyId: payload.companyId },
    });

    return ok(reply, stripPassword(updated));
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

    await logAdminAudit(app, {
      actorUserId: request.authUser?.userId,
      action: 'COMPANY_CREATED',
      entityType: 'COMPANY',
      entityId: company.id,
      metadata: { name: company.name },
    });

    return ok(reply, company, 201);
  });

  app.patch('/admin/companies/:companyId', adminOnly, async (request, reply) => {
    const params = request.params as { companyId: string };
    const payload = updateAdminCompanySchema.parse(request.body);

    const existing = await app.prisma.company.findUnique({ where: { id: params.companyId } });
    if (!existing) throw new NotFoundError('Empresa não encontrada');

    if (payload.document !== undefined) {
      const doc = normalizeDocument(payload.document);
      if (doc !== existing.document) {
        const taken = await app.prisma.company.findUnique({ where: { document: doc } });
        if (taken) throw new ConflictError('Já existe empresa com este documento');
      }
    }

    const data: Prisma.CompanyUpdateInput = {};
    if (payload.name !== undefined) data.name = payload.name;
    if (payload.document !== undefined) data.document = normalizeDocument(payload.document);
    if (payload.email !== undefined) data.email = payload.email;
    if (payload.phone !== undefined) data.phone = payload.phone;
    if (payload.tenantId !== undefined) {
      data.tenant = payload.tenantId
        ? { connect: { id: payload.tenantId } }
        : { disconnect: true };
    }
    if (payload.isActive !== undefined) data.isActive = payload.isActive;

    const updated = await app.prisma.company.update({
      where: { id: params.companyId },
      data,
      include: {
        wallet: true,
        _count: { select: { users: true, consultations: true } },
      },
    });

    await logAdminAudit(app, {
      actorUserId: request.authUser?.userId,
      action: 'COMPANY_UPDATED',
      entityType: 'COMPANY',
      entityId: params.companyId,
      metadata: { fields: Object.keys(payload) },
    });

    return ok(reply, updated);
  });

  app.get('/admin/companies/:companyId/ledger', adminOnly, async (request, reply) => {
    const params = request.params as { companyId: string };
    const q = listCompanyLedgerQuerySchema.parse(request.query);

    const company = await app.prisma.company.findUnique({ where: { id: params.companyId } });
    if (!company) throw new NotFoundError('Empresa não encontrada');

    const entries = await app.prisma.ledgerEntry.findMany({
      where: { companyId: params.companyId },
      orderBy: { createdAt: 'desc' },
      take: q.take,
    });

    return ok(reply, entries);
  });

  app.post('/admin/invites/company', adminOnly, async (request, reply) => {
    const payload = createCompanyInviteSchema.parse(request.body);
    const created = await createInvite(app, {
      type: 'COMPANY',
      email: payload.email,
      invitedByUserId: request.authUser?.userId,
      metadata: payload.metadata as Prisma.InputJsonValue | undefined,
    });
    await logAdminAudit(app, {
      actorUserId: request.authUser?.userId,
      action: 'INVITE_COMPANY_CREATED',
      entityType: 'INVITE',
      entityId: created.inviteId,
      metadata: { email: payload.email },
    });
    return ok(reply, created, 201);
  });

  app.post('/admin/invites/user', adminOnly, async (request, reply) => {
    const body = request.body as {
      email: string;
      companyId: string;
      roleToAssign: 'COMPANY_MANAGER' | 'USER';
      metadata?: Record<string, unknown>;
    };

    const created = await createInvite(app, {
      type: 'USER',
      email: body.email,
      companyId: body.companyId,
      roleToAssign: body.roleToAssign,
      invitedByUserId: request.authUser?.userId,
      metadata: body.metadata as Prisma.InputJsonValue | undefined,
    });
    await logAdminAudit(app, {
      actorUserId: request.authUser?.userId,
      action: 'INVITE_USER_CREATED',
      entityType: 'INVITE',
      entityId: created.inviteId,
      metadata: { email: body.email, companyId: body.companyId },
    });
    return ok(reply, created, 201);
  });

  app.get('/admin/invites', adminOnly, async (request, reply) => {
    const q = listAdminInvitesQuerySchema.parse(request.query);
    const where: Prisma.InviteWhereInput = {};
    if (q.companyId) where.companyId = q.companyId;
    if (q.status) where.status = q.status;

    const invites = await app.prisma.invite.findMany({
      where,
      include: { company: { select: { id: true, name: true, slug: true } } },
      orderBy: { createdAt: 'desc' },
      take: q.take,
    });

    return ok(reply, invites);
  });

  app.post('/admin/invites/:inviteId/revoke', adminOnly, async (request, reply) => {
    const params = request.params as { inviteId: string };
    const revoked = await revokeInviteById(app, params.inviteId);
    await logAdminAudit(app, {
      actorUserId: request.authUser?.userId,
      action: 'INVITE_REVOKED',
      entityType: 'INVITE',
      entityId: params.inviteId,
    });
    return ok(reply, revoked);
  });

  app.post('/admin/invites/:inviteId/resend', adminOnly, async (request, reply) => {
    const params = request.params as { inviteId: string };
    const next = await resendInviteById(app, params.inviteId, request.authUser?.userId);
    await logAdminAudit(app, {
      actorUserId: request.authUser?.userId,
      action: 'INVITE_RESENT',
      entityType: 'INVITE',
      entityId: next.inviteId,
      metadata: { previousInviteId: params.inviteId },
    });
    return ok(reply, next, 201);
  });

  app.get('/admin/audit', adminOnly, async (request, reply) => {
    const q = listAdminAuditQuerySchema.parse(request.query);
    const logs = await app.prisma.adminAuditLog.findMany({
      include: {
        actor: { select: { id: true, fullName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: q.take,
    });
    return ok(reply, logs);
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
    return ok(reply, await app.prisma.canonicalFieldCatalog.create({
      data: {
        ...payload,
        ...(payload.uiItemFilters !== undefined
          ? { uiItemFilters: payload.uiItemFilters as Prisma.InputJsonValue }
          : {}),
      },
    }), 201);
  });

  app.patch('/admin/catalog/canonical-fields/:fieldId', adminOnly, async (request, reply) => {
    const params = request.params as { fieldId: string };
    const payload = updateCanonicalFieldSchema.parse(request.body);

    const field = await app.prisma.canonicalFieldCatalog.findUnique({ where: { id: params.fieldId } });
    if (!field) throw new NotFoundError('Campo canônico não encontrado');

    const updated = await app.prisma.canonicalFieldCatalog.update({
      where: { id: params.fieldId },
      data: {
        ...payload,
        ...(payload.uiItemFilters !== undefined
          ? { uiItemFilters: payload.uiItemFilters === null ? Prisma.JsonNull : (payload.uiItemFilters as Prisma.InputJsonValue) }
          : {}),
      },
    });
    return ok(reply, updated);
  });

  app.delete('/admin/catalog/canonical-fields/:fieldId', adminOnly, async (request, reply) => {
    const params = request.params as { fieldId: string };

    const mappingCount = await app.prisma.providerFieldMapping.count({
      where: { canonicalFieldId: params.fieldId },
    });
    const sessionAssignmentCount = await app.prisma.productSessionFieldAssignment.count({
      where: { canonicalFieldId: params.fieldId },
    });
    if (mappingCount > 0 || sessionAssignmentCount > 0) {
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
            sessionAssignments: {
              include: { canonicalField: true },
              orderBy: { sortOrder: 'asc' },
            },
          },
          orderBy: { updatedAt: 'desc' },
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
            sessionAssignments: {
              include: { canonicalField: true },
              orderBy: { sortOrder: 'asc' },
            },
          },
          orderBy: { updatedAt: 'desc' },
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
          await tx.productSessionFieldAssignment.deleteMany({ where: { productId: { in: productIds } } });
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
    if (payload.templateLayout !== undefined) {
      const expressions = collectTemplateVariableExpressions(payload.templateLayout);
      for (const expression of expressions) {
        templateVariableExpressionSchema.parse(expression);
      }
    }
    const { consultationPrice, ...rest } = payload;
    return ok(reply, await app.prisma.providerProduct.create({
      data: {
        ...rest,
        cost: payload.cost,
        consultationPrice: consultationPrice ?? payload.cost,
      },
    }), 201);
  });

  app.patch('/admin/providers/products/:productId', adminOnly, async (request, reply) => {
    const params = request.params as { productId: string };
    const payload = updateProviderProductSchema.parse(request.body);

    if (payload.templateLayout !== undefined && payload.templateLayout !== null) {
      const expressions = collectTemplateVariableExpressions(payload.templateLayout);
      for (const expression of expressions) {
        templateVariableExpressionSchema.parse(expression);
      }
    }

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
    if (payload.consultationPrice !== undefined) data.consultationPrice = payload.consultationPrice;
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
    if (payload.templateLayout !== undefined) {
      (data as Record<string, Prisma.InputJsonValue | Prisma.NullTypes.JsonNull>).templateLayout =
        payload.templateLayout === null ? Prisma.JsonNull : (payload.templateLayout as Prisma.InputJsonValue);
    }
    if (payload.typeItemFilters !== undefined) {
      data.typeItemFilters =
        payload.typeItemFilters === null ? Prisma.JsonNull : (payload.typeItemFilters as Prisma.InputJsonValue);
    }

    const updated = await app.prisma.providerProduct.update({
      where: { id: params.productId },
      data,
      include: {
        consultationType: true,
        mappings: { include: { canonicalField: true }, orderBy: { sortOrder: 'asc' } },
        sessionAssignments: {
          include: { canonicalField: true },
          orderBy: { sortOrder: 'asc' },
        },
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
        await tx.productSessionFieldAssignment.deleteMany({ where: { productId: params.productId } });
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

  app.get('/admin/providers/products/:productId/session-assignments', adminOnly, async (request, reply) => {
    const params = request.params as { productId: string };
    const query = listProductSessionAssignmentsQuerySchema.parse(request.query);

    const product = await app.prisma.providerProduct.findUnique({ where: { id: params.productId } });
    if (!product) throw new NotFoundError('Produto não encontrado');

    const where: Prisma.ProductSessionFieldAssignmentWhereInput = { productId: params.productId };
    if (query.sessionKey) where.sessionKey = query.sessionKey;

    const assignments = await app.prisma.productSessionFieldAssignment.findMany({
      where,
      include: { canonicalField: true },
      orderBy: [{ sessionKey: 'asc' }, { sortOrder: 'asc' }],
    });

    return ok(reply, assignments);
  });

  app.put('/admin/providers/products/:productId/session-assignments', adminOnly, async (request, reply) => {
    const params = request.params as { productId: string };
    const payload = putProductSessionAssignmentsSchema.parse(request.body);

    const product = await app.prisma.providerProduct.findUnique({ where: { id: params.productId } });
    if (!product) throw new NotFoundError('Produto não encontrado');

    const canonicalIds = payload.assignments.map((a) => a.canonicalFieldId);
    if (canonicalIds.length > 0) {
      const canonicalCount = await app.prisma.canonicalFieldCatalog.count({
        where: { id: { in: canonicalIds } },
      });
      if (canonicalCount !== canonicalIds.length) {
        throw new ConflictError('Um ou mais campos canônicos não foram encontrados');
      }
    }

    await app.prisma.$transaction(async (tx) => {
      await tx.productSessionFieldAssignment.deleteMany({
        where: { productId: params.productId, sessionKey: payload.sessionKey },
      });
      if (payload.assignments.length > 0) {
        await tx.productSessionFieldAssignment.createMany({
          data: payload.assignments.map((assignment, index) => ({
            productId: params.productId,
            sessionKey: payload.sessionKey,
            canonicalFieldId: assignment.canonicalFieldId,
            sourcePath: assignment.sourcePath ?? null,
            sortOrder: assignment.sortOrder ?? index,
            isActive: assignment.isActive ?? true,
          })),
        });
      }
    });

    const updated = await app.prisma.productSessionFieldAssignment.findMany({
      where: { productId: params.productId, sessionKey: payload.sessionKey },
      include: { canonicalField: true },
      orderBy: { sortOrder: 'asc' },
    });
    return ok(reply, updated);
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
            sessionAssignments: {
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
      include: { tenant: true, company: { select: { id: true, name: true, slug: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }));
  });

  app.post('/admin/tokens', adminOnly, async (request, reply) => {
    const payload = createTokenSchema.parse(request.body);

    const result = await createApiToken(app, {
      tenantId: payload.tenantId,
      companyId: payload.companyId,
      label: payload.label,
      scopes: payload.scopes,
      expiresAt: payload.expiresAt ? new Date(payload.expiresAt) : null,
      createdById: request.authUser?.userId,
    });

    await logAdminAudit(app, {
      actorUserId: request.authUser?.userId,
      action: 'API_TOKEN_CREATED',
      entityType: 'API_TOKEN',
      entityId: result.apiToken.id,
      metadata: {
        label: payload.label,
        companyId: payload.companyId ?? null,
        tenantId: payload.tenantId ?? null,
      },
    });

    return ok(reply, result, 201);
  });

  app.patch('/admin/tokens/:tokenId', adminOnly, async (request, reply) => {
    const params = request.params as { tokenId: string };
    const payload = patchAdminTokenSchema.parse(request.body);

    const existing = await app.prisma.apiToken.findUnique({ where: { id: params.tokenId } });
    if (!existing) throw new NotFoundError('Token não encontrado');

    const updated = await app.prisma.apiToken.update({
      where: { id: params.tokenId },
      data: { isActive: payload.isActive },
      include: { tenant: true, company: { select: { id: true, name: true, slug: true } } },
    });

    await logAdminAudit(app, {
      actorUserId: request.authUser?.userId,
      action: payload.isActive ? 'API_TOKEN_ACTIVATED' : 'API_TOKEN_REVOKED',
      entityType: 'API_TOKEN',
      entityId: params.tokenId,
    });

    return ok(reply, updated);
  });

  app.post('/admin/companies/:companyId/credit', adminOnly, async (request, reply) => {
    const params = request.params as { companyId: string };
    const body = adminCompanyCreditSchema.parse(request.body);

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

    await logAdminAudit(app, {
      actorUserId: request.authUser?.userId,
      action: 'COMPANY_CREDIT',
      entityType: 'COMPANY',
      entityId: params.companyId,
      metadata: {
        amount: String(body.amount),
        ledgerEntryId: updated.id,
        description: body.description ?? null,
      },
    });

    return ok(reply, updated, 201);
  });
}
