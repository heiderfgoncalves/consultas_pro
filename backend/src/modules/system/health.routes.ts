import type { FastifyInstance } from 'fastify';
import { ok } from '../../core/http';
import { healthOpenApi } from '../../openapi/schemas';

export async function registerHealthRoutes(app: FastifyInstance) {
  app.get(
    '/health',
    {
      schema: {
        tags: ['System'],
        summary: 'Health check',
        description: 'Indica se o processo está ativo.',
        response: {
          200: healthOpenApi.response200,
        },
      },
    },
    async (_request, reply) => {
      return ok(reply, {
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      });
    },
  );
}
