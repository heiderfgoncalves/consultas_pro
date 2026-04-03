import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../core/auth';
import { ok } from '../../core/http';
import { createTemplateSchema } from './templates.schemas';

export async function registerTemplateRoutes(app: FastifyInstance) {
  app.get('/templates', { preHandler: [authenticate] }, async (request, reply) => {
    const companyId = request.authUser?.companyId;
    const userId = request.authUser!.userId;

    const filters = [
      { visibility: 'GLOBAL' as const },
      { visibility: 'PRIVATE' as const, userId },
      ...(companyId ? [{ visibility: 'COMPANY' as const, companyId }] : []),
    ];

    const templates = await app.prisma.template.findMany({
      where: {
        OR: filters,
      },
      include: {
        items: {
          include: {
            providerProduct: {
              include: { provider: true, consultationType: true },
            },
          },
        },
      },
      orderBy: [{ isFavorite: 'desc' }, { updatedAt: 'desc' }],
    });

    return ok(reply, templates);
  });

  app.post('/templates', { preHandler: [authenticate] }, async (request, reply) => {
    const payload = createTemplateSchema.parse(request.body);

    const template = await app.prisma.template.create({
      data: {
        companyId: payload.visibility === 'COMPANY' ? request.authUser?.companyId ?? null : null,
        userId: payload.visibility === 'PRIVATE' ? request.authUser!.userId : null,
        name: payload.name,
        description: payload.description,
        visibility: payload.visibility,
        isFavorite: payload.isFavorite,
        items: {
          createMany: {
            data: payload.items.map((item) => ({
              providerProductId: item.providerProductId,
              sortOrder: item.sortOrder,
              alias: item.alias,
            })),
          },
        },
      },
      include: {
        items: true,
      },
    });

    return ok(reply, template, 201);
  });

  app.patch('/templates/:templateId/favorite', { preHandler: [authenticate] }, async (request, reply) => {
    const params = request.params as { templateId: string };
    const body = request.body as { isFavorite: boolean };

    const template = await app.prisma.template.update({
      where: { id: params.templateId },
      data: { isFavorite: body.isFavorite },
    });

    return ok(reply, template);
  });
}
