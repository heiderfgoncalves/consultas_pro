import type { FastifyInstance } from 'fastify';
import { authenticate, requireRoles } from '../../core/auth';
import { COMPANY_MANAGEMENT_ROLES, COMPANY_OWNER_ROLES } from '../../core/permissions';
import { ok } from '../../core/http';
import { createCompanyUserSchema, createCompanyUserInviteSchema } from './companies.schemas';
import { assertCompanyAccess, createCompanyUser, getCompanyContext, inviteCompanyUser } from './companies.service';

export async function registerCompanyRoutes(app: FastifyInstance) {
  app.get('/companies/me', { preHandler: [authenticate] }, async (request, reply) => {
    const companyId = request.authUser?.companyId;
    if (!companyId) return ok(reply, null);

    return ok(reply, await getCompanyContext(app, companyId));
  });

  app.get('/companies/me/users', {
    preHandler: [authenticate, requireRoles(COMPANY_MANAGEMENT_ROLES)],
  }, async (request, reply) => {
    const companyId = request.authUser?.companyId;
    if (!companyId) return ok(reply, []);

    const users = await app.prisma.user.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });

    return ok(reply, users);
  });

  app.post('/companies/me/users', {
    preHandler: [authenticate, requireRoles(COMPANY_OWNER_ROLES)],
  }, async (request, reply) => {
    const companyId = request.authUser?.companyId;
    assertCompanyAccess(companyId, request.authUser?.companyId);

    const payload = createCompanyUserSchema.parse(request.body);
    return ok(reply, await createCompanyUser(app, companyId!, payload), 201);
  });

  app.post('/companies/me/users/invites', {
    preHandler: [authenticate, requireRoles(COMPANY_MANAGEMENT_ROLES)],
  }, async (request, reply) => {
    const payload = createCompanyUserInviteSchema.parse(request.body);
    const companyId = request.authUser?.companyId;
    assertCompanyAccess(companyId, request.authUser?.companyId);

    return ok(reply, await inviteCompanyUser(app, companyId!, request.authUser!.userId, payload), 201);
  });

  app.patch('/companies/me/users/:userId/status', {
    preHandler: [authenticate, requireRoles(COMPANY_MANAGEMENT_ROLES)],
  }, async (request, reply) => {
    const params = request.params as { userId: string };
    const body = request.body as { isActive: boolean };

    const user = await app.prisma.user.findUnique({ where: { id: params.userId } });
    if (!user || user.companyId !== request.authUser?.companyId) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Usuário não encontrado' } });
    }

    const updated = await app.prisma.user.update({
      where: { id: params.userId },
      data: { isActive: body.isActive },
    });

    return ok(reply, updated);
  });

  // GET: Listar Tokens de API da empresa
  app.get('/companies/me/tokens', {
    preHandler: [authenticate, requireRoles(COMPANY_MANAGEMENT_ROLES)],
  }, async (request, reply) => {
    const companyId = request.authUser?.companyId;
    if (!companyId) return ok(reply, []);

    const tokens = await app.prisma.apiToken.findMany({
      where: { companyId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    return ok(reply, tokens);
  });

  // POST: Criar Token de API para a empresa
  app.post('/companies/me/tokens', {
    preHandler: [authenticate, requireRoles(COMPANY_OWNER_ROLES)],
  }, async (request, reply) => {
    const companyId = request.authUser?.companyId;
    if (!companyId) {
      return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST', message: 'Empresa não associada' } });
    }

    const body = request.body as { label: string; allowedOrigins?: string[] };
    if (!body.label) {
      return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST', message: 'Rótulo do token é obrigatório' } });
    }

    const { createApiToken } = require('../providers/providers.service');
    const result = await createApiToken(app, {
      companyId,
      createdById: request.authUser!.userId,
      label: body.label,
      allowedOrigins: body.allowedOrigins || [],
    });

    return ok(reply, result, 201);
  });

  // DELETE: Revogar (desativar) Token de API da empresa
  app.delete('/companies/me/tokens/:tokenId', {
    preHandler: [authenticate, requireRoles(COMPANY_OWNER_ROLES)],
  }, async (request, reply) => {
    const companyId = request.authUser?.companyId;
    const params = request.params as { tokenId: string };

    const existing = await app.prisma.apiToken.findUnique({
      where: { id: params.tokenId },
    });

    if (!existing || existing.companyId !== companyId) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Token não encontrado' } });
    }

    await app.prisma.apiToken.update({
      where: { id: params.tokenId },
      data: { isActive: false },
    });

    return ok(reply, { success: true });
  });
}
