import { z } from 'zod';
import type { PrismaClient } from '@prisma/client';

export const integrationExecutionRetrySchema = z.object({
  maxAttempts: z.number().int().min(1).max(20),
  backoffType: z.enum(['fixed', 'exponential']),
  initialDelayMs: z.number().int().min(0).max(600_000),
  maxDelayMs: z.number().int().min(1000).max(3_600_000),
  maxRetryWindowMs: z.number().int().min(1000).max(86_400_000),
  jitterRatio: z.number().min(0).max(0.5),
});

export const integrationSettingsSchema = z.object({
  executionRetry: integrationExecutionRetrySchema,
  onExhausted: z.enum(['fail', 'partial_ok', 'require_manual_review']),
  queueJobPriority: z.number().int().min(-20).max(20),
  pauseNewConsultations: z.boolean(),
  providerTimeoutOverrideMs: z.number().int().positive().max(300_000).nullable(),
  verboseProviderTestLogs: z.boolean(),
  /** Reservado: rate limit por minuto (0 ou null = sem limite aplicado pelo backend). */
  maxProviderRequestsPerMinute: z.number().int().min(0).max(10_000).nullable(),
});

export type IntegrationSettings = z.infer<typeof integrationSettingsSchema>;

/** Comportamento alinhado ao worker legado: uma tentativa até o admin aumentar. */
export const defaultIntegrationSettings: IntegrationSettings = {
  executionRetry: {
    maxAttempts: 1,
    backoffType: 'exponential',
    initialDelayMs: 2000,
    maxDelayMs: 120_000,
    maxRetryWindowMs: 900_000,
    jitterRatio: 0.2,
  },
  onExhausted: 'fail',
  queueJobPriority: 0,
  pauseNewConsultations: false,
  providerTimeoutOverrideMs: null,
  verboseProviderTestLogs: false,
  maxProviderRequestsPerMinute: null,
};

export const patchIntegrationSettingsSchema = z
  .object({
    executionRetry: integrationExecutionRetrySchema.partial().optional(),
    onExhausted: integrationSettingsSchema.shape.onExhausted.optional(),
    queueJobPriority: integrationSettingsSchema.shape.queueJobPriority.optional(),
    pauseNewConsultations: integrationSettingsSchema.shape.pauseNewConsultations.optional(),
    providerTimeoutOverrideMs: integrationSettingsSchema.shape.providerTimeoutOverrideMs.optional(),
    verboseProviderTestLogs: integrationSettingsSchema.shape.verboseProviderTestLogs.optional(),
    maxProviderRequestsPerMinute: integrationSettingsSchema.shape.maxProviderRequestsPerMinute.optional(),
  })
  .strict();

export type IntegrationSettingsPatch = z.infer<typeof patchIntegrationSettingsSchema>;

export function mergeWithDefaults(stored: unknown): IntegrationSettings {
  const p = patchIntegrationSettingsSchema.safeParse(stored);
  const patch = p.success ? p.data : {};
  return integrationSettingsSchema.parse({
    ...defaultIntegrationSettings,
    ...patch,
    executionRetry: {
      ...defaultIntegrationSettings.executionRetry,
      ...(patch.executionRetry ?? {}),
    },
  });
}

export function mergeIntegrationSettingsPatch(storedRaw: unknown, patch: IntegrationSettingsPatch): IntegrationSettings {
  const current = mergeWithDefaults(storedRaw);
  return integrationSettingsSchema.parse({
    ...current,
    ...patch,
    executionRetry: {
      ...current.executionRetry,
      ...(patch.executionRetry ?? {}),
    },
  });
}

export async function getAdminTargetTenant(prisma: PrismaClient) {
  return prisma.tenant.findFirst({ orderBy: { createdAt: 'asc' } });
}

export async function getEffectiveIntegrationSettingsForTenant(
  prisma: PrismaClient,
  tenantId: string | null,
): Promise<IntegrationSettings> {
  if (!tenantId) return defaultIntegrationSettings;
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { integrationSettings: true },
  });
  return mergeWithDefaults(tenant?.integrationSettings);
}

export async function getEffectiveIntegrationSettingsForCompany(
  prisma: PrismaClient,
  companyId: string | null | undefined,
): Promise<IntegrationSettings> {
  if (!companyId) return defaultIntegrationSettings;
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { tenantId: true },
  });
  if (!company) return defaultIntegrationSettings;
  return getEffectiveIntegrationSettingsForTenant(prisma, company.tenantId);
}

export async function resolveIntegrationSettingsForConsultationId(
  prisma: PrismaClient,
  consultationId: string,
): Promise<IntegrationSettings> {
  const c = await prisma.consultation.findUnique({
    where: { id: consultationId },
    select: { companyId: true },
  });
  if (!c) return defaultIntegrationSettings;
  return getEffectiveIntegrationSettingsForCompany(prisma, c.companyId);
}

export function computeRetryDelayMs(
  attemptAfterFailure: number,
  retry: IntegrationSettings['executionRetry'],
): number {
  const { initialDelayMs, maxDelayMs, backoffType, jitterRatio } = retry;
  let base =
    backoffType === 'fixed'
      ? initialDelayMs
      : Math.min(initialDelayMs * 2 ** Math.max(0, attemptAfterFailure - 1), maxDelayMs);
  const jitter = base * jitterRatio * (Math.random() * 2 - 1);
  return Math.max(0, Math.round(base + jitter));
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
