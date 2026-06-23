import { apiRequest } from '@/lib/api';
import type {
  ConsultationFieldType,
  FieldMapping,
  MvpDocumentType,
  MvpTemplateKey,
  MappingItemFilter,
  ProductIntegrationOverrides,
  ProductSessionFieldAssignment,
  Provider,
  ProviderConsultation,
  TemplateMvpConfig,
  TemplateMvpPoolItem,
  TestLogEntry,
  TypeReportFieldConfig,
  ReportFieldDataType,
} from '@/types/integrations';
import type {
  CreateCustomBlockPayload,
  CustomBlockDefinition,
  UpdateCustomBlockPayload,
} from '@/types/custom-blocks';
import { PATH_KEY_UI_META } from '@/lib/integrations-constants';
import { assignKeysToReportFields } from '@/lib/reportFieldKeys';
import { parseTypeItemFiltersRecord } from '@/lib/typeItemFilters';

function tok(t: string | null) {
  return t;
}

export function parseProductTypeItemFilters(raw: unknown): ProviderConsultation['typeItemFilters'] {
  return parseTypeItemFiltersRecord(raw);
}

export function parseProductIntegrationOverrides(raw: unknown): ProductIntegrationOverrides | null {
  if (raw == null || typeof raw !== 'object') return null;
  return raw as ProductIntegrationOverrides;
}

export interface ApiCanonicalField {
  id: string;
  pathKey: string;
  label: string;
  dataType: string;
  description: string | null;
  uiItemFilters?: unknown;
  reportFieldConfig?: unknown;
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

export interface ApiSessionFieldAssignment {
  id: string;
  productId: string;
  canonicalFieldId: string;
  sessionKey: string;
  sourcePath: string | null;
  sortOrder: number;
  isActive: boolean;
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
  consultationPrice?: string | number;
  isActive: boolean;
  updatedAt?: string;
  sampleRequest: unknown;
  sampleResponse: unknown;
  templateLayout?: unknown;
  bodyTemplate?: unknown;
  queryTemplate?: unknown;
  headersTemplate?: unknown;
  typeItemFilters?: unknown;
  integrationOverrides?: unknown;
  sessionAssignments?: ApiSessionFieldAssignment[];
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
  NONE: 'none',
};

const UI_AUTH_MAP: Record<Provider['authType'], string> = {
  none: 'NONE',
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
  return Object.entries(creds as Record<string, string>)
    .filter(([key]) => key !== 'custom_variables')
    .map(([key, value]) => ({ key, value: String(value) }));
}

export function pairsToCredentials(pairs: { key: string; value: string }[]): Record<string, string> {
  const o: Record<string, string> = {};
  for (const p of pairs) {
    if (p.key.trim()) o[p.key.trim()] = p.value;
  }
  return o;
}

export function parseReportFieldConfig(raw: unknown): TypeReportFieldConfig | undefined {
  let value = raw;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    try {
      value = JSON.parse(trimmed) as unknown;
    } catch {
      return undefined;
    }
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;

  const config = value as Record<string, unknown>;
  if (config.version !== 1 || !Array.isArray(config.fields)) return undefined;

  const fields = config.fields
    .filter((field): field is Record<string, unknown> => !!field && typeof field === 'object' && !Array.isArray(field))
    .map((field, fieldIndex) => ({
      id: typeof field.id === 'string' && field.id.trim() ? field.id : `field_${fieldIndex + 1}`,
      label: typeof field.label === 'string' ? field.label : '',
      sortOrder: typeof field.sortOrder === 'number' && Number.isFinite(field.sortOrder) ? field.sortOrder : fieldIndex,
      dataType: (() => {
        if (typeof field.dataType !== 'string') return 'text';
        const type = field.dataType.toLowerCase();
        if (type === 'string') return 'text';
        if (type === 'number') return 'numeric';
        return type as ReportFieldDataType;
      })(),
      conditionalRules: Array.isArray(field.conditionalRules)
        ? field.conditionalRules
            .filter((rule): rule is Record<string, unknown> => !!rule && typeof rule === 'object' && !Array.isArray(rule))
            .map((rule, ruleIndex) => ({
              id: typeof rule.id === 'string' && rule.id.trim() ? rule.id : `rule_${fieldIndex + 1}_${ruleIndex + 1}`,
              operator: typeof rule.operator === 'string'
                ? rule.operator as TypeReportFieldConfig['fields'][number]['conditionalRules'][number]['operator']
                : 'eq',
              value: rule.value == null ? undefined : String(rule.value),
              color: typeof rule.color === 'string' && rule.color.trim() ? rule.color : '#2563eb',
              colorTarget: rule.colorTarget === 'row' ? 'row' : 'value',
            }))
        : [],
    }));

  return {
    version: 1,
    title: typeof config.title === 'string' ? config.title : undefined,
    fields: assignKeysToReportFields(fields) as TypeReportFieldConfig['fields'],
  };
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
        reportFieldConfig: parseReportFieldConfig(f.reportFieldConfig),
      };
    });
}

