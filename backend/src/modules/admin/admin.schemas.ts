import { z } from 'zod';
import { productIntegrationOverridesSchema } from '../../lib/integration-settings';

export const templateVariableExpressionSchema = z
  .string()
  .refine((value) => {
    const trimmed = value.trim();
    if (!trimmed.startsWith('${') || !trimmed.endsWith('}')) return false;
    const core = trimmed.slice(2, -1).trim();
    if (/^[a-zA-Z0-9_]+$/.test(core)) return true;
    return /^"[^"]+"\."[^"]+"$/.test(core);
  }, 'Variável inválida');

const templateLayoutSchema = z.object({
  layoutSchemaVersion: z.literal(1),
  rootIds: z.array(z.string().min(1)),
  nodes: z.record(z.any()),
  themeTokens: z.object({
    surface: z.string().min(1),
    surfaceAlt: z.string().min(1),
    text: z.string().min(1),
    border: z.string().min(1),
    accent: z.string().min(1),
  }),
  meta: z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    updatedAt: z.string().min(1),
  }),
});

export const createProviderSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2),
  baseUrl: z.string().url(),
  authType: z.enum(['NONE', 'API_KEY', 'BEARER', 'BASIC_AUTH', 'CUSTOM']).default('NONE'),
  credentials: z.record(z.any()).optional(),
  defaultHeaders: z.record(z.string()).optional(),
});

export const createProviderOperationSchema = z.object({
  providerId: z.string().min(1),
  operationType: z.enum(['BALANCE_CHECK', 'RECHARGE', 'CUSTOM']),
  name: z.string().min(2),
  path: z.string().min(1),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).default('POST'),
  headersTemplate: z.record(z.any()).optional(),
  queryTemplate: z.record(z.any()).optional(),
  bodyTemplate: z.any().optional(),
  timeoutMs: z.number().int().positive().optional(),
});

export const createProviderProductSchema = z.object({
  providerId: z.string().min(1),
  consultationTypeId: z.string().optional(),
  name: z.string().min(2),
  code: z.string().min(1),
  externalId: z.string().optional(),
  endpointPath: z.string().min(1),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).default('POST'),
  queryTemplate: z.record(z.any()).optional(),
  bodyTemplate: z.any().optional(),
  headersTemplate: z.record(z.any()).optional(),
  timeoutMs: z.number().int().positive().optional(),
  cost: z.coerce.number().nonnegative(),
  consultationPrice: z.coerce.number().nonnegative().optional(),
  sampleRequest: z.any().optional(),
  sampleResponse: z.any().optional(),
  templateLayout: templateLayoutSchema.optional(),
  typeItemFilters: z.any().optional(),
  integrationOverrides: productIntegrationOverridesSchema.nullable().optional(),
});

export const createMappingSchema = z.object({
  productId: z.string().min(1),
  canonicalFieldId: z.string().min(1),
  sourcePath: z.string().min(1),
  uiStartLine: z.number().int().nonnegative().optional(),
  uiEndLine: z.number().int().nonnegative().optional(),
  transformName: z.string().optional(),
  fallbackValue: z.string().optional(),
  notes: z.string().optional(),
  sortOrder: z.number().int().nonnegative().default(0),
});

export const updateProviderSchema = z.object({
  name: z.string().min(2).optional(),
  slug: z.string().min(2).optional(),
  baseUrl: z.string().url().optional(),
  authType: z.enum(['NONE', 'API_KEY', 'BEARER', 'BASIC_AUTH', 'CUSTOM']).optional(),
  credentials: z.record(z.any()).optional(),
  defaultHeaders: z.record(z.string()).optional(),
  isActive: z.boolean().optional(),
});

export const updateProviderOperationSchema = z.object({
  operationType: z.enum(['BALANCE_CHECK', 'RECHARGE', 'CUSTOM']).optional(),
  name: z.string().min(2).optional(),
  path: z.string().min(1).optional(),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).optional(),
  headersTemplate: z.record(z.any()).optional(),
  queryTemplate: z.record(z.any()).optional(),
  bodyTemplate: z.any().optional(),
  timeoutMs: z.number().int().positive().nullable().optional(),
  isActive: z.boolean().optional(),
});

export const updateProviderProductSchema = z.object({
  consultationTypeId: z.string().nullable().optional(),
  name: z.string().min(2).optional(),
  code: z.string().min(1).optional(),
  externalId: z.string().nullable().optional(),
  endpointPath: z.string().min(1).optional(),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).optional(),
  queryTemplate: z.record(z.any()).nullable().optional(),
  bodyTemplate: z.any().nullable().optional(),
  headersTemplate: z.record(z.any()).nullable().optional(),
  timeoutMs: z.number().int().positive().nullable().optional(),
  cost: z.coerce.number().nonnegative().optional(),
  consultationPrice: z.coerce.number().nonnegative().optional(),
  isActive: z.boolean().optional(),
  sampleRequest: z.any().nullable().optional(),
  sampleResponse: z.any().nullable().optional(),
  templateLayout: templateLayoutSchema.nullable().optional(),
  typeItemFilters: z.any().nullable().optional(),
  integrationOverrides: productIntegrationOverridesSchema.nullable().optional(),
});

export const listProductSessionAssignmentsQuerySchema = z.object({
  sessionKey: z.string().min(1).optional(),
});

const sessionAssignmentItemSchema = z.object({
  canonicalFieldId: z.string().min(1),
  sourcePath: z.string().min(1).optional(),
  sortOrder: z.number().int().nonnegative().optional(),
  isActive: z.boolean().optional(),
});

export const putProductSessionAssignmentsSchema = z.object({
  sessionKey: z.string().min(1),
  assignments: z.array(sessionAssignmentItemSchema),
});

