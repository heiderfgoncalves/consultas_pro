import type { FastifyInstance } from 'fastify';
import { Worker } from 'bullmq';
import { prisma } from '../db/prisma';
import { redis } from '../lib/redis';
import { QUEUE_NAMES } from '../queues/names';
import { env } from '../config/env';
import { callProviderProduct } from '../modules/providers/provider-client.service';
import { normalizeProviderPayload } from '../modules/providers/normalization.service';
import { mergeNormalizedPayloads } from '../modules/providers/merge.service';
import { buildCanonicalRenderPayload } from '../modules/providers/canonical-builder.service';
import {
  applyProductOverrides,
  computeRetryDelayMs,
  resolveIntegrationSettingsForConsultationId,
  sleep,
} from '../lib/integration-settings';
import pino from 'pino';

const logger = pino({ level: env.LOG_LEVEL });

const appLike = { log: logger } as unknown as FastifyInstance;

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

  if (consultation.status === 'COMPLETED') {
    logger.info({ consultationId }, 'consultation_already_completed_skip');
    return;
  }

  const settings = await resolveIntegrationSettingsForConsultationId(prisma, consultationId);
  const tenantTimeoutOverride = settings.providerTimeoutOverrideMs ?? null;

  await prisma.consultation.update({
    where: { id: consultationId },
    data: { status: 'PROCESSING' },
  });

  const normalizedPayloads: Array<Record<string, unknown>> = [];
  let failedCount = 0;
  let anyFailedWantsManualReview = false;

  for (const item of consultation.items) {
    const product = item.providerProduct;
    const itemSettings = applyProductOverrides(settings, product.integrationOverrides);

    const existingSuccess = await prisma.consultationExecution.findFirst({
      where: { consultationItemId: item.id, status: 'SUCCESS' },
    });
    if (existingSuccess?.normalizedPayload != null) {
      normalizedPayloads.push(existingSuccess.normalizedPayload as Record<string, unknown>);
      continue;
    }

    const context = {
      subject: {
        document: consultation.subjectDocument,
        type: consultation.subjectType,
      },
      requester: {
        id: consultation.requestedByUser?.id ?? '',
        email: consultation.requestedByUser?.email ?? '',
      },
      companyId: consultation.companyId,
    };

    const retry = itemSettings.executionRetry;
    const windowStart = Date.now();
    let lastError: unknown = null;
    let succeeded = false;

    for (let attempt = 1; attempt <= retry.maxAttempts; attempt++) {
      if (Date.now() - windowStart > retry.maxRetryWindowMs) {
        break;
      }

      try {
        const execution = await callProviderProduct(appLike, product.provider, product, context, {
          timeoutMsOverride: itemSettings.providerTimeoutOverrideMs ?? tenantTimeoutOverride,
        });
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
        succeeded = true;
        break;
      } catch (error) {
        lastError = error;
        const canRetry =
          attempt < retry.maxAttempts && Date.now() - windowStart <= retry.maxRetryWindowMs;
        if (canRetry) {
          const delayMs = computeRetryDelayMs(attempt, retry);
          if (Date.now() - windowStart + delayMs > retry.maxRetryWindowMs) {
            break;
          }
          await sleep(delayMs);
        }
      }
    }

    if (succeeded) continue;

    failedCount += 1;
    if (itemSettings.onExhausted === 'require_manual_review') {
      anyFailedWantsManualReview = true;
    }
    await prisma.consultationExecution.create({
      data: {
        consultationId: consultation.id,
        consultationItemId: item.id,
        providerId: product.providerId,
        productId: product.id,
        status: 'FAILED',
        errorMessage: lastError instanceof Error ? lastError.message : 'Erro desconhecido',
        startedAt: new Date(),
        completedAt: new Date(),
      },
    });
  }

  const mergedPayload = mergeNormalizedPayloads(normalizedPayloads);
  const status =
    failedCount === 0
      ? 'COMPLETED'
      : normalizedPayloads.length > 0
        ? 'PARTIAL'
        : 'FAILED';

  let finalError: string | null = null;
  if (status === 'FAILED') {
    const tenantWantsManual = settings.onExhausted === 'require_manual_review';
    finalError =
      anyFailedWantsManualReview || tenantWantsManual
        ? 'Consulta requer revisão manual (política de integrações).'
        : 'Todas as execuções falharam';
  }

  let renderPayload = mergedPayload;

  try {
    const products = consultation.items.map((item) => {
      const p = item.providerProduct;
      return {
        id: p.id,
        typeItemFilters: p.typeItemFilters,
        mappings: p.mappings.map((m) => ({
          isActive: m.isActive,
          sourcePath: m.sourcePath,
          canonicalField: {
            pathKey: m.canonicalField.pathKey,
            label: m.canonicalField.label,
            dataType: m.canonicalField.dataType,
          },
        })),
      };
    });

    const dbExecutions = await prisma.consultationExecution.findMany({
      where: {
        consultationId: consultation.id,
        status: 'SUCCESS',
      },
      select: {
        productId: true,
        rawResponse: true,
      },
    });

    const executions = dbExecutions
      .filter((exec) => exec.productId !== null)
      .map((exec) => ({
        productId: exec.productId as string,
        rawResponse: exec.rawResponse as unknown,
      }));

    if (executions.length > 0) {
      renderPayload = await buildCanonicalRenderPayload(executions, products);
    }
  } catch (error) {
    logger.error({ consultationId: consultation.id, error }, 'failed_to_build_canonical_render_payload');
  }

  await prisma.consultation.update({
    where: { id: consultation.id },
    data: {
      status,
      mergedPayload: mergedPayload as never,
      renderPayload: renderPayload as never,
      completedAt: new Date(),
      errorMessage: finalError,
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
    concurrency: env.CONSULTATION_WORKER_CONCURRENCY,
  },
);

worker.on('completed', (job) => {
  logger.info({ jobId: job.id, name: job.name }, 'worker_job_completed');
});

worker.on('failed', (job, error) => {
  logger.error({ jobId: job?.id, name: job?.name, error }, 'worker_job_failed');
});

logger.info(
  { concurrency: env.CONSULTATION_WORKER_CONCURRENCY },
  'consultation_worker_started',
);
