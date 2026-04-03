import type { FastifyInstance } from 'fastify';
import { ok } from '../../core/http';
import { authenticate } from '../../core/auth';
import {
  acceptInviteSchema,
  loginSchema,
  registerCompanySchema,
  registerUserSchema,
} from './auth.schemas';
import {
  acceptInvite,
  createInvite,
  login,
  registerCompanyOwner,
  registerStandaloneUser,
} from './auth.service';
import { sha256 } from '../../lib/hash';

export async function registerAuthRoutes(app: FastifyInstance) {
  app.post('/auth/login', async (request, reply) => {
    const payload = loginSchema.parse(request.body);
    return ok(reply, await login(app, payload.email, payload.password));
  });

  app.post('/auth/register-user', async (request, reply) => {
    const payload = registerUserSchema.parse(request.body);
    return ok(reply, await registerStandaloneUser(app, payload), 201);
  });

  app.post('/auth/register-company', async (request, reply) => {
    const payload = registerCompanySchema.parse(request.body);
    return ok(reply, await registerCompanyOwner(app, payload), 201);
  });

  app.post('/auth/accept-invite', async (request, reply) => {
    const payload = acceptInviteSchema.parse(request.body);
    return ok(reply, await acceptInvite(app, payload), 201);
  });

  app.get('/auth/me', { preHandler: [authenticate] }, async (request, reply) => {
    return ok(reply, request.authUser);
  });

  app.post('/auth/invite/preview', async (request, reply) => {
    const body = (request.body ?? {}) as { token: string };
    const invite = await app.prisma.invite.findUnique({
      where: { tokenHash: sha256(body.token) },
      include: { company: true },
    });

    return ok(reply, invite ? {
      id: invite.id,
      type: invite.type,
      email: invite.email,
      roleToAssign: invite.roleToAssign,
      company: invite.company ? { id: invite.company.id, name: invite.company.name } : null,
      expiresAt: invite.expiresAt,
      status: invite.status,
    } : null);
  });

  app.post('/internal/dev/invites', { preHandler: [authenticate] }, async (request, reply) => {
    const body = request.body as {
      type: 'USER' | 'COMPANY';
      email: string;
      companyId?: string;
      roleToAssign?: 'COMPANY_MANAGER' | 'USER';
    };

    return ok(reply, await createInvite(app, {
      ...body,
      invitedByUserId: request.authUser?.userId,
    }), 201);
  });
}