export const updateMappingSchema = z.object({
  canonicalFieldId: z.string().min(1).optional(),
  sourcePath: z.string().min(1).optional(),
  uiStartLine: z.number().int().nonnegative().nullable().optional(),
  uiEndLine: z.number().int().nonnegative().nullable().optional(),
  transformName: z.string().nullable().optional(),
  fallbackValue: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  sortOrder: z.number().int().nonnegative().optional(),
  isActive: z.boolean().optional(),
});

export const updateCanonicalFieldSchema = z.object({
  label: z.string().min(2).optional(),
  dataType: z.string().min(2).optional(),
  description: z.string().nullable().optional(),
  uiItemFilters: z.any().nullable().optional(),
  reportFieldConfig: z.any().nullable().optional(),
  isActive: z.boolean().optional(),
});

export const createConsultationTypeSchema = z.object({
  key: z.string().min(2),
  name: z.string().min(2),
  description: z.string().optional(),
  targetSectionKeys: z.array(z.string()).optional(),
});

export const createCanonicalFieldSchema = z.object({
  pathKey: z.string().min(2),
  label: z.string().min(2),
  dataType: z.string().min(2),
  description: z.string().optional(),
  uiItemFilters: z.any().optional(),
  reportFieldConfig: z.any().optional(),
});

export const testProductSchema = z.object({
  context: z.record(z.any()),
  bodyTemplate: z.any().optional(),
  queryTemplate: z.record(z.any()).optional(),
  headersTemplate: z.record(z.any()).optional(),
});

export const testProductDraftSchema = z.object({
  providerId: z.string().min(1),
  endpointPath: z.string().min(1),
  method: z.enum(['GET', 'POST']).default('POST'),
  context: z.record(z.any()).default({}),
  bodyTemplate: z.any().optional(),
  queryTemplate: z.record(z.any()).optional(),
  headersTemplate: z.record(z.any()).optional(),
  homologationOnly: z.boolean().optional().default(false),
  persistLog: z.boolean().optional().default(true),
});

export const previewMergeSchema = z.object({
  executionIds: z.array(z.string()).optional(),
  testLogIds: z.array(z.string()).optional(),
});

export const createAdminUserSchema = z.object({
  fullName: z.string().min(3),
  email: z.string().email(),
  document: z.string().min(11),
  phone: z.string().min(8),
  password: z.string().min(8),
  role: z.enum(['PLATFORM_ADMIN', 'CUSTOMER_ADMIN', 'COMPANY_ADMIN', 'COMPANY_COMMON', 'USER', 'COMPANY_MANAGER', 'COMPANY_OWNER']).default('USER'),
  companyId: z.string().optional(),
});

export const createAdminCompanySchema = z.object({
  name: z.string().min(3),
  document: z.string().min(14),
  email: z.string().email().optional(),
  phone: z.string().min(8).optional(),
  tenantId: z.string().optional(),
});

export const createCompanyInviteSchema = z.object({
  email: z.string().email(),
  metadata: z.record(z.any()).optional(),
});

export const linkUserToCompanySchema = z.object({
  companyId: z.string().nullable(),
});

export const createTokenSchema = z
  .object({
    tenantId: z.string().optional(),
    companyId: z.string().optional(),
    label: z.string().min(2),
    /** Alinhar com `routeKey` do catálogo externo, ex.: `{ "api.consultations.create": true }` — ver `docs/integration/api-route-keys.md`. */
    scopes: z.record(z.any()).optional(),
    expiresAt: z.string().datetime().optional(),
  })
  .refine((d) => !(d.tenantId && d.companyId), {
    message: 'Informe apenas tenantId ou companyId',
  });

export const updateAdminUserSchema = z.object({
  fullName: z.string().min(3).optional(),
  email: z.string().email().optional(),
  document: z.string().min(11).optional().nullable(),
  phone: z.string().min(8).optional().nullable(),
  role: z.enum(['PLATFORM_ADMIN', 'CUSTOMER_ADMIN', 'COMPANY_ADMIN', 'COMPANY_COMMON', 'USER', 'COMPANY_MANAGER', 'COMPANY_OWNER']).optional(),
  companyId: z.string().nullable().optional(),
  accountStatus: z.enum(['ACTIVE', 'SUSPENDED', 'BLOCKED']).optional(),
  password: z.string().min(8).optional(),
});

export const updateAdminCompanySchema = z.object({
  name: z.string().min(3).optional(),
  document: z.string().min(14).optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().min(8).optional().nullable(),
  tenantId: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

export const adminCompanyCreditSchema = z.object({
  amount: z.coerce.number().positive(),
  description: z.string().optional(),
});

export const listAdminInvitesQuerySchema = z.object({
  companyId: z.string().optional(),
  status: z.enum(['PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED']).optional(),
  take: z.coerce.number().int().min(1).max(200).optional().default(100),
});

export const listAdminAuditQuerySchema = z.object({
  take: z.coerce.number().int().min(1).max(200).optional().default(100),
});

export const listCompanyLedgerQuerySchema = z.object({
  take: z.coerce.number().int().min(1).max(200).optional().default(50),
});

export const patchAdminTokenSchema = z.object({
  isActive: z.boolean(),
});

const roleEnum = z.enum(['PLATFORM_ADMIN', 'CUSTOMER_ADMIN', 'COMPANY_ADMIN', 'COMPANY_COMMON', 'COMPANY_OWNER', 'COMPANY_MANAGER', 'USER']);

export const putRoleEndpointAccessSchema = z.object({
  matrix: z.array(
    z.object({
      role: roleEnum,
      routeKey: z.string().min(1),
      isEnabled: z.boolean(),
    }),
  ),
});
