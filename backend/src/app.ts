import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import swagger from '@fastify/swagger';
import { env } from './config/env';
import { buildCorsOptions } from './config/cors';
import { prisma } from './db/prisma';
import { redis } from './lib/redis';
import { registerModules } from './modules';
import { AppError } from './core/errors';
import { fail } from './core/http';
import { authenticate, requireRoles } from './core/auth';

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL,
    },
  });

  app.decorate('prisma', prisma);
  app.decorate('redis', redis);
  app.decorate('authenticate', authenticate);

  await app.register(cors, buildCorsOptions());
  await app.register(helmet);
  await app.register(jwt, {
    secret: env.JWT_SECRET,
  });

  const apiServerUrl = env.APP_URL.replace(/\/$/, '');

  await app.register(swagger, {
    openapi: {
      openapi: '3.0.3',
      info: {
        title: 'Consultas PRO API',
        description: 'API REST da plataforma Consultas PRO (escopo documentado em evolução).',
        version: '0.1.0',
      },
      servers: [{ url: apiServerUrl, description: 'API' }],
      tags: [
        { name: 'System', description: 'Saúde e utilitários' },
        { name: 'Auth', description: 'Autenticação e cadastro' },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
    },
  });

  app.setErrorHandler((error, request, reply) => {
    request.log.error({ error }, 'request_failed');

    if (error instanceof AppError) {
      return fail(reply, error.statusCode, error.code, error.message, error.details);
    }

    const fastifyValidation = error as { code?: string; validation?: unknown };
    if (fastifyValidation.code === 'FST_ERR_VALIDATION' && fastifyValidation.validation !== undefined) {
      return fail(reply, 422, 'VALIDATION_ERROR', 'Falha de validação', fastifyValidation.validation);
    }

    if (
      typeof error === 'object' &&
      error !== null &&
      'issues' in error &&
      Array.isArray((error as { issues: unknown[] }).issues)
    ) {
      return fail(reply, 422, 'VALIDATION_ERROR', 'Falha de validação', (error as { issues: unknown[] }).issues);
    }

    return fail(reply, 500, 'INTERNAL_SERVER_ERROR', 'Erro interno do servidor');
  });

  await registerModules(app);

  const openapiAccess = {
    preHandler: [authenticate, requireRoles(['PLATFORM_ADMIN', 'COMPANY_OWNER', 'COMPANY_MANAGER'])],
  };

  app.get(
    '/openapi.json',
    {
      ...openapiAccess,
      schema: {
        hide: true,
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            description: 'Documento OpenAPI 3',
            type: 'object',
            additionalProperties: true,
          },
        },
      },
    },
    async (_request, reply) => {
      return reply.type('application/json; charset=utf-8').send(app.swagger());
    },
  );

  return app;
}
