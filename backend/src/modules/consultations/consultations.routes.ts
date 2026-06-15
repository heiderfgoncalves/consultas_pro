import type { FastifyInstance } from 'fastify';
import { authenticate, requireEndpointAccess } from '../../core/auth';
import { ok } from '../../core/http';
import { createConsultationSchema, mergePreviewSchema } from './consultations.schemas';
import { createConsultation } from './consultations.service';
import { previewMerge } from '../providers/providers.service';

export async function registerConsultationRoutes(app: FastifyInstance) {
  app.post('/consultations', {
    preHandler: [authenticate, requireEndpointAccess('api.consultations.create')],
  }, async (request, reply) => {
    const payload = createConsultationSchema.parse(request.body);

    return ok(reply, await createConsultation(app, {
      requestedByUserId: request.authUser?.userId === 'api-bot' ? null : request.authUser?.userId,
      companyId: request.authUser?.companyId,
      subjectDocument: payload.subjectDocument,
      subjectType: payload.subjectType,
      templateId: payload.templateId,
      providerProductIds: payload.providerProductIds,
      externalUserId: payload.externalUserId,
    }), 201);
  });

  app.get('/consultations', {
    preHandler: [authenticate, requireEndpointAccess('api.consultations.list')],
  }, async (request, reply) => {
    const consultations = await app.prisma.consultation.findMany({
      where: request.authUser?.companyId
        ? { companyId: request.authUser.companyId }
        : { requestedByUserId: request.authUser!.userId },
      include: {
        template: { select: { id: true, name: true } },
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

  app.post('/consultations/merge-preview', {
    preHandler: [authenticate, requireEndpointAccess('api.consultations.mergePreview')],
  }, async (request, reply) => {
    const payload = mergePreviewSchema.parse(request.body);
    return ok(reply, await previewMerge(app, {
      actorUserId: request.authUser?.userId,
      executionIds: payload.executionIds,
      testLogIds: payload.testLogIds,
    }));
  });

  app.get('/consultations/:id', {
    preHandler: [authenticate, requireEndpointAccess('api.consultations.get')],
  }, async (request, reply) => {
    const params = request.params as { id: string };

    const consultation = await app.prisma.consultation.findUnique({
      where: { id: params.id },
      include: {
        template: { select: { id: true, name: true, layout: true, logo: true } },
        items: {
          orderBy: { sortOrder: 'asc' },
          include: {
            providerProduct: {
              include: {
                provider: true,
                consultationType: true,
              },
            },
          },
        },
        executions: {
          select: {
            id: true,
            status: true,
            errorMessage: true,
            normalizedPayload: true,
            rawResponse: true,
            startedAt: true,
            completedAt: true,
            providerCost: true,
            statusCode: true,
            product: { select: { id: true, name: true, code: true } },
            provider: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    });

    return ok(reply, consultation);
  });

  app.get('/catalog/canonical-fields', {
    preHandler: [authenticate, requireEndpointAccess('api.consultations.list')],
  }, async (_request, reply) => {
    const fields = await app.prisma.canonicalFieldCatalog.findMany({
      orderBy: { pathKey: 'asc' },
    });
    return ok(reply, fields);
  });


  app.get('/widget.js', async (_request, reply) => {
    const fs = require('fs');
    const path = require('path');
    const widgetPath = path.join(__dirname, '../../public/widget.js');
    const content = fs.readFileSync(widgetPath, 'utf8');
    
    return reply
      .header('Access-Control-Allow-Origin', '*')
      .header('Cross-Origin-Resource-Policy', 'cross-origin')
      .type('application/javascript; charset=utf-8')
      .send(content);
  });
}
