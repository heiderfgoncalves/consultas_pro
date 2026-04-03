import { Worker } from 'bullmq';
import { prisma } from '../db/prisma';
import { redis } from '../lib/redis';
import { QUEUE_NAMES } from '../queues/names';
import { env } from '../config/env';
import { callProviderProduct } from '../modules/providers/provider-client.service';
import { normalizeProviderPayload } from '../modules/providers/normalization.service';
import { mergeNormalizedPayloads } from '../modules/providers/merge.service';
import pino from 'pino';

const logger = pino({ level: env.LOG_LEVEL });

async function processConsultation(consultationId: string) {
  const consultation = await prisma.consultation.findUnique({
    where: { id: consultationId },
    include: {
      items: {
        include: {
          providerProduct: {
            include: {
              provider: true,
              mappings: {
                include: { canonicalField: true },
                orderBy: { sortOrder: 'asc' },
              },
            },
          },
        },
      },
      requestedByUser: true,
    },
  });

  if (!consultation) {
    logger.warn({ consultationId }, 'consultation_not_found');
    return;
  }

  await prisma.consultation.update({
    where: { id: consultationId },
    data: { status: 'PROCESSING' },
  });

  const normalizedPayloads: Array<Record<string, unknown>> = [];
  let failedCount = 0;

  for (const item of consultation.items) {
    const product = item.providerProduct;
    const context = {
      subject: {
        document: consultation.subjectDocument,
        type: consultation.subjectType,
      },
      requester: {
        id: consultation.requestedByUser.id,
        email: consultation.requestedByUser.email,
      },
      companyId: consultation.companyId,
    };

    try {
      const execution = await callProviderProduct({ prisma, redis, log: logger } as never, product.provider, product, context);
      const normalized = normalizeProviderPayload(execution.response.payload, product.mappings);

      normalizedPayloads.push(normalized);

      await prisma.consultationExecution.create({
        data: {
          consultationId: consultation.id,
          consultationItemId: item.id,
          providerId: product.providerId,
          productId: product.id,
          status: 'SUCCESS',
          requestPayload: execution.request as never,
          rawResponse: execution.response.payload as never,
          normalizedPayload: normalized as never,
          providerCost: product.cost,
          statusCode: execution.response.statusCode,
          startedAt: new Date(),
          completedAt: new Date(),
        },
      });
    } catch (error) {
      failedCount += 1;

      await prisma.consultationExecution.create({
        data: {
          consultationId: consultation.id,
          consultationItemId: item.id,
          providerId: product.providerId,
          productId: product.id,
          status: 'FAILED',
          errorMessage: error instanceof Error ? error.message : 'Erro desconhecido',
          startedAt: new Date(),
          completedAt: new Date(),
        },
      });
    }
  }

  const mergedPayload = mergeNormalizedPayloads(normalizedPayloads);
  const status = failedCount === 0
    ? 'COMPLETED'
    : normalizedPayloads.length > 0
      ? 'PARTIAL'
      : 'FAILED';

  await prisma.consultation.update({
    where: { id: consultation.id },
    data: {
      status,
      mergedPayload: mergedPayload as never,
      renderPayload: mergedPayload as never,
      completedAt: new Date(),
      errorMessage: status === 'FAILED' ? 'Todas as execuções falharam' : null,
    },
  });

  await prisma.mergeLog.create({
    data: {
      consultationId: consultation.id,
      createdById: consultation.requestedByUserId,
      sourceReferenceIds: consultation.items.map((item) => item.id),
      mergedPayload: mergedPayload as never,
      strategy: 'DEEP_MERGE_ARRAY_DEDUP',
    },
  });

  logger.info({ consultationId, status }, 'consultation_processed');
}

const worker = new Worker(
  QUEUE_NAMES.CONSULTATION_EXECUTION,
  async (job) => {
    if (job.name === 'consultation.execute') {
      await processConsultation(job.data.consultationId);
    }
  },
  {
    connection: redis,
    concurrency: 5,
  },
);

worker.on('completed', (job) => {
  logger.info({ jobId: job.id, name: job.name }, 'worker_job_completed');
});

worker.on('failed', (job, error) => {
  logger.error({ jobId: job?.id, name: job?.name, error }, 'worker_job_failed');
});

logger.info('consultation_worker_started');
