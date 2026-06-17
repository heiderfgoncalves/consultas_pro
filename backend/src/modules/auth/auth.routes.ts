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
  sanitizeUser,
} from './auth.service';
import { sha256, hashPassword } from '../../lib/hash';

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
    if (!request.authUser?.userId) {
      return reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Não autenticado' } });
    }
    const user = await app.prisma.user.findUnique({
      where: { id: request.authUser.userId },
    });
    if (!user) {
      return reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Usuário não encontrado' } });
    }
    return ok(reply, sanitizeUser(user));
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

  app.post('/auth/reset-password-forced', { preHandler: [authenticate] }, async (request, reply) => {
    if (!request.authUser?.userId) {
      return reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Não autenticado' } });
    }
    const body = request.body as { password?: string };
    if (!body.password || body.password.length < 6) {
      return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'A senha deve ter no mínimo 6 caracteres' } });
    }

    const hashedPassword = await hashPassword(body.password);
    const updatedUser = await app.prisma.user.update({
      where: { id: request.authUser.userId },
      data: {
        passwordHash: hashedPassword,
        mustResetPassword: false,
      },
    });

    return ok(reply, sanitizeUser(updatedUser));
  });

  // Helper para decodificar JWT do Google (ID Token)
  function decodeGoogleIdToken(token: string) {
    try {
      // Se for um ID Token simulado para teste local de desenvolvimento
      if (token.startsWith('mock_google_')) {
        const parts = token.split('_');
        const email = parts[2] ? `${parts[2]}@gmail.com` : 'mock.user@gmail.com';
        const name = parts[2] ? parts[2].split('.').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ') : 'Usuário Google Teste';
        return {
          sub: token,
          email,
          name,
          picture: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
        };
      }

      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const jsonStr = Buffer.from(payloadBase64, 'base64').toString('utf8');
      const payload = JSON.parse(jsonStr);
      return {
        sub: payload.sub as string,
        email: payload.email as string,
        name: (payload.name || payload.given_name || payload.email.split('@')[0]) as string,
        picture: payload.picture as string | undefined,
      };
    } catch {
      return null;
    }
  }

  // Rota de login/cadastro pelo Google
  app.post('/auth/google', async (request, reply) => {
    const body = request.body as { credential?: string; registerAs?: 'company' | 'user' };
    if (!body.credential) {
      return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Credential do Google não fornecida' } });
    }

    const payload = decodeGoogleIdToken(body.credential);
    if (!payload || !payload.email) {
      return reply.status(400).send({ success: false, error: { code: 'INVALID_CREDENTIAL', message: 'Token do Google inválido ou ilegível' } });
    }

    const googleId = payload.sub;
    const email = payload.email.toLowerCase();
    const name = payload.name;

    // 1. Tenta buscar usuário por googleId
    let user = await app.prisma.user.findUnique({
      where: { googleId },
      include: { company: true },
    });

    // 2. Se não encontrou por googleId, tenta por email
    if (!user) {
      user = await app.prisma.user.findUnique({
        where: { email },
        include: { company: true },
      });

      if (user) {
        // Se já existia conta com esse e-mail, vincula o googleId automaticamente
        user = await app.prisma.user.update({
          where: { id: user.id },
          data: { googleId },
          include: { company: true },
        });
      }
    }

    // 3. Se não existe conta com googleId nem email, cria uma nova
    if (!user) {
      const isRegisteringCompany = body.registerAs === 'company';
      
      let companyId: string | null = null;
      let finalRole: any = 'USER'; // standalone por padrão

      if (isRegisteringCompany) {
        // Cria uma nova empresa fictícia para o usuário do Google
        const companyName = `Empresa de ${name}`;
        const randomDoc = Math.floor(10000000000000 + Math.random() * 90000000000000).toString(); // CNPJ aleatório
        const slug = `empresa-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Math.floor(Math.random() * 10000)}`;

        const company = await app.prisma.company.create({
          data: {
            name: companyName,
            slug,
            document: randomDoc,
            email,
            wallet: { create: { balance: 0 } },
          },
        });
        companyId = company.id;
        finalRole = 'COMPANY_ADMIN'; // administrador de empresa
      }

      // Gera senha randômica já que ele usará o Google login
      const randomPassword = await hashPassword(Math.random().toString(36).slice(-10) + 'A1!');

      user = await app.prisma.user.create({
        data: {
          fullName: name,
          email,
          passwordHash: randomPassword,
          role: finalRole,
          companyId,
          googleId,
          isActive: true,
          mustResetPassword: false,
        },
        include: { company: true },
      });

      // Se for usuário individual (USER), cria também uma assinatura grátis do plano individual
      if (finalRole === 'USER') {
        const freePlan = await app.prisma.plan.findUnique({ where: { slug: 'individual-free' } });
        if (freePlan) {
          await app.prisma.subscription.create({
            data: {
              userId: user.id,
              planId: freePlan.id,
              price: freePlan.price,
              userLimit: freePlan.userLimit,
              extraUserPrice: freePlan.extraUserPrice,
              extraUserBlock: freePlan.extraUserBlock,
              status: 'ACTIVE',
              currentPeriodStart: new Date(),
              currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            },
          });
        }
      }
    }

    if (!user.isActive || user.accountStatus !== 'ACTIVE') {
      return reply.status(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Esta conta está inativa ou suspensa' } });
    }

    // Registra último login
    await app.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const jwtToken = app.jwt.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
    });

    return ok(reply, {
      user: sanitizeUser(user),
      token: jwtToken,
    });
  });

  // Rota de vínculo de conta Google com usuário logado
  app.post('/auth/google/link', { preHandler: [authenticate] }, async (request, reply) => {
    const body = request.body as { credential?: string };
    if (!body.credential) {
      return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Credential do Google não fornecida' } });
    }

    const payload = decodeGoogleIdToken(body.credential);
    if (!payload || !payload.email) {
      return reply.status(400).send({ success: false, error: { code: 'INVALID_CREDENTIAL', message: 'Token do Google inválido' } });
    }

    const googleId = payload.sub;

    // Verifica se já existe outra conta associada a este Google ID
    const existing = await app.prisma.user.findFirst({
      where: {
        googleId,
        id: { not: request.authUser!.userId },
      },
    });

    if (existing) {
      return reply.status(409).send({ success: false, error: { code: 'CONFLICT', message: 'Esta conta do Google já está vinculada a outro usuário' } });
    }

    const updatedUser = await app.prisma.user.update({
      where: { id: request.authUser!.userId },
      data: { googleId },
    });

    return ok(reply, sanitizeUser(updatedUser));
  });
}
