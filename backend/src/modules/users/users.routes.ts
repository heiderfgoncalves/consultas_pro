import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../core/auth';
import { ok } from '../../core/http';
import { updateProfileSchema } from './users.schemas';

export async function registerUserRoutes(app: FastifyInstance) {
  app.get('/users/me', { preHandler: [authenticate] }, async (request, reply) => {
    const user = await app.prisma.user.findUnique({
      where: { id: request.authUser!.userId },
      include: { company: true },
    });

    return ok(reply, user);
  });

  app.patch('/users/me', { preHandler: [authenticate] }, async (request, reply) => {
    const payload = updateProfileSchema.parse(request.body);

    const user = await app.prisma.user.update({
      where: { id: request.authUser!.userId },
      data: payload,
    });

    return ok(reply, user);
  });
}
