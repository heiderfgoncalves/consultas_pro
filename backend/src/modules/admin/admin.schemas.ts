import { z } from 'zod';

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
  sampleRequest: z.any().optional(),
  sampleResponse: z.any().optional(),
});

export const createMappingSchema = z.object({
  productId: z.string().min(1),
  canonicalFieldId: z.string().min(1),
  sourcePath: z.string().min(1),
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
  isActive: z.boolean().optional(),
  sampleRequest: z.any().nullable().optional(),
  sampleResponse: z.any().nullable().optional(),
});

export const updateMappingSchema = z.object({
  canonicalFieldId: z.string().min(1).optional(),
  sourcePath: z.string().min(1).optional(),
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
  role: z.enum(['USER', 'COMPANY_MANAGER', 'COMPANY_OWNER']).default('USER'),
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

export const createTokenSchema = z.object({
  tenantId: z.string().optional(),
  label: z.string().min(2),
  scopes: z.record(z.any()).optional(),
  expiresAt: z.string().datetime().optional(),
});
