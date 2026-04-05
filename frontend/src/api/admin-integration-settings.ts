import { apiRequest } from '@/lib/api';

export type IntegrationExecutionRetry = {
  maxAttempts: number;
  backoffType: 'fixed' | 'exponential';
  initialDelayMs: number;
  maxDelayMs: number;
  maxRetryWindowMs: number;
  jitterRatio: number;
};

export type EffectiveIntegrationSettings = {
  executionRetry: IntegrationExecutionRetry;
  onExhausted: 'fail' | 'partial_ok' | 'require_manual_review';
  queueJobPriority: number;
  pauseNewConsultations: boolean;
  providerTimeoutOverrideMs: number | null;
  verboseProviderTestLogs: boolean;
  maxProviderRequestsPerMinute: number | null;
};

export type IntegrationSettingsAdminResponse = {
  tenantId: string;
  tenantSlug: string;
  workerConcurrency: number;
  stored: unknown;
  effective: EffectiveIntegrationSettings;
};

export type IntegrationSettingsPatch = {
  executionRetry?: Partial<IntegrationExecutionRetry>;
  onExhausted?: EffectiveIntegrationSettings['onExhausted'];
  queueJobPriority?: number;
  pauseNewConsultations?: boolean;
  providerTimeoutOverrideMs?: number | null;
  verboseProviderTestLogs?: boolean;
  maxProviderRequestsPerMinute?: number | null;
};

export function getIntegrationSettings(token: string | null) {
  return apiRequest<IntegrationSettingsAdminResponse>('/admin/integration-settings', { token });
}

export function patchIntegrationSettings(token: string | null, body: IntegrationSettingsPatch) {
  return apiRequest<IntegrationSettingsAdminResponse>('/admin/integration-settings', {
    token,
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}
