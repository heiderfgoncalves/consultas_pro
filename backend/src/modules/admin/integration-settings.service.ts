import type { FastifyInstance } from 'fastify';
import { NotFoundError } from '../../core/errors';
import {
  getAdminTargetTenant,
  mergeIntegrationSettingsPatch,
  mergeWithDefaults,
  patchIntegrationSettingsSchema,
} from '../../lib/integration-settings';
import { env } from '../../config/env';

export async function getIntegrationSettingsAdmin(app: FastifyInstance) {
  const tenant = await getAdminTargetTenant(app.prisma);
  if (!tenant) {
    throw new NotFoundError('Nenhum tenant cadastrado');
  }

  const effective = mergeWithDefaults(tenant.integrationSettings);

  return {
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
    workerConcurrency: env.CONSULTATION_WORKER_CONCURRENCY,
    stored: tenant.integrationSettings,
    effective,
  };
}

export async function patchIntegrationSettingsAdmin(app: FastifyInstance, body: unknown) {
  const patch = patchIntegrationSettingsSchema.parse(body);
  const tenant = await getAdminTargetTenant(app.prisma);
  if (!tenant) {
    throw new NotFoundError('Nenhum tenant cadastrado');
  }

  const next = mergeIntegrationSettingsPatch(tenant.integrationSettings, patch);

  await app.prisma.tenant.update({
    where: { id: tenant.id },
    data: { integrationSettings: next as object },
  });

  return getIntegrationSettingsAdmin(app);
}
