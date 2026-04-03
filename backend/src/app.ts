import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import { env } from './config/env';
import { prisma } from './db/prisma';
import { redis } from './lib/redis';
import { registerModules } from './modules';
import { AppError } from './core/errors';
import { fail } from './core/http';
import { authenticate } from './core/auth';

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL,
    },
  });

  app.decorate('prisma', prisma);
  app.decorate('redis', redis);
  app.decorate('authenticate', authenticate);

  await app.register(cors, { origin: true, credentials: true });
  await app.register(helmet);
  await app.register(jwt, {
    secret: env.JWT_SECRET,
  });

  app.setErrorHandler((error, request, reply) => {
    request.log.error({ error }, 'request_failed');

    if (error instanceof AppError) {
      return fail(reply, error.statusCode, error.code, error.message, error.details);
    }

    if ('issues' in error && Array.isArray((error as { issues?: unknown[] }).issues)) {
      return fail(reply, 422, 'VALIDATION_ERROR', 'Falha de validação', (error as { issues: unknown[] }).issues);
    }

    return fail(reply, 500, 'INTERNAL_SERVER_ERROR', 'Erro interno do servidor');
  });

  await registerModules(app);

  return app;
}
