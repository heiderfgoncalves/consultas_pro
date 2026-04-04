import type { FastifyInstance } from 'fastify';
import { ok } from '../../core/http';
import { authenticate } from '../../core/auth';
import { acceptInviteSchema } from './auth.schemas';
import { authOpenApiBodies, authOpenApiResponses } from '../../openapi/schemas';
import {
  acceptInvite,
  createInvite,
  login,
  registerCompanyOwner,
  registerStandaloneUser,
} from './auth.service';
import { sha256 } from '../../lib/hash';

export async function registerAuthRoutes(app: FastifyInstance) {
  app.post(
    '/auth/login',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Login',
        description: 'Autenticação por e-mail e senha; retorna JWT de acesso.',
        body: authOpenApiBodies.login,
        response: {
          200: authOpenApiResponses.login200,
        },
      },
    },
    async (request, reply) => {
      const body = request.body as { email: string; password: string };
      return ok(reply, await login(app, body.email, body.password));
    },
  );

  app.post(
    '/auth/register-user',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Cadastro de usuário avulso',
        description: 'Cria conta individual (sem empresa).',
        body: authOpenApiBodies.registerUser,
        response: {
          201: authOpenApiResponses.registerUser201,
        },
      },
    },
    async (request, reply) => {
      const body = request.body as {
        fullName: string;
        email: string;
        document: string;
        phone: string;
        password: string;
      };
      return ok(reply, await registerStandaloneUser(app, body), 201);
    },
  );

  app.post(
    '/auth/register-company',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Cadastro de empresa',
        description: 'Cria empresa, carteira e usuário dono (COMPANY_OWNER).',
        body: authOpenApiBodies.registerCompany,
        response: {
          201: authOpenApiResponses.registerCompany201,
        },
      },
    },
    async (request, reply) => {
      const body = request.body as {
        companyName: string;
        companyDocument: string;
        companyEmail?: string;
        companyPhone?: string;
        ownerFullName: string;
        ownerEmail: string;
        ownerDocument: string;
        ownerPhone: string;
        password: string;
        tenantSlug?: string;
      };
      return ok(reply, await registerCompanyOwner(app, body), 201);
    },
  );

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
