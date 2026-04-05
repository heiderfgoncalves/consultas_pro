import type { EffectiveIntegrationSettings } from '@/api/admin-integration-settings';
import type { ProductIntegrationOverrides } from '@/types/integrations';

/** Espelha a mesma regra de merge do backend (`applyProductOverrides`) para preview na UI. */
export function applyProductOverridesPreview(
  tenant: EffectiveIntegrationSettings,
  raw: ProductIntegrationOverrides | null | undefined,
): EffectiveIntegrationSettings {
  if (!raw || typeof raw !== 'object' || Object.keys(raw).length === 0) {
    return tenant;
  }
  return {
    ...tenant,
    ...(raw.queueJobPriority !== undefined ? { queueJobPriority: raw.queueJobPriority } : {}),
    ...(raw.executionRetry
      ? { executionRetry: { ...tenant.executionRetry, ...raw.executionRetry } }
      : {}),
    ...(raw.onExhausted !== undefined ? { onExhausted: raw.onExhausted } : {}),
    ...(raw.providerTimeoutOverrideMs !== undefined
      ? { providerTimeoutOverrideMs: raw.providerTimeoutOverrideMs }
      : {}),
  };
}
