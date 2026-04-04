import { apiRequest } from '@/lib/api';
import type {
  ConsultationFieldType,
  FieldMapping,
  MappingItemFilter,
  Provider,
  ProviderConsultation,
  TestLogEntry,
} from '@/types/integrations';
import { PATH_KEY_UI_META } from '@/lib/integrations-constants';

function tok(t: string | null) {
  return t;
}

const FILTER_OPS = new Set(['eq', 'contains', 'startsWith', 'endsWith', 'regex']);

export function parseProductTypeItemFilters(raw: unknown): Record<string, MappingItemFilter[]> | undefined {
  if (raw === null || raw === undefined) return undefined;
  if (typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const o = raw as Record<string, unknown>;
  const out: Record<string, MappingItemFilter[]> = {};
  for (const [key, val] of Object.entries(o)) {
    if (!Array.isArray(val)) continue;
    const rules: MappingItemFilter[] = [];
    for (const item of val) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
      const it = item as Record<string, unknown>;
      const field = typeof it.field === 'string' ? it.field : '';
      const opRaw = typeof it.op === 'string' ? it.op : 'eq';
      const op = FILTER_OPS.has(opRaw) ? (opRaw as MappingItemFilter['op']) : 'eq';
      const value = typeof it.value === 'string' ? it.value : '';
      rules.push({ field, op, value });
    }
    out[key] = rules;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

export interface ApiCanonicalField {
  id: string;
  pathKey: string;
  label: string;
  dataType: string;
  description: string | null;
  uiItemFilters?: unknown;
  isActive: boolean;
}

export interface ApiProviderOperation {
  id: string;
  providerId: string;
  operationType: string;
  path: string;
  method: string;
}

export interface ApiFieldMapping {
  id: string;
  productId: string;
  canonicalFieldId: string;
  sourcePath: string;
  uiStartLine?: number | null;
  uiEndLine?: number | null;
  transformName: string | null;
  sortOrder: number;
  canonicalField: ApiCanonicalField;
}

export interface ApiProduct {
  id: string;
  providerId: string;
  name: string;
  code: string;
  externalId: string | null;
  endpointPath: string;
  method: string;
  cost: string | number;
  isActive: boolean;
  sampleRequest: unknown;
  sampleResponse: unknown;
  bodyTemplate?: unknown;
  queryTemplate?: unknown;
  headersTemplate?: unknown;
  typeItemFilters?: unknown;
  mappings: ApiFieldMapping[];
}

export interface ApiProvider {
  id: string;
  name: string;
  slug: string;
  baseUrl: string;
  authType: string;
  credentials: unknown;
  isActive: boolean;
  createdAt: string;
  operations: ApiProviderOperation[];
  products: ApiProduct[];
}

export interface ApiTestLog {
  id: string;
  providerId: string;
  productId: string | null;
  responsePayload: unknown;
  createdAt: string;
  success: boolean;
  product?: { id: string; name: string } | null;
  provider?: { id: string; name: string } | null;
}

const AUTH_MAP: Record<string, Provider['authType']> = {
  BEARER: 'bearer',
  API_KEY: 'apikey',
  BASIC_AUTH: 'basic',
  CUSTOM: 'custom',
  NONE: 'custom',
};

const UI_AUTH_MAP: Record<Provider['authType'], string> = {
  bearer: 'BEARER',
  apikey: 'API_KEY',
  basic: 'BASIC_AUTH',
  custom: 'CUSTOM',
};

export function authToUi(t: string): Provider['authType'] {
  return AUTH_MAP[t] ?? 'custom';
}

export function authToApi(t: Provider['authType']): string {
  return UI_AUTH_MAP[t];
}

export function credentialsToPairs(creds: unknown): { key: string; value: string }[] {
  if (!creds || typeof creds !== 'object' || Array.isArray(creds)) return [{ key: '', value: '' }];
  return Object.entries(creds as Record<string, string>).map(([key, value]) => ({ key, value: String(value) }));
}

export function pairsToCredentials(pairs: { key: string; value: string }[]): Record<string, string> {
  const o: Record<string, string> = {};
  for (const p of pairs) {
    if (p.key.trim()) o[p.key.trim()] = p.value;
  }
  return o;
}

export function mapCanonicalToFieldTypes(fields: ApiCanonicalField[]): ConsultationFieldType[] {
  return fields
    .filter(
      (f) =>
        f.isActive &&
        f.dataType === 'object' &&
        !f.pathKey.includes('.') &&
        !f.pathKey.includes('['),
    )
    .map((f) => {
      const meta = PATH_KEY_UI_META[f.pathKey] ?? { color: 'primary', icon: 'Tag' };
      return {
        id: f.id,
        key: f.pathKey,
        label: f.label,
        description: f.description ?? '',
        color: meta.color,
        icon: meta.icon,
        typeItemFilters: Array.isArray(f.uiItemFilters) ? f.uiItemFilters as ConsultationFieldType['typeItemFilters'] : [],
      };
    });
}

export function mapApiProvider(p: ApiProvider): Provider {
  const balanceOp = p.operations.find((o) => o.operationType === 'BALANCE_CHECK');
  const rechargeOp = p.operations.find((o) => o.operationType === 'RECHARGE');
  return {
    id: p.id,
    name: p.name,
    baseUrl: p.baseUrl,
    balanceEndpoint: balanceOp?.path ?? '',
    rechargeEndpoint: rechargeOp?.path ?? '',
    authType: authToUi(p.authType),
    credentials: credentialsToPairs(p.credentials),
    status: p.isActive ? 'active' : 'inactive',
    createdAt: p.createdAt.slice(0, 10),
    balanceOperationId: balanceOp?.id,
    rechargeOperationId: rechargeOp?.id,
  };
}

export function mapApiProduct(p: ApiProduct, providerId: string): ProviderConsultation {
  const sampleRes =
    p.sampleResponse === null || p.sampleResponse === undefined
      ? ''
      : typeof p.sampleResponse === 'string'
        ? p.sampleResponse
        : JSON.stringify(p.sampleResponse, null, 2);

  const mappingIds: Record<string, string> = {};
  const fieldMappings: FieldMapping[] = (p.mappings ?? []).map((m) => {
    const k = `${m.sourcePath}::${m.canonicalField.pathKey}`;
    mappingIds[k] = m.id;
    return {
      jsonPath: m.sourcePath,
      fieldTypeKey: m.canonicalField.pathKey,
      label: m.canonicalField.label,
      format: 'object',
      uiStartLine: m.uiStartLine ?? undefined,
      uiEndLine: m.uiEndLine ?? undefined,
    };
  });

  const method = p.method === 'GET' || p.method === 'POST' ? p.method : 'POST';
  const cost = typeof p.cost === 'string' ? parseFloat(p.cost) : p.cost;

  let bodyTemplateJson = '';
  if (p.bodyTemplate !== null && p.bodyTemplate !== undefined) {
    bodyTemplateJson =
      typeof p.bodyTemplate === 'string'
        ? p.bodyTemplate
        : JSON.stringify(p.bodyTemplate, null, 2);
  }

  return {
    id: p.id,
    providerId,
    name: p.name,
    externalId: p.externalId ?? p.code,
    endpoint: p.endpointPath,
    method,
    cost: Number.isFinite(cost) ? cost : 0,
    fieldMappings,
    mappingIds,
    typeItemFilters: parseProductTypeItemFilters(p.typeItemFilters),
    sampleResponse: sampleRes,
    bodyTemplateJson,
    status: p.isActive ? 'active' : 'inactive',
  };
}

export function mapTestLogs(logs: ApiTestLog[]): TestLogEntry[] {
  return logs.map((l) => {
    const payload =
      l.responsePayload === null || l.responsePayload === undefined
        ? ''
        : typeof l.responsePayload === 'string'
          ? l.responsePayload
          : JSON.stringify(l.responsePayload, null, 2);
    return {
      id: l.id,
      consultationName: l.product?.name ?? 'Teste',
      providerId: l.providerId,
      endpoint: l.product?.name ?? '',
      responseJson: payload,
      testedAt: l.createdAt,
    };
  });
}

export async function getProviders(accessToken: string | null) {
  return apiRequest<ApiProvider[]>('/admin/providers', { method: 'GET', token: tok(accessToken) });
}

export async function getCanonicalFields(accessToken: string | null) {
  return apiRequest<ApiCanonicalField[]>('/admin/catalog/canonical-fields', {
    method: 'GET',
    token: tok(accessToken),
  });
}

export async function getTestLogs(accessToken: string | null) {
  return apiRequest<ApiTestLog[]>('/admin/test-logs', { method: 'GET', token: tok(accessToken) });
}

export async function createProviderApi(
  accessToken: string | null,
  body: {
    name: string;
    slug: string;
    baseUrl: string;
    authType: string;
    credentials?: Record<string, string>;
  },
) {
  return apiRequest<ApiProvider>('/admin/providers', {
    method: 'POST',
    token: tok(accessToken),
    body: JSON.stringify(body),
  });
}

export async function patchProviderApi(
  accessToken: string | null,
  providerId: string,
  body: Record<string, unknown>,
) {
  return apiRequest<ApiProvider>(`/admin/providers/${providerId}`, {
    method: 'PATCH',
    token: tok(accessToken),
    body: JSON.stringify(body),
  });
}

export async function deleteProviderApi(accessToken: string | null, providerId: string) {
  return apiRequest<{ deleted: boolean }>(`/admin/providers/${providerId}`, {
    method: 'DELETE',
    token: tok(accessToken),
  });
}

export async function createOperationApi(
  accessToken: string | null,
  body: {
    providerId: string;
    operationType: string;
    name: string;
    path: string;
    method: string;
  },
) {
  return apiRequest<ApiProviderOperation>('/admin/providers/operations', {
    method: 'POST',
    token: tok(accessToken),
    body: JSON.stringify(body),
  });
}

export async function patchOperationApi(
  accessToken: string | null,
  operationId: string,
  body: Record<string, unknown>,
) {
  return apiRequest<ApiProviderOperation>(`/admin/providers/operations/${operationId}`, {
    method: 'PATCH',
    token: tok(accessToken),
    body: JSON.stringify(body),
  });
}

export async function createProductApi(
  accessToken: string | null,
  body: Record<string, unknown>,
) {
  return apiRequest<ApiProduct>('/admin/providers/products', {
    method: 'POST',
    token: tok(accessToken),
    body: JSON.stringify(body),
  });
}

export async function patchProductApi(
  accessToken: string | null,
  productId: string,
  body: Record<string, unknown>,
) {
  return apiRequest<ApiProduct>(`/admin/providers/products/${productId}`, {
    method: 'PATCH',
    token: tok(accessToken),
    body: JSON.stringify(body),
  });
}

export async function deleteProductApi(accessToken: string | null, productId: string) {
  return apiRequest<{ deleted: boolean }>(`/admin/providers/products/${productId}`, {
    method: 'DELETE',
    token: tok(accessToken),
  });
}

export async function createMappingApi(
  accessToken: string | null,
  body: {
    productId: string;
    canonicalFieldId: string;
    sourcePath: string;
    uiStartLine?: number;
    uiEndLine?: number;
    sortOrder?: number;
  },
) {
  return apiRequest<ApiFieldMapping>('/admin/providers/mappings', {
    method: 'POST',
    token: tok(accessToken),
    body: JSON.stringify(body),
  });
}

export async function deleteMappingApi(accessToken: string | null, mappingId: string) {
  return apiRequest<{ deleted: boolean }>(`/admin/providers/mappings/${mappingId}`, {
    method: 'DELETE',
    token: tok(accessToken),
  });
}

export async function createCanonicalFieldApi(
  accessToken: string | null,
  body: { pathKey: string; label: string; dataType: string; description?: string; uiItemFilters?: unknown },
) {
  return apiRequest<ApiCanonicalField>('/admin/catalog/canonical-fields', {
    method: 'POST',
    token: tok(accessToken),
    body: JSON.stringify(body),
  });
}

export async function patchCanonicalFieldApi(
  accessToken: string | null,
  fieldId: string,
  body: Record<string, unknown>,
) {
  return apiRequest<ApiCanonicalField>(`/admin/catalog/canonical-fields/${fieldId}`, {
    method: 'PATCH',
    token: tok(accessToken),
    body: JSON.stringify(body),
  });
}

export async function deleteCanonicalFieldApi(accessToken: string | null, fieldId: string) {
  return apiRequest<{ deleted: boolean }>(`/admin/catalog/canonical-fields/${fieldId}`, {
    method: 'DELETE',
    token: tok(accessToken),
  });
}

/** Resposta de POST .../products/:id/test e .../products/test-draft */
export interface ApiProviderTestResult {
  testLogId: string;
  request: unknown;
  response: {
    statusCode: number;
    payload: unknown;
  };
  normalizedPayload: unknown | null;
}

export async function testProductApi(
  accessToken: string | null,
  productId: string,
  payload: {
    context?: Record<string, unknown>;
    bodyTemplate?: unknown;
    queryTemplate?: Record<string, unknown>;
    headersTemplate?: Record<string, unknown>;
  } = {},
) {
  const body: Record<string, unknown> = { context: payload.context ?? {} };
  if (payload.bodyTemplate !== undefined) body.bodyTemplate = payload.bodyTemplate;
  if (payload.queryTemplate !== undefined) body.queryTemplate = payload.queryTemplate;
  if (payload.headersTemplate !== undefined) body.headersTemplate = payload.headersTemplate;
  return apiRequest<ApiProviderTestResult>(`/admin/providers/products/${productId}/test`, {
    method: 'POST',
    token: tok(accessToken),
    body: JSON.stringify(body),
  });
}

export async function testProductDraftApi(
  accessToken: string | null,
  body: {
    providerId: string;
    endpointPath: string;
    method: 'GET' | 'POST';
    context?: Record<string, unknown>;
    bodyTemplate?: unknown;
    queryTemplate?: Record<string, unknown>;
    headersTemplate?: Record<string, unknown>;
  },
) {
  const req: Record<string, unknown> = {
    providerId: body.providerId,
    endpointPath: body.endpointPath,
    method: body.method,
    context: body.context ?? {},
  };
  if (body.bodyTemplate !== undefined) req.bodyTemplate = body.bodyTemplate;
  if (body.queryTemplate !== undefined) req.queryTemplate = body.queryTemplate;
  if (body.headersTemplate !== undefined) req.headersTemplate = body.headersTemplate;
  return apiRequest<ApiProviderTestResult>('/admin/providers/products/test-draft', {
    method: 'POST',
    token: tok(accessToken),
    body: JSON.stringify(req),
  });
}
