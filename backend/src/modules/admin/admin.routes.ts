import type { FastifyInstance } from 'fastify';
import { Prisma, Role } from '@prisma/client';
import { authenticate, requireRoles } from '../../core/auth';
import { ConflictError, NotFoundError, ForbiddenError, BadRequestError } from '../../core/errors';
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
  getIntegrationSettingsAdmin,
  patchIntegrationSettingsAdmin,
} from './integration-settings.service';
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
  const adminOnly = { preHandler: [authenticate, requireRoles(['PLATFORM_ADMIN', 'CUSTOMER_ADMIN', 'COMPANY_ADMIN'])] };
  const platformAdminOnly = { preHandler: [authenticate, requireRoles(['PLATFORM_ADMIN'])] };
  const masterOrPartnerOnly = { preHandler: [authenticate, requireRoles(['PLATFORM_ADMIN', 'CUSTOMER_ADMIN'])] };

  app.get('/admin/access/endpoints', platformAdminOnly, async (_request, reply) => {
    return ok(reply, await getEndpointAccessSnapshot(app));
  });

  app.put('/admin/access/endpoints', platformAdminOnly, async (request, reply) => {
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

  app.get('/admin/technical/overview', platformAdminOnly, async (_request, reply) => {
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

  app.get('/admin/integration-settings', platformAdminOnly, async (_request, reply) => {
    return ok(reply, await getIntegrationSettingsAdmin(app));
  });

  app.patch('/admin/integration-settings', platformAdminOnly, async (request, reply) => {
    const updated = await patchIntegrationSettingsAdmin(app, request.body);
    await logAdminAudit(app, {
      actorUserId: request.authUser?.userId,
      action: 'INTEGRATION_SETTINGS_UPDATED',
      entityType: 'TENANT',
      entityId: updated.tenantId,
      metadata: { tenantSlug: updated.tenantSlug },
    });
    return ok(reply, updated);
  });

  app.get('/admin/users', adminOnly, async (request, reply) => {
    const role = request.authUser?.role;
    const userId = request.authUser?.userId;
    const companyId = request.authUser?.companyId;

    const where: Prisma.UserWhereInput = {};

    if (role === 'CUSTOMER_ADMIN') {
      where.company = {
        metadata: {
          path: ['partnerId'],
          equals: userId,
        },
      };
    } else if (role === 'COMPANY_ADMIN') {
      where.companyId = companyId;
    }

    const users = await app.prisma.user.findMany({
      where,
      include: { company: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    return ok(reply, users.map((u) => stripPassword(u)));
  });

  app.get('/admin/users/:userId', adminOnly, async (request, reply) => {
    const params = request.params as { userId: string };
    const role = request.authUser?.role;
    const companyId = request.authUser?.companyId;

    const user = await app.prisma.user.findUnique({
      where: { id: params.userId },
      include: { company: true },
    });

    if (!user) throw new NotFoundError('Usuário não encontrado');

    // Validação de acesso multi-tenant
    if (role === 'CUSTOMER_ADMIN') {
      const partnerId = (user.company?.metadata as Record<string, unknown> | null)?.partnerId;
      if (partnerId !== request.authUser?.userId) {
        throw new ForbiddenError('Sem acesso a este usuário');
      }
    } else if (role === 'COMPANY_ADMIN') {
      if (user.companyId !== companyId) {
        throw new ForbiddenError('Sem acesso a este usuário');
      }
    }

    return ok(reply, stripPassword(user));
  });

  app.post('/admin/users', adminOnly, async (request, reply) => {
    const payload = createAdminUserSchema.parse(request.body);
    const role = request.authUser?.role;
    const companyId = request.authUser?.companyId;

    let finalCompanyId = payload.companyId ?? null;
    let finalRole = payload.role as Role;

    if (role === 'CUSTOMER_ADMIN') {
      if (finalRole !== 'COMPANY_ADMIN' && finalRole !== 'COMPANY_COMMON') {
        finalRole = 'COMPANY_COMMON';
      }
      if (finalCompanyId) {
        const targetCompany = await app.prisma.company.findUnique({ where: { id: finalCompanyId } });
        const partnerId = (targetCompany?.metadata as Record<string, unknown> | null)?.partnerId;
        if (partnerId !== request.authUser?.userId) {
          return reply.status(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Empresa destino não vinculada a este parceiro' } });
        }
      }
    } else if (role === 'COMPANY_ADMIN') {
      finalCompanyId = companyId ?? null;
      finalRole = 'COMPANY_COMMON';
    }

    const user = await app.prisma.user.create({
      data: {
        fullName: payload.fullName,
        email: payload.email,
        document: normalizeDocument(payload.document),
        phone: payload.phone,
        passwordHash: await hashPassword(payload.password),
        role: finalRole,
        companyId: finalCompanyId,
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
    const role = request.authUser?.role;
    const userId = request.authUser?.userId;
    const companyId = request.authUser?.companyId;

    const existing = await app.prisma.user.findUnique({ where: { id: params.userId }, include: { company: true } });
    if (!existing) throw new NotFoundError('Usuário não encontrado');
    if (existing.role === 'PLATFORM_ADMIN' && payload.role !== undefined) {
      throw new ConflictError('Não é permitido alterar o papel de administradores da plataforma');
    }

    // Validação de acesso multi-tenant para edição de usuário
    if (role === 'CUSTOMER_ADMIN') {
      const partnerId = (existing.company?.metadata as Record<string, unknown> | null)?.partnerId;
      if (partnerId !== userId) {
        throw new ForbiddenError('Sem permissão para alterar este usuário');
      }
      // Não pode alterar o papel para algo maior que COMPANY_ADMIN/COMPANY_COMMON
      if (payload.role && payload.role !== 'COMPANY_ADMIN' && payload.role !== 'COMPANY_COMMON') {
        payload.role = 'COMPANY_COMMON';
      }
      // Não pode mover o usuário para uma empresa não vinculada a ele
      if (payload.companyId) {
        const targetCompany = await app.prisma.company.findUnique({ where: { id: payload.companyId } });
        const targetPartnerId = (targetCompany?.metadata as Record<string, unknown> | null)?.partnerId;
        if (targetPartnerId !== userId) {
          throw new ForbiddenError('Empresa destino não vinculada a este parceiro');
        }
      }
    } else if (role === 'COMPANY_ADMIN') {
      if (existing.companyId !== companyId) {
        throw new ForbiddenError('Sem permissão para alterar este usuário');
      }
      // Sempre força que o papel atualizado seja COMPANY_COMMON ou não mude
      if (payload.role) {
        payload.role = 'COMPANY_COMMON';
      }
      // Não pode alterar a empresa do usuário
      if (payload.companyId !== undefined && payload.companyId !== companyId) {
        throw new ForbiddenError('Não é permitido alterar a empresa do usuário');
      }
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
    const role = request.authUser?.role;
    const companyId = request.authUser?.companyId;

    if (request.authUser?.userId === params.userId) {
      throw new ConflictError('Não é possível excluir o próprio usuário');
    }

    const existing = await app.prisma.user.findUnique({ where: { id: params.userId }, include: { company: true } });
    if (!existing) throw new NotFoundError('Usuário não encontrado');
    if (existing.role === 'PLATFORM_ADMIN') {
      throw new ConflictError('Não é possível excluir administradores da plataforma');
    }

    // Validação de acesso multi-tenant para exclusão de usuário
    if (role === 'CUSTOMER_ADMIN') {
      const partnerId = (existing.company?.metadata as Record<string, unknown> | null)?.partnerId;
      if (partnerId !== request.authUser?.userId) {
        throw new ForbiddenError('Sem permissão para excluir este usuário');
      }
    } else if (role === 'COMPANY_ADMIN') {
      if (existing.companyId !== companyId) {
        throw new ForbiddenError('Sem permissão para excluir este usuário');
      }
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

  app.get('/admin/companies', adminOnly, async (request, reply) => {
    const role = request.authUser?.role;
    const userId = request.authUser?.userId;
    const companyId = request.authUser?.companyId;

    const where: Prisma.CompanyWhereInput = {};

    if (role === 'CUSTOMER_ADMIN') {
      where.metadata = {
        path: ['partnerId'],
        equals: userId,
      };
    } else if (role === 'COMPANY_ADMIN') {
      where.id = companyId || 'NENHUMA_EMPRESA_VINCULADA';
    }

    const companies = await app.prisma.company.findMany({
      where,
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
    const role = request.authUser?.role;
    if (role === 'COMPANY_ADMIN') {
      throw new ForbiddenError('Administradores de empresa não podem criar novas empresas');
    }

    const payload = createAdminCompanySchema.parse(request.body);
    const slugBase = slugify(payload.name);
    let slug = slugBase;
    let cursor = 1;

    while (await app.prisma.company.findUnique({ where: { slug } })) {
      cursor += 1;
      slug = `${slugBase}-${cursor}`;
    }

    // Injetar partnerId na metadata para CUSTOMER_ADMIN
    const metadata: Prisma.InputJsonValue = role === 'CUSTOMER_ADMIN'
      ? { partnerId: request.authUser?.userId }
      : {};

    const company = await app.prisma.company.create({
      data: {
        tenantId: payload.tenantId,
        name: payload.name,
        slug,
        document: normalizeDocument(payload.document),
        email: payload.email,
        phone: payload.phone,
        metadata,
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
    const role = request.authUser?.role;
    const userId = request.authUser?.userId;
    const companyId = request.authUser?.companyId;

    const existing = await app.prisma.company.findUnique({ where: { id: params.companyId } });
    if (!existing) throw new NotFoundError('Empresa não encontrada');

    // Validação de acesso multi-tenant para edição de empresa
    if (role === 'CUSTOMER_ADMIN') {
      const partnerId = (existing.metadata as Record<string, unknown> | null)?.partnerId;
      if (partnerId !== userId) {
        throw new ForbiddenError('Sem acesso para editar esta empresa');
      }
      if (payload.tenantId !== undefined) {
        throw new ForbiddenError('Não é permitido alterar o Tenant desta empresa');
      }
    } else if (role === 'COMPANY_ADMIN') {
      if (params.companyId !== companyId) {
        throw new ForbiddenError('Sem acesso para editar esta empresa');
      }
      if (payload.tenantId !== undefined || payload.isActive !== undefined) {
        throw new ForbiddenError('Operação não permitida para administradores de empresa');
      }
    }

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
    const role = request.authUser?.role;
    const userId = request.authUser?.userId;
    const companyId = request.authUser?.companyId;

    const company = await app.prisma.company.findUnique({ where: { id: params.companyId } });
    if (!company) throw new NotFoundError('Empresa não encontrada');

    // Validação de acesso multi-tenant para extrato
    if (role === 'CUSTOMER_ADMIN') {
      const partnerId = (company.metadata as Record<string, unknown> | null)?.partnerId;
      if (partnerId !== userId) {
        throw new ForbiddenError('Sem acesso ao extrato desta empresa');
      }
    } else if (role === 'COMPANY_ADMIN') {
      if (params.companyId !== companyId) {
        throw new ForbiddenError('Sem acesso ao extrato desta empresa');
      }
    }

    const entries = await app.prisma.ledgerEntry.findMany({
      where: { companyId: params.companyId },
      orderBy: { createdAt: 'desc' },
      take: q.take,
    });

    return ok(reply, entries);
  });

  app.post('/admin/invites/company', adminOnly, async (request, reply) => {
    const role = request.authUser?.role;
    if (role === 'COMPANY_ADMIN') {
      throw new ForbiddenError('Administradores de empresa não podem convidar outras empresas');
    }

    const payload = createCompanyInviteSchema.parse(request.body);
    const metadata = payload.metadata ?? {};

    if (role === 'CUSTOMER_ADMIN') {
      metadata.partnerId = request.authUser?.userId;
    }

    const created = await createInvite(app, {
      type: 'COMPANY',
      email: payload.email,
      invitedByUserId: request.authUser?.userId,
      metadata: metadata as Prisma.InputJsonValue | undefined,
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
      roleToAssign: 'COMPANY_ADMIN' | 'COMPANY_COMMON' | 'COMPANY_MANAGER' | 'USER';
      metadata?: Record<string, unknown>;
    };

    const role = request.authUser?.role;
    const companyId = request.authUser?.companyId;

    let targetCompanyId = body.companyId;
    let finalRole = body.roleToAssign;

    if (role === 'CUSTOMER_ADMIN') {
      const targetCompany = await app.prisma.company.findUnique({ where: { id: targetCompanyId } });
      const partnerId = (targetCompany?.metadata as Record<string, unknown> | null)?.partnerId;
      if (partnerId !== request.authUser?.userId) {
        throw new ForbiddenError('Empresa de destino não vinculada a este parceiro');
      }
      if (finalRole !== 'COMPANY_ADMIN' && finalRole !== 'COMPANY_COMMON') {
        finalRole = 'COMPANY_COMMON';
      }
    } else if (role === 'COMPANY_ADMIN') {
      targetCompanyId = companyId!;
      finalRole = 'COMPANY_COMMON';
    }

    const created = await createInvite(app, {
      type: 'USER',
      email: body.email,
      companyId: targetCompanyId,
      roleToAssign: finalRole as any,
      invitedByUserId: request.authUser?.userId,
      metadata: body.metadata as Prisma.InputJsonValue | undefined,
    });
    await logAdminAudit(app, {
      actorUserId: request.authUser?.userId,
      action: 'INVITE_USER_CREATED',
      entityType: 'INVITE',
      entityId: created.inviteId,
      metadata: { email: body.email, companyId: targetCompanyId },
    });
    return ok(reply, created, 201);
  });

  app.get('/admin/invites', adminOnly, async (request, reply) => {
    const q = listAdminInvitesQuerySchema.parse(request.query);
    const role = request.authUser?.role;
    const userId = request.authUser?.userId;
    const companyId = request.authUser?.companyId;

    const where: Prisma.InviteWhereInput = {};
    if (q.companyId) where.companyId = q.companyId;
    if (q.status) where.status = q.status;

    if (role === 'CUSTOMER_ADMIN') {
      where.company = {
        metadata: {
          path: ['partnerId'],
          equals: userId,
        },
      };
    } else if (role === 'COMPANY_ADMIN') {
      where.companyId = companyId;
    }

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
    const role = request.authUser?.role;
    const userId = request.authUser?.userId;
    const companyId = request.authUser?.companyId;

    const invite = await app.prisma.invite.findUnique({ where: { id: params.inviteId }, include: { company: true } });
    if (!invite) throw new NotFoundError('Convite não encontrado');

    // Validação de acesso multi-tenant
    if (role === 'CUSTOMER_ADMIN') {
      const partnerId = (invite.company?.metadata as Record<string, unknown> | null)?.partnerId ?? (invite.metadata as Record<string, unknown> | null)?.partnerId;
      if (partnerId !== userId) {
        throw new ForbiddenError('Sem acesso a este convite');
      }
    } else if (role === 'COMPANY_ADMIN') {
      if (invite.companyId !== companyId) {
        throw new ForbiddenError('Sem acesso a este convite');
      }
    }

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
    const role = request.authUser?.role;
    const userId = request.authUser?.userId;
    const companyId = request.authUser?.companyId;

    const invite = await app.prisma.invite.findUnique({ where: { id: params.inviteId }, include: { company: true } });
    if (!invite) throw new NotFoundError('Convite não encontrado');

    // Validação de acesso multi-tenant
    if (role === 'CUSTOMER_ADMIN') {
      const partnerId = (invite.company?.metadata as Record<string, unknown> | null)?.partnerId ?? (invite.metadata as Record<string, unknown> | null)?.partnerId;
      if (partnerId !== userId) {
        throw new ForbiddenError('Sem acesso a este convite');
      }
    } else if (role === 'COMPANY_ADMIN') {
      if (invite.companyId !== companyId) {
        throw new ForbiddenError('Sem acesso a este convite');
      }
    }

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
    const role = request.authUser?.role;
    const userId = request.authUser?.userId;
    const companyId = request.authUser?.companyId;

    const where: Prisma.AdminAuditLogWhereInput = {};

    if (role === 'CUSTOMER_ADMIN') {
      where.OR = [
        { actorUserId: userId },
        {
          actor: {
            company: {
              metadata: {
                path: ['partnerId'],
                equals: userId,
              },
            },
          },
        },
      ];
    } else if (role === 'COMPANY_ADMIN') {
      where.OR = [
        { actorUserId: userId },
        { actor: { companyId: companyId } },
      ];
    }

    const logs = await app.prisma.adminAuditLog.findMany({
      where,
      include: {
        actor: { select: { id: true, fullName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: q.take,
    });
    return ok(reply, logs);
  });

  app.get('/admin/catalog/consultation-types', masterOrPartnerOnly, async (_request, reply) => {
    return ok(reply, await app.prisma.consultationType.findMany({
      orderBy: { name: 'asc' },
    }));
  });

  app.post('/admin/catalog/consultation-types', platformAdminOnly, async (request, reply) => {
    const payload = createConsultationTypeSchema.parse(request.body);
    return ok(reply, await app.prisma.consultationType.create({ data: payload }), 201);
  });

  app.get('/admin/catalog/canonical-fields', masterOrPartnerOnly, async (_request, reply) => {
    return ok(reply, await app.prisma.canonicalFieldCatalog.findMany({
      orderBy: { pathKey: 'asc' },
    }));
  });

  app.post('/admin/catalog/canonical-fields', platformAdminOnly, async (request, reply) => {
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

  app.patch('/admin/catalog/canonical-fields/:fieldId', platformAdminOnly, async (request, reply) => {
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

  app.delete('/admin/catalog/canonical-fields/:fieldId', platformAdminOnly, async (request, reply) => {
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

  // Canonical Folders CRUD
  app.get('/admin/catalog/folders', masterOrPartnerOnly, async (_request, reply) => {
    const folders = await app.prisma.canonicalFolder.findMany({
      orderBy: { name: 'asc' },
    });
    return ok(reply, folders);
  });

  app.post('/admin/catalog/folders', platformAdminOnly, async (request, reply) => {
    const body = request.body as { name: string; parentId?: string | null };
    if (!body.name || !body.name.trim()) {
      throw new BadRequestError('Nome da pasta é obrigatório');
    }
    const folder = await app.prisma.canonicalFolder.create({
      data: {
        name: body.name.trim(),
        parentId: body.parentId || null,
      },
    });
    return ok(reply, folder, 201);
  });

  app.patch('/admin/catalog/folders/:folderId', platformAdminOnly, async (request, reply) => {
    const params = request.params as { folderId: string };
    const body = request.body as { name?: string; parentId?: string | null };

    const folder = await app.prisma.canonicalFolder.findUnique({ where: { id: params.folderId } });
    if (!folder) throw new NotFoundError('Pasta não encontrada');

    const updated = await app.prisma.canonicalFolder.update({
      where: { id: params.folderId },
      data: {
        ...(body.name !== undefined ? { name: body.name.trim() } : {}),
        ...(body.parentId !== undefined ? { parentId: body.parentId } : {}),
      },
    });
    return ok(reply, updated);
  });

  app.delete('/admin/catalog/folders/:folderId', platformAdminOnly, async (request, reply) => {
    const params = request.params as { folderId: string };

    const folder = await app.prisma.canonicalFolder.findUnique({ where: { id: params.folderId } });
    if (!folder) throw new NotFoundError('Pasta não encontrada');

    const parentId = folder.parentId;

    await app.prisma.$transaction(async (tx) => {
      // 1. Mover subpastas desta pasta para a pasta pai (parentId)
      await tx.canonicalFolder.updateMany({
        where: { parentId: params.folderId },
        data: { parentId },
      });

      // 2. Mover as associações de tipos desta pasta para a pasta pai (parentId)
      if (parentId === null) {
        await tx.canonicalFieldFolderAssociation.deleteMany({
          where: { folderId: params.folderId },
        });
      } else {
        await tx.canonicalFieldFolderAssociation.updateMany({
          where: { folderId: params.folderId },
          data: { folderId: parentId },
        });
      }

      // 3. Deletar a pasta em si
      await tx.canonicalFolder.delete({ where: { id: params.folderId } });
    });

    return ok(reply, { deleted: true });
  });

  // Canonical Fields and Folders Associations
  app.get('/admin/catalog/folders/associations', masterOrPartnerOnly, async (_request, reply) => {
    const associations = await app.prisma.canonicalFieldFolderAssociation.findMany();
    return ok(reply, associations);
  });

  app.post('/admin/catalog/folders/associations', platformAdminOnly, async (request, reply) => {
    const body = request.body as { fieldTypeKey: string; folderId: string | null };
    if (!body.fieldTypeKey) {
      throw new BadRequestError('Chave do tipo canônico (fieldTypeKey) é obrigatória');
    }

    if (body.folderId === null || body.folderId === '') {
      try {
        await app.prisma.canonicalFieldFolderAssociation.delete({
          where: { fieldTypeKey: body.fieldTypeKey },
        });
      } catch (e) {
        // Ignora se não existir
      }
      return ok(reply, { deleted: true });
    }

    const assoc = await app.prisma.canonicalFieldFolderAssociation.upsert({
      where: { fieldTypeKey: body.fieldTypeKey },
      create: {
        fieldTypeKey: body.fieldTypeKey,
        folderId: body.folderId,
      },
      update: {
        folderId: body.folderId,
      },
    });

    return ok(reply, assoc);
  });

  app.get('/admin/providers', masterOrPartnerOnly, async (request, reply) => {
    const role = request.authUser?.role;
    const userId = request.authUser?.userId;

    const allProviders = await app.prisma.provider.findMany({
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
    });

    if (role === 'PLATFORM_ADMIN') {
      const formatted = allProviders.map(p => ({
        ...p,
        canEdit: true,
        operations: p.operations.map(o => ({ ...o, canEdit: true })),
        products: p.products.map(pr => ({ ...pr, canEdit: true }))
      }));
      return ok(reply, formatted);
    }

    if (role === 'CUSTOMER_ADMIN') {
      const filtered = allProviders.filter(p => {
        const creds = p.credentials as Record<string, any> | null;
        const partnerId = creds?.partnerId;
        return !partnerId || partnerId === userId;
      });

      const formatted = filtered.map(p => {
        const creds = p.credentials as Record<string, any> | null;
        const partnerId = creds?.partnerId;
        const canEdit = partnerId === userId;

        return {
          ...p,
          canEdit,
          operations: p.operations.map(o => ({ ...o, canEdit })),
          products: p.products.map(pr => ({ ...pr, canEdit }))
        };
      });

      return ok(reply, formatted);
    }

    throw new ForbiddenError('Acesso não autorizado');
  });

  app.post('/admin/providers', masterOrPartnerOnly, async (request, reply) => {
    const payload = createProviderSchema.parse(request.body);
    const role = request.authUser?.role;
    const userId = request.authUser?.userId;

    if (role === 'CUSTOMER_ADMIN') {
      const credentials = (payload.credentials as Record<string, any> | null) || {};
      payload.credentials = {
        ...credentials,
        partnerId: userId
      };
    }

    return ok(reply, await createProvider(app, payload), 201);
  });

  app.patch('/admin/providers/:providerId', masterOrPartnerOnly, async (request, reply) => {
    const params = request.params as { providerId: string };
    const payload = updateProviderSchema.parse(request.body);
    const role = request.authUser?.role;
    const userId = request.authUser?.userId;

    const current = await app.prisma.provider.findUnique({ where: { id: params.providerId } });
    if (!current) throw new NotFoundError('Provedor não encontrado');

    if (role === 'CUSTOMER_ADMIN') {
      const creds = current.credentials as Record<string, any> | null;
      if (creds?.partnerId !== userId) {
        throw new ForbiddenError('Não é permitido alterar provedores globais ou de outros parceiros');
      }
      if (payload.credentials !== undefined) {
        const newCreds = (payload.credentials as Record<string, any> | null) || {};
        payload.credentials = {
          ...newCreds,
          partnerId: userId
        };
      }
    }

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

    const isPartner = role === 'CUSTOMER_ADMIN';
    const formatted = {
      ...updated,
      canEdit: !isPartner || (updated.credentials as Record<string, any> | null)?.partnerId === userId,
      operations: updated.operations.map(o => ({ ...o, canEdit: !isPartner || (updated.credentials as Record<string, any> | null)?.partnerId === userId })),
      products: updated.products.map(pr => ({ ...pr, canEdit: !isPartner || (updated.credentials as Record<string, any> | null)?.partnerId === userId }))
    };

    return ok(reply, formatted);
  });

  app.delete('/admin/providers/:providerId', masterOrPartnerOnly, async (request, reply) => {
    const params = request.params as { providerId: string };
    const role = request.authUser?.role;
    const userId = request.authUser?.userId;

    const current = await app.prisma.provider.findUnique({ where: { id: params.providerId } });
    if (!current) throw new NotFoundError('Provedor não encontrado');

    if (role === 'CUSTOMER_ADMIN') {
      const creds = current.credentials as Record<string, any> | null;
      if (creds?.partnerId !== userId) {
        throw new ForbiddenError('Não é permitido remover provedores globais ou de outros parceiros');
      }
    }

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

  app.post('/admin/providers/operations', masterOrPartnerOnly, async (request, reply) => {
    const payload = createProviderOperationSchema.parse(request.body);
    const role = request.authUser?.role;
    const userId = request.authUser?.userId;

    const provider = await app.prisma.provider.findUnique({ where: { id: payload.providerId } });
    if (!provider) throw new NotFoundError('Provedor não encontrado');

    if (role === 'CUSTOMER_ADMIN') {
      const creds = provider.credentials as Record<string, any> | null;
      if (creds?.partnerId !== userId) {
        throw new ForbiddenError('Sem permissão para adicionar operações a provedores globais ou de outros parceiros');
      }
    }

    return ok(reply, await app.prisma.providerOperation.create({
      data: payload,
    }), 201);
  });

  app.patch('/admin/providers/operations/:operationId', masterOrPartnerOnly, async (request, reply) => {
    const params = request.params as { operationId: string };
    const payload = updateProviderOperationSchema.parse(request.body);
    const role = request.authUser?.role;
    const userId = request.authUser?.userId;

    const op = await app.prisma.providerOperation.findUnique({
      where: { id: params.operationId },
      include: { provider: true }
    });
    if (!op) throw new NotFoundError('Operação não encontrada');

    if (role === 'CUSTOMER_ADMIN') {
      const creds = op.provider.credentials as Record<string, any> | null;
      if (creds?.partnerId !== userId) {
        throw new ForbiddenError('Sem permissão para modificar operações de provedores globais ou de outros parceiros');
      }
    }

    const updated = await app.prisma.providerOperation.update({
      where: { id: params.operationId },
      data: payload,
    });
    return ok(reply, updated);
  });

  app.delete('/admin/providers/operations/:operationId', masterOrPartnerOnly, async (request, reply) => {
    const params = request.params as { operationId: string };
    const role = request.authUser?.role;
    const userId = request.authUser?.userId;

    const op = await app.prisma.providerOperation.findUnique({
      where: { id: params.operationId },
      include: { provider: true }
    });
    if (!op) throw new NotFoundError('Operação não encontrada');

    if (role === 'CUSTOMER_ADMIN') {
      const creds = op.provider.credentials as Record<string, any> | null;
      if (creds?.partnerId !== userId) {
        throw new ForbiddenError('Sem permissão para remover operações de provedores globais ou de outros parceiros');
      }
    }

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

  app.post('/admin/providers/products', masterOrPartnerOnly, async (request, reply) => {
    const payload = createProviderProductSchema.parse(request.body);
    const role = request.authUser?.role;
    const userId = request.authUser?.userId;

    const provider = await app.prisma.provider.findUnique({ where: { id: payload.providerId } });
    if (!provider) throw new NotFoundError('Provedor não encontrado');

    if (role === 'CUSTOMER_ADMIN') {
      const creds = provider.credentials as Record<string, any> | null;
      if (creds?.partnerId !== userId) {
        throw new ForbiddenError('Sem permissão para adicionar produtos a provedores globais ou de outros parceiros');
      }
    }

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
      } as any,
    }), 201);
  });

  app.patch('/admin/providers/products/:productId', masterOrPartnerOnly, async (request, reply) => {
    const params = request.params as { productId: string };
    const payload = updateProviderProductSchema.parse(request.body);
    const role = request.authUser?.role;
    const userId = request.authUser?.userId;

    const product = await app.prisma.providerProduct.findUnique({
      where: { id: params.productId },
      include: { provider: true }
    });
    if (!product) throw new NotFoundError('Produto não encontrado');

    if (role === 'CUSTOMER_ADMIN') {
      const creds = product.provider.credentials as Record<string, any> | null;
      if (creds?.partnerId !== userId) {
        throw new ForbiddenError('Sem permissão para modificar produtos de provedores globais ou de outros parceiros');
      }
    }

    if (payload.templateLayout !== undefined && payload.templateLayout !== null) {
      const expressions = collectTemplateVariableExpressions(payload.templateLayout);
      for (const expression of expressions) {
        templateVariableExpressionSchema.parse(expression);
      }
    }

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
    if (payload.integrationOverrides !== undefined) {
      data.integrationOverrides =
        payload.integrationOverrides === null
          ? Prisma.JsonNull
          : (payload.integrationOverrides as Prisma.InputJsonValue);
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

  app.delete('/admin/providers/products/:productId', masterOrPartnerOnly, async (request, reply) => {
    const params = request.params as { productId: string };
    const role = request.authUser?.role;
    const userId = request.authUser?.userId;

    const product = await app.prisma.providerProduct.findUnique({
      where: { id: params.productId },
      include: { provider: true }
    });
    if (!product) throw new NotFoundError('Produto não encontrado');

    if (role === 'CUSTOMER_ADMIN') {
      const creds = product.provider.credentials as Record<string, any> | null;
      if (creds?.partnerId !== userId) {
        throw new ForbiddenError('Sem permissão para remover produtos de provedores globais ou de outros parceiros');
      }
    }

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

  app.post('/admin/providers/mappings', masterOrPartnerOnly, async (request, reply) => {
    const payload = createMappingSchema.parse(request.body);
    const role = request.authUser?.role;
    const userId = request.authUser?.userId;

    const product = await app.prisma.providerProduct.findUnique({
      where: { id: payload.productId },
      include: { provider: true }
    });
    if (!product) throw new NotFoundError('Produto não encontrado');

    if (role === 'CUSTOMER_ADMIN') {
      const creds = product.provider.credentials as Record<string, any> | null;
      if (creds?.partnerId !== userId) {
        throw new ForbiddenError('Sem permissão para adicionar mapeamentos a produtos de provedores globais ou de outros parceiros');
      }
    }

    return ok(reply, await app.prisma.providerFieldMapping.create({
      data: payload,
    }), 201);
  });

  app.patch('/admin/providers/mappings/:mappingId', masterOrPartnerOnly, async (request, reply) => {
    const params = request.params as { mappingId: string };
    const payload = updateMappingSchema.parse(request.body);
    const role = request.authUser?.role;
    const userId = request.authUser?.userId;

    const mapping = await app.prisma.providerFieldMapping.findUnique({
      where: { id: params.mappingId },
      include: { product: { include: { provider: true } } }
    });
    if (!mapping) throw new NotFoundError('Mapeamento não encontrado');

    if (role === 'CUSTOMER_ADMIN') {
      const creds = mapping.product.provider.credentials as Record<string, any> | null;
      if (creds?.partnerId !== userId) {
        throw new ForbiddenError('Sem permissão para modificar mapeamentos de provedores globais ou de outros parceiros');
      }
    }

    const updated = await app.prisma.providerFieldMapping.update({
      where: { id: params.mappingId },
      data: payload,
      include: { canonicalField: true, product: true },
    });

    return ok(reply, updated);
  });

  app.delete('/admin/providers/mappings/:mappingId', masterOrPartnerOnly, async (request, reply) => {
    const params = request.params as { mappingId: string };
    const role = request.authUser?.role;
    const userId = request.authUser?.userId;

    const mapping = await app.prisma.providerFieldMapping.findUnique({
      where: { id: params.mappingId },
      include: { product: { include: { provider: true } } }
    });
    if (!mapping) throw new NotFoundError('Mapeamento não encontrado');

    if (role === 'CUSTOMER_ADMIN') {
      const creds = mapping.product.provider.credentials as Record<string, any> | null;
      if (creds?.partnerId !== userId) {
        throw new ForbiddenError('Sem permissão para remover mapeamentos de provedores globais ou de outros parceiros');
      }
    }

    await app.prisma.providerFieldMapping.delete({ where: { id: params.mappingId } });
    return ok(reply, { deleted: true });
  });

  app.get('/admin/providers/products/:productId/session-assignments', masterOrPartnerOnly, async (request, reply) => {
    const params = request.params as { productId: string };
    const query = listProductSessionAssignmentsQuerySchema.parse(request.query);
    const role = request.authUser?.role;
    const userId = request.authUser?.userId;

    const product = await app.prisma.providerProduct.findUnique({
      where: { id: params.productId },
      include: { provider: true }
    });
    if (!product) throw new NotFoundError('Produto não encontrado');

    if (role === 'CUSTOMER_ADMIN') {
      const creds = product.provider.credentials as Record<string, any> | null;
      const partnerId = creds?.partnerId;
      if (partnerId && partnerId !== userId) {
        throw new ForbiddenError('Sem acesso a este produto');
      }
    }

    const where: Prisma.ProductSessionFieldAssignmentWhereInput = { productId: params.productId };
    if (query.sessionKey) where.sessionKey = query.sessionKey;

    const assignments = await app.prisma.productSessionFieldAssignment.findMany({
      where,
      include: { canonicalField: true },
      orderBy: [{ sessionKey: 'asc' }, { sortOrder: 'asc' }],
    });

    return ok(reply, assignments);
  });

  app.put('/admin/providers/products/:productId/session-assignments', masterOrPartnerOnly, async (request, reply) => {
    const params = request.params as { productId: string };
    const payload = putProductSessionAssignmentsSchema.parse(request.body);
    const role = request.authUser?.role;
    const userId = request.authUser?.userId;

    const product = await app.prisma.providerProduct.findUnique({
      where: { id: params.productId },
      include: { provider: true }
    });
    if (!product) throw new NotFoundError('Produto não encontrado');

    if (role === 'CUSTOMER_ADMIN') {
      const creds = product.provider.credentials as Record<string, any> | null;
      if (creds?.partnerId !== userId) {
        throw new ForbiddenError('Sem permissão para modificar atribuições de sessão de produtos globais ou de outros parceiros');
      }
    }

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

  app.get('/admin/providers/:providerId/config', masterOrPartnerOnly, async (request, reply) => {
    const params = request.params as { providerId: string };
    const role = request.authUser?.role;
    const userId = request.authUser?.userId;

    const provider = await app.prisma.provider.findUnique({
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
    });

    if (!provider) throw new NotFoundError('Provedor não encontrado');

    if (role === 'CUSTOMER_ADMIN') {
      const creds = provider.credentials as Record<string, any> | null;
      const partnerId = creds?.partnerId;
      if (partnerId && partnerId !== userId) {
        throw new ForbiddenError('Sem acesso a este provedor');
      }
    }

    const isPartner = role === 'CUSTOMER_ADMIN';
    const canEdit = !isPartner || (provider.credentials as Record<string, any> | null)?.partnerId === userId;

    const formatted = {
      ...provider,
      canEdit,
      operations: provider.operations.map(o => ({ ...o, canEdit })),
      products: provider.products.map(pr => ({ ...pr, canEdit }))
    };

    return ok(reply, formatted);
  });

  app.post('/admin/providers/products/test-draft', masterOrPartnerOnly, async (request, reply) => {
    const payload = testProductDraftSchema.parse(request.body);
    const role = request.authUser?.role;
    const userId = request.authUser?.userId;

    const provider = await app.prisma.provider.findUnique({ where: { id: payload.providerId } });
    if (!provider) throw new NotFoundError('Provedor não encontrado');

    if (role === 'CUSTOMER_ADMIN') {
      const creds = provider.credentials as Record<string, any> | null;
      if (creds?.partnerId !== userId) {
        throw new ForbiddenError('Sem permissão para testar em provedores globais ou de outros parceiros');
      }
    }

    return ok(reply, await testProviderProductDraft(app, {
      providerId: payload.providerId,
      endpointPath: payload.endpointPath,
      method: payload.method,
      actorUserId: request.authUser?.userId,
      context: payload.context,
      bodyTemplate: payload.bodyTemplate,
      queryTemplate: payload.queryTemplate,
      headersTemplate: payload.headersTemplate,
      homologationOnly: payload.homologationOnly,
      persistLog: payload.persistLog,
    }));
  });

  app.post('/admin/providers/products/:productId/test', masterOrPartnerOnly, async (request, reply) => {
    const params = request.params as { productId: string };
    const payload = testProductSchema.parse(request.body);
    const role = request.authUser?.role;
    const userId = request.authUser?.userId;

    const product = await app.prisma.providerProduct.findUnique({
      where: { id: params.productId },
      include: { provider: true }
    });
    if (!product) throw new NotFoundError('Produto não encontrado');

    if (role === 'CUSTOMER_ADMIN') {
      const creds = product.provider.credentials as Record<string, any> | null;
      if (creds?.partnerId !== userId) {
        throw new ForbiddenError('Sem permissão para testar produtos de provedores globais ou de outros parceiros');
      }
    }

    return ok(reply, await testProviderProduct(app, {
      productId: params.productId,
      actorUserId: request.authUser?.userId,
      context: payload.context,
      bodyTemplate: payload.bodyTemplate,
      queryTemplate: payload.queryTemplate,
      headersTemplate: payload.headersTemplate,
    }));
  });

  app.post('/admin/providers/operations/:operationId/test', masterOrPartnerOnly, async (request, reply) => {
    const params = request.params as { operationId: string };
    const payload = testProductSchema.parse(request.body);
    const role = request.authUser?.role;
    const userId = request.authUser?.userId;

    const op = await app.prisma.providerOperation.findUnique({
      where: { id: params.operationId },
      include: { provider: true }
    });
    if (!op) throw new NotFoundError('Operação não encontrada');

    if (role === 'CUSTOMER_ADMIN') {
      const creds = op.provider.credentials as Record<string, any> | null;
      if (creds?.partnerId !== userId) {
        throw new ForbiddenError('Sem permissão para testar operações de provedores globais ou de outros parceiros');
      }
    }

    return ok(reply, await testProviderOperation(app, {
      operationId: params.operationId,
      actorUserId: request.authUser?.userId,
      context: payload.context,
    }));
  });

  app.post('/admin/merge/preview', masterOrPartnerOnly, async (request, reply) => {
    const payload = previewMergeSchema.parse(request.body);
    const role = request.authUser?.role;
    const userId = request.authUser?.userId;

    if (role === 'CUSTOMER_ADMIN') {
      if (payload.testLogIds && payload.testLogIds.length > 0) {
        const logs = await app.prisma.providerTestLog.findMany({
          where: { id: { in: payload.testLogIds } },
          include: { provider: true }
        });
        for (const log of logs) {
          const creds = log.provider?.credentials as Record<string, any> | null;
          if (creds?.partnerId !== userId) {
            throw new ForbiddenError('Sem permissão para mesclar dados de outros provedores');
          }
        }
      }
    }

    return ok(reply, await previewMerge(app, {
      actorUserId: request.authUser?.userId,
      executionIds: payload.executionIds,
      testLogIds: payload.testLogIds,
    }));
  });

  app.get('/admin/test-logs', masterOrPartnerOnly, async (request, reply) => {
    const role = request.authUser?.role;
    const userId = request.authUser?.userId;

    const logs = await app.prisma.providerTestLog.findMany({
      include: {
        provider: true,
        product: true,
        operation: true,
      },
      orderBy: { createdAt: 'desc' },
      take: role === 'CUSTOMER_ADMIN' ? 1000 : 100,
    });

    if (role === 'PLATFORM_ADMIN') {
      return ok(reply, logs.slice(0, 100));
    }

    if (role === 'CUSTOMER_ADMIN') {
      const filtered = logs.filter(log => {
        const creds = log.provider?.credentials as Record<string, any> | null;
        return creds?.partnerId === userId;
      });
      return ok(reply, filtered.slice(0, 100));
    }

    throw new ForbiddenError('Acesso não autorizado');
  });

  app.get('/admin/tokens', adminOnly, async (request, reply) => {
    const role = request.authUser?.role;
    const userId = request.authUser?.userId;
    const companyId = request.authUser?.companyId;

    const where: Prisma.ApiTokenWhereInput = {};

    if (role === 'CUSTOMER_ADMIN') {
      where.company = {
        metadata: {
          path: ['partnerId'],
          equals: userId,
        },
      };
    } else if (role === 'COMPANY_ADMIN') {
      where.companyId = companyId;
    }

    return ok(reply, await app.prisma.apiToken.findMany({
      where,
      include: { tenant: true, company: { select: { id: true, name: true, slug: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }));
  });

  app.post('/admin/tokens', adminOnly, async (request, reply) => {
    const payload = createTokenSchema.parse(request.body);
    const role = request.authUser?.role;
    const userId = request.authUser?.userId;
    const companyId = request.authUser?.companyId;

    let targetCompanyId = payload.companyId;

    if (role === 'CUSTOMER_ADMIN') {
      if (!targetCompanyId) {
        throw new ForbiddenError('Informe o id da empresa para criar o token');
      }
      const targetCompany = await app.prisma.company.findUnique({ where: { id: targetCompanyId } });
      const partnerId = (targetCompany?.metadata as Record<string, unknown> | null)?.partnerId;
      if (partnerId !== userId) {
        throw new ForbiddenError('Empresa não vinculada a este parceiro');
      }
    } else if (role === 'COMPANY_ADMIN') {
      targetCompanyId = companyId ?? undefined;
    }

    const result = await createApiToken(app, {
      tenantId: role === 'PLATFORM_ADMIN' ? payload.tenantId : undefined,
      companyId: targetCompanyId,
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
        companyId: targetCompanyId ?? null,
        tenantId: role === 'PLATFORM_ADMIN' ? (payload.tenantId ?? null) : null,
      },
    });

    return ok(reply, result, 201);
  });

  app.patch('/admin/tokens/:tokenId', adminOnly, async (request, reply) => {
    const params = request.params as { tokenId: string };
    const payload = patchAdminTokenSchema.parse(request.body);
    const role = request.authUser?.role;
    const userId = request.authUser?.userId;
    const companyId = request.authUser?.companyId;

    const existing = await app.prisma.apiToken.findUnique({
      where: { id: params.tokenId },
      include: { company: true },
    });
    if (!existing) throw new NotFoundError('Token não encontrado');

    if (role === 'CUSTOMER_ADMIN') {
      const partnerId = (existing.company?.metadata as Record<string, unknown> | null)?.partnerId;
      if (partnerId !== userId) {
        throw new ForbiddenError('Sem acesso a este token');
      }
    } else if (role === 'COMPANY_ADMIN') {
      if (existing.companyId !== companyId) {
        throw new ForbiddenError('Sem acesso a este token');
      }
    }

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
    const role = request.authUser?.role;
    const userId = request.authUser?.userId;
    const userCompanyId = request.authUser?.companyId;

    const targetCompany = await app.prisma.company.findUnique({
      where: { id: params.companyId },
      include: { wallet: true },
    });

    if (!targetCompany || !targetCompany.wallet) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Empresa ou carteira de destino não encontrada' } });
    }

    if (role === 'CUSTOMER_ADMIN') {
      // Verificar vínculo da empresa de destino
      const partnerId = (targetCompany.metadata as Record<string, unknown> | null)?.partnerId;
      if (partnerId !== userId) {
        throw new ForbiddenError('Sem acesso para gerenciar saldo desta empresa');
      }

      // Buscar carteira do parceiro
      if (!userCompanyId) {
        throw new ForbiddenError('Parceiro não possui uma empresa vinculada');
      }

      const partnerCompany = await app.prisma.company.findUnique({
        where: { id: userCompanyId },
        include: { wallet: true },
      });

      if (!partnerCompany || !partnerCompany.wallet) {
        throw new ForbiddenError('Carteira do parceiro não encontrada');
      }

      const amountDecimal = new Prisma.Decimal(body.amount);
      if (partnerCompany.wallet.balance.lessThan(amountDecimal)) {
        throw new ConflictError('Saldo insuficiente na sua carteira de parceiro');
      }

      // Realizar transação de transferência
      const [partnerWallet, targetWallet, debitEntry, creditEntry] = await app.prisma.$transaction(async (tx) => {
        const nextPartnerBalance = partnerCompany.wallet!.balance.sub(amountDecimal);
        const nextTargetBalance = targetCompany.wallet!.balance.add(amountDecimal);

        // Atualiza carteira do parceiro
        await tx.wallet.update({
          where: { id: partnerCompany.wallet!.id },
          data: { balance: nextPartnerBalance },
        });

        // Atualiza carteira de destino
        const updatedTargetWallet = await tx.wallet.update({
          where: { id: targetCompany.wallet!.id },
          data: { balance: nextTargetBalance },
        });

        // Cria entrada de débito no extrato do parceiro
        const debit = await tx.ledgerEntry.create({
          data: {
            walletId: partnerCompany.wallet!.id,
            companyId: userCompanyId,
            type: 'DEBIT',
            amount: amountDecimal,
            balanceBefore: partnerCompany.wallet!.balance,
            balanceAfter: nextPartnerBalance,
            description: body.description ?? `Transferência para ${targetCompany.name}`,
            metadata: { source: 'ADMIN_TRANSFER', targetCompanyId: targetCompany.id },
          },
        });

        // Cria entrada de crédito no extrato do destino
        const credit = await tx.ledgerEntry.create({
          data: {
            walletId: targetCompany.wallet!.id,
            companyId: targetCompany.id,
            type: 'CREDIT',
            amount: amountDecimal,
            balanceBefore: targetCompany.wallet!.balance,
            balanceAfter: nextTargetBalance,
            description: body.description ?? `Saldo recebido do parceiro ${request.authUser?.email ?? 'Parceiro'}`,
            metadata: { source: 'ADMIN_TRANSFER', sourceCompanyId: userCompanyId },
          },
        });

        return [partnerCompany.wallet, updatedTargetWallet, debit, credit];
      });

      await logAdminAudit(app, {
        actorUserId: userId,
        action: 'COMPANY_CREDIT_TRANSFER',
        entityType: 'COMPANY',
        entityId: params.companyId,
        metadata: {
          amount: String(body.amount),
          debitEntryId: debitEntry.id,
          creditEntryId: creditEntry.id,
          description: body.description ?? null,
        },
      });

      return ok(reply, creditEntry, 201);

    } else if (role === 'COMPANY_ADMIN') {
      // Administrador de empresa não pode creditar ou debitar saldo externamente
      throw new ForbiddenError('Administrador de empresa não possui permissão para transferir saldo');
    }

    // Fluxo para PLATFORM_ADMIN (Master) - Cria crédito do nada
    const updated = await app.prisma.$transaction(async (tx) => {
      const amountDecimal = new Prisma.Decimal(body.amount);
      const nextBalance = targetCompany.wallet!.balance.add(amountDecimal);

      await tx.wallet.update({
        where: { id: targetCompany.wallet!.id },
        data: { balance: nextBalance },
      });

      return tx.ledgerEntry.create({
        data: {
          walletId: targetCompany.wallet!.id,
          companyId: params.companyId,
          type: 'CREDIT',
          amount: amountDecimal,
          balanceBefore: targetCompany.wallet!.balance,
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

  app.get('/admin/consultations', adminOnly, async (request, reply) => {
    const role = request.authUser?.role;
    const userId = request.authUser?.userId;
    const companyId = request.authUser?.companyId;

    const where: Prisma.ConsultationWhereInput = {};

    if (role === 'CUSTOMER_ADMIN') {
      where.company = {
        metadata: {
          path: ['partnerId'],
          equals: userId,
        },
      };
    } else if (role === 'COMPANY_ADMIN') {
      where.companyId = companyId;
    }

    const consultations = await app.prisma.consultation.findMany({
      where,
      select: {
        id: true,
        subjectDocument: true,
        subjectType: true,
        totalCost: true,
        status: true,
        createdAt: true,
        errorMessage: true,
        externalUserId: true,
        company: { select: { id: true, name: true } },
        requestedByUser: { select: { id: true, fullName: true, email: true } },
        template: { select: { id: true, name: true } },
        _count: { select: { executions: true, items: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return ok(reply, consultations);
  });

  app.get('/admin/consultations/:id', adminOnly, async (request, reply) => {
    const params = request.params as { id: string };
    const role = request.authUser?.role;
    const userId = request.authUser?.userId;
    const companyId = request.authUser?.companyId;

    const consultation = await app.prisma.consultation.findUnique({
      where: { id: params.id },
      include: {
        requestedByUser: { select: { id: true, fullName: true, email: true } },
        company: { select: { id: true, name: true, metadata: true } },
        template: { select: { id: true, name: true } },
        executions: {
          include: {
            provider: { select: { id: true, name: true } },
            product: {
              include: {
                mappings: {
                  include: {
                    canonicalField: true
                  }
                }
              }
            }
          }
        },
        items: {
          include: {
            providerProduct: {
              include: { provider: true }
            }
          }
        }
      }
    });

    if (!consultation) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Consulta não encontrada' } });
    }

    // Validação de acesso multi-tenant para consulta
    if (role === 'CUSTOMER_ADMIN') {
      const partnerId = (consultation.company?.metadata as Record<string, unknown> | null)?.partnerId;
      if (partnerId !== userId) {
        throw new ForbiddenError('Sem acesso a esta consulta');
      }
    } else if (role === 'COMPANY_ADMIN') {
      if (consultation.companyId !== companyId) {
        throw new ForbiddenError('Sem acesso a esta consulta');
      }
    }

    return ok(reply, consultation);
  });
}
