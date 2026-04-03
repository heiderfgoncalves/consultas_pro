import type { FastifyInstance } from 'fastify';
import { ok } from '../../core/http';

export async function registerHealthRoutes(app: FastifyInstance) {
  app.get('/health', async (_request, reply) => {
    return ok(reply, {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });
}
