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
}