export function mapApiProvider(p: ApiProvider): Provider {
  const balanceOp = p.operations.find((o) => o.operationType === 'BALANCE_CHECK');
  const rechargeOp = p.operations.find((o) => o.operationType === 'RECHARGE');

  let custom_variables: { key: string; value: string }[] = [];
  if (p.credentials && typeof p.credentials === 'object') {
    const credsObj = p.credentials as any;
    if (credsObj.custom_variables && typeof credsObj.custom_variables === 'object') {
      custom_variables = Object.entries(credsObj.custom_variables).map(([key, value]) => ({
        key,
        value: String(value),
      }));
    }
  }

  return {
    id: p.id,
    name: p.name,
    baseUrl: p.baseUrl,
    balanceEndpoint: balanceOp?.path ?? '',
    rechargeEndpoint: rechargeOp?.path ?? '',
    authType: authToUi(p.authType),
    credentials: credentialsToPairs(p.credentials),
    custom_variables,
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
  const cost = typeof p.cost === 'string'       ? parseFloat(p.cost)       : p.cost;
  const cpRaw = p.consultationPrice;
  const consultationPrice =
    cpRaw === undefined || cpRaw === null
      ? (Number.isFinite(cost) ? cost : 0)
      : typeof cpRaw === 'string'
        ? parseFloat(cpRaw)
        : cpRaw;
  const updatedAt = typeof p.updatedAt === 'string' ? p.updatedAt : '';

  let bodyTemplateJson = '';
  if (p.bodyTemplate !== null && p.bodyTemplate !== undefined) {
    bodyTemplateJson =
      typeof p.bodyTemplate === 'string'
        ? p.bodyTemplate
        : JSON.stringify(p.bodyTemplate, null, 2);
    bodyTemplateJson = bodyTemplateJson.replace(/:\s*"(\$?\{\{[\s\S]*?\}\})"/g, ': `$1`');
  }

  const groupedSessionAssignments: Record<string, ProductSessionFieldAssignment[]> = {};
  for (const row of p.sessionAssignments ?? []) {
    if (!groupedSessionAssignments[row.sessionKey]) groupedSessionAssignments[row.sessionKey] = [];
    groupedSessionAssignments[row.sessionKey].push({
      canonicalFieldId: row.canonicalFieldId,
      fieldTypeKey: row.canonicalField.pathKey,
      label: row.canonicalField.label,
      sourcePath: row.sourcePath ?? '',
      sortOrder: row.sortOrder,
      isActive: row.isActive,
    });
  }
  for (const sessionKey of Object.keys(groupedSessionAssignments)) {
    groupedSessionAssignments[sessionKey] = groupedSessionAssignments[sessionKey]!.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  return {
    id: p.id,
    providerId,
    name: p.name,
    externalId: p.externalId ?? p.code,
    endpoint: p.endpointPath,
    method,
    cost: Number.isFinite(cost) ? cost : 0,
    consultationPrice: Number.isFinite(consultationPrice) ? consultationPrice : (Number.isFinite(cost) ? cost : 0),
    fieldMappings,
    mappingIds,
    typeItemFilters: parseProductTypeItemFilters(p.typeItemFilters),
    sessionAssignments: groupedSessionAssignments,
    sampleResponse: sampleRes,
    bodyTemplateJson,
    templateLayout: p.templateLayout,
    updatedAt,
    status: p.isActive ? 'active' : 'inactive',
    integrationOverrides: parseProductIntegrationOverrides(p.integrationOverrides),
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
      productId: l.productId ?? null,
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

export interface ApiTemplateItem {
  id: string;
  templateId: string;
  providerProductId: string;
  sortOrder: number;
  alias: string | null;
  providerProduct?: ApiProduct & { provider?: ApiProvider; consultationType?: unknown };
}

export interface ApiTemplate {
  id: string;
  name: string;
  description: string | null;
  visibility: 'PRIVATE' | 'COMPANY' | 'GLOBAL';
  isFavorite: boolean;
  layout?: unknown;
  logo?: string | null;
  items: ApiTemplateItem[];
  createdAt: string;
  updatedAt: string;
  userId?: string | null;
  companyId?: string | null;
  user?: {
    id: string;
    fullName: string | null;
    email: string;
    role: string;
  } | null;
  company?: {
    id: string;
    name: string;
  } | null;
}

export async function getTemplatesApi(accessToken: string | null) {
  return apiRequest<ApiTemplate[]>('/templates', { method: 'GET', token: tok(accessToken) });
}

export async function createTemplateApi(
  accessToken: string | null,
  body: {
    name: string;
    description?: string;
    visibility?: 'PRIVATE' | 'COMPANY' | 'GLOBAL';
    isFavorite?: boolean;
    layout?: unknown;
    logo?: string | null;
    items: Array<{ providerProductId: string; sortOrder: number; alias?: string }>;
  },
) {
  return apiRequest<ApiTemplate>('/templates', {
    method: 'POST',
    token: tok(accessToken),
    body: JSON.stringify(body),
  });
}

export async function patchTemplateLayoutApi(
  accessToken: string | null,
  templateId: string,
  body: { name?: string; layout?: unknown; logo?: string | null; items?: Array<{ providerProductId: string; sortOrder: number; alias?: string }> },
) {
  return apiRequest<ApiTemplate>(`/templates/${templateId}/layout`, {
    method: 'PATCH',
    token: tok(accessToken),
    body: JSON.stringify(body),
  });
}

export async function deleteTemplateApi(accessToken: string | null, templateId: string) {
  return apiRequest<{ id: string }>(`/templates/${templateId}`, {
    method: 'DELETE',
    token: tok(accessToken),
  });
}

export async function favoriteTemplateApi(accessToken: string | null, templateId: string, isFavorite: boolean) {
  return apiRequest<ApiTemplate>(`/templates/${templateId}/favorite`, {
    method: 'PATCH',
    token: tok(accessToken),
    body: JSON.stringify({ isFavorite }),
  });
}

export async function getTemplateMvpConfigApi(
  accessToken: string | null,
  templateKey: MvpTemplateKey,
  documentType: MvpDocumentType,
) {
  return apiRequest<TemplateMvpConfig>(
    `/admin/templates-mvp/config?templateKey=${encodeURIComponent(templateKey)}&documentType=${encodeURIComponent(documentType)}`,
    { method: 'GET', token: tok(accessToken) },
  );
}

export async function putTemplateMvpConfigApi(
  accessToken: string | null,
  payload: Pick<TemplateMvpConfig, 'templateKey' | 'documentType' | 'displayName' | 'stages'>,
) {
  return apiRequest<TemplateMvpConfig>('/admin/templates-mvp/config', {
    method: 'PUT',
    token: tok(accessToken),
    body: JSON.stringify(payload),
  });
}

export async function importTemplateMvpPoolApi(
  accessToken: string | null,
  rootPath?: string,
) {
  return apiRequest<{ imported: number; ignored: number; scannedFiles: number }>('/admin/templates-mvp/test-pool/import', {
    method: 'POST',
    token: tok(accessToken),
    body: JSON.stringify({ ...(rootPath ? { rootPath } : {}) }),
  });
}

export async function getTemplateMvpPoolApi(
  accessToken: string | null,
  providerProductId?: string,
) {
  const q = providerProductId ? `?providerProductId=${encodeURIComponent(providerProductId)}` : '';
  return apiRequest<TemplateMvpPoolItem[]>(`/admin/templates-mvp/test-pool${q}`, {
    method: 'GET',
    token: tok(accessToken),
  });
}

export async function previewTemplateMvpApi(
  accessToken: string | null,
  payload: {
    templateKey: MvpTemplateKey;
    documentType: MvpDocumentType;
    stageSelections: Array<{
      stageId?: string;
      providerProductId?: string;
      productCode: string;
      enabled: boolean;
      selectedPoolId?: string;
    }>;
  },
) {
  return apiRequest<{
    templateKey: MvpTemplateKey;
    documentType: MvpDocumentType;
    usedStages: Array<{ stageId: string | null; productId: string; productCode: string; productName: string }>;
    mergedPayload: Record<string, unknown>;
    preview: {
      clientName: string;
      document: string;
      score: number;
      hasBacen: boolean;
      counts: Record<string, number>;
      totals: { grossTotal: number; uniqueTotal: number };
      byBureau: Record<string, unknown>;
    };
  }>('/admin/templates-mvp/preview', {
    method: 'POST',
    token: tok(accessToken),
    body: JSON.stringify(payload),
  });
}

export async function getCanonicalFields(accessToken: string | null) {
  return apiRequest<ApiCanonicalField[]>('/admin/catalog/canonical-fields', {
    method: 'GET',
    token: tok(accessToken),
  });
}

export async function getUserCanonicalFields(accessToken: string | null) {
  return apiRequest<ApiCanonicalField[]>('/catalog/canonical-fields', {
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

export async function getCustomBlocksApi(accessToken: string | null) {
  return apiRequest<CustomBlockDefinition[]>('/admin/custom-blocks', {
    method: 'GET',
    token: tok(accessToken),
  });
}

export async function createCustomBlockApi(
  accessToken: string | null,
  body: CreateCustomBlockPayload,
) {
  return apiRequest<CustomBlockDefinition>('/admin/custom-blocks', {
    method: 'POST',
    token: tok(accessToken),
    body: JSON.stringify(body),
  });
}

export async function patchCustomBlockApi(
  accessToken: string | null,
  blockId: string,
  body: UpdateCustomBlockPayload,
) {
  return apiRequest<CustomBlockDefinition>(`/admin/custom-blocks/${blockId}`, {
    method: 'PATCH',
    token: tok(accessToken),
    body: JSON.stringify(body),
  });
}

export async function deleteCustomBlockApi(accessToken: string | null, blockId: string) {
  return apiRequest<{ deleted: boolean }>(`/admin/custom-blocks/${blockId}`, {
    method: 'DELETE',
    token: tok(accessToken),
  });
}

export async function deleteProductApi(accessToken: string | null, productId: string) {
  return apiRequest<{ deleted: boolean }>(`/admin/providers/products/${productId}`, {
    method: 'DELETE',
    token: tok(accessToken),
  });
}

export async function getProductSessionAssignmentsApi(
  accessToken: string | null,
  productId: string,
  sessionKey?: string,
) {
  const suffix = sessionKey ? `?sessionKey=${encodeURIComponent(sessionKey)}` : '';
  return apiRequest<ApiSessionFieldAssignment[]>(`/admin/providers/products/${productId}/session-assignments${suffix}`, {
    method: 'GET',
    token: tok(accessToken),
  });
}

export async function putProductSessionAssignmentsApi(
  accessToken: string | null,
  productId: string,
  body: {
    sessionKey: string;
    assignments: Array<{
      canonicalFieldId: string;
      sourcePath?: string;
      sortOrder?: number;
      isActive?: boolean;
    }>;
  },
) {
  return apiRequest<ApiSessionFieldAssignment[]>(`/admin/providers/products/${productId}/session-assignments`, {
    method: 'PUT',
    token: tok(accessToken),
    body: JSON.stringify(body),
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
  body: {
    pathKey: string;
    label: string;
    dataType: string;
    description?: string;
    uiItemFilters?: unknown;
    reportFieldConfig?: unknown;
  },
) {
  return apiRequest<ApiCanonicalField>('/admin/catalog/canonical-fields', {
    method: 'POST',
    token: tok(accessToken),
    body: JSON.stringify(body),
  });
}

export async function importDefaultCanonicalSectionsApi(accessToken: string | null) {
  return apiRequest<ApiCanonicalField[]>('/admin/catalog/canonical-fields/import-default-sections', {
    method: 'POST',
    token: tok(accessToken),
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

export interface CompanyApiToken {
  id: string;
  ownerType: string;
  companyId: string | null;
  label: string;
  last4: string;
  allowedOrigins: string[] | null;
  isActive: boolean;
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
}

export async function getCompanyTokensApi(accessToken: string | null): Promise<CompanyApiToken[]> {
  return apiRequest<CompanyApiToken[]>('/companies/me/tokens', { method: 'GET', token: tok(accessToken) });
}

export async function createCompanyTokenApi(
  accessToken: string | null,
  body: { label: string; allowedOrigins?: string[] },
): Promise<{ token: string; apiToken: CompanyApiToken }> {
  return apiRequest<{ token: string; apiToken: CompanyApiToken }>('/companies/me/tokens', {
    method: 'POST',
    token: tok(accessToken),
    body: JSON.stringify(body),
  });
}

export async function revokeCompanyTokenApi(accessToken: string | null, tokenId: string): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>(`/companies/me/tokens/${tokenId}`, {
    method: 'DELETE',
    token: tok(accessToken),
  });
}

export interface ApiCanonicalFolder {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiCanonicalFieldFolderAssociation {
  id: string;
  fieldTypeKey: string;
  folderId: string;
  createdAt: string;
  updatedAt: string;
}

export async function getCanonicalFolders(accessToken: string | null): Promise<ApiCanonicalFolder[]> {
  return apiRequest<ApiCanonicalFolder[]>('/admin/catalog/folders', { method: 'GET', token: tok(accessToken) });
}

export async function createCanonicalFolder(
  accessToken: string | null,
  body: { name: string; parentId?: string | null },
): Promise<ApiCanonicalFolder> {
  return apiRequest<ApiCanonicalFolder>('/admin/catalog/folders', {
    method: 'POST',
    token: tok(accessToken),
    body: JSON.stringify(body),
  });
}

export async function patchCanonicalFolder(
  accessToken: string | null,
  folderId: string,
  body: { name?: string; parentId?: string | null },
): Promise<ApiCanonicalFolder> {
  return apiRequest<ApiCanonicalFolder>(`/admin/catalog/folders/${folderId}`, {
    method: 'PATCH',
    token: tok(accessToken),
    body: JSON.stringify(body),
  });
}

export async function deleteCanonicalFolder(accessToken: string | null, folderId: string): Promise<{ deleted: boolean }> {
  return apiRequest<{ deleted: boolean }>(`/admin/catalog/folders/${folderId}`, {
    method: 'DELETE',
    token: tok(accessToken),
  });
}

export async function getCanonicalFolderAssociations(accessToken: string | null): Promise<ApiCanonicalFieldFolderAssociation[]> {
  return apiRequest<ApiCanonicalFieldFolderAssociation[]>('/admin/catalog/folders/associations', { method: 'GET', token: tok(accessToken) });
}

export async function postCanonicalFolderAssociation(
  accessToken: string | null,
  body: { fieldTypeKey: string; folderId: string | null },
): Promise<ApiCanonicalFieldFolderAssociation | { deleted: boolean }> {
  return apiRequest<ApiCanonicalFieldFolderAssociation | { deleted: boolean }>('/admin/catalog/folders/associations', {
    method: 'POST',
    token: tok(accessToken),
    body: JSON.stringify(body),
  });
}

