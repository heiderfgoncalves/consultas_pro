import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../core/auth';
import { ok } from '../../core/http';
import { createConsultationSchema, mergePreviewSchema } from './consultations.schemas';
import { createConsultation } from './consultations.service';
import { previewMerge } from '../providers/providers.service';

export async function registerConsultationRoutes(app: FastifyInstance) {
  app.post('/consultations', { preHandler: [authenticate] }, async (request, reply) => {
    const payload = createConsultationSchema.parse(request.body);

    return ok(reply, await createConsultation(app, {
      requestedByUserId: request.authUser!.userId,
      companyId: request.authUser?.companyId,
      subjectDocument: payload.subjectDocument,
      subjectType: payload.subjectType,
      templateId: payload.templateId,
      providerProductIds: payload.providerProductIds,
    }), 201);
  });

  app.get('/consultations', { preHandler: [authenticate] }, async (request, reply) => {
    const consultations = await app.prisma.consultation.findMany({
      where: request.authUser?.companyId
        ? { companyId: request.authUser.companyId }
        : { requestedByUserId: request.authUser!.userId },
      include: {
        items: {
          include: {
            providerProduct: {
              include: { provider: true, consultationType: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return ok(reply, consultations);
  });

  app.get('/consultations/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const params = request.params as { id: string };

    const consultation = await app.prisma.consultation.findUnique({
      where: { id: params.id },
      include: {
        items: {
          include: {
            providerProduct: {
              include: { provider: true, consultationType: true },
            },
          },
        },
        executions: true,
      },
    });

    return ok(reply, consultation);
  });

  app.post('/consultations/merge-preview', { preHandler: [authenticate] }, async (request, reply) => {
    const payload = mergePreviewSchema.parse(request.body);
    return ok(reply, await previewMerge(app, {
      actorUserId: request.authUser?.userId,
      executionIds: payload.executionIds,
      testLogIds: payload.testLogIds,
    }));
  });
}
