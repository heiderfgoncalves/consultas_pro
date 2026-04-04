import { zodToJsonSchema } from 'zod-to-json-schema';
import type { ZodTypeAny } from 'zod';
import {
  loginSchema,
  registerUserSchema,
  registerCompanySchema,
} from '../modules/auth/auth.schemas';

export function bodyFromZod(schema: ZodTypeAny): Record<string, unknown> {
  // Evita TS2589 (profundidade de tipos) na interação zod + zod-to-json-schema
  return zodToJsonSchema(schema as never, { target: 'openApi3' }) as Record<string, unknown>;
}

const userPublic = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    fullName: { type: 'string' },
    email: { type: 'string' },
    document: { type: 'string', nullable: true },
    phone: { type: 'string', nullable: true },
    role: {
      type: 'string',
      enum: ['PLATFORM_ADMIN', 'COMPANY_OWNER', 'COMPANY_MANAGER', 'USER'],
    },
    companyId: { type: 'string', nullable: true },
    isActive: { type: 'boolean' },
    accountStatus: {
      type: 'string',
      enum: ['ACTIVE', 'SUSPENDED', 'BLOCKED'],
    },
    lastLoginAt: { type: 'string', format: 'date-time', nullable: true },
    createdAt: { type: 'string', format: 'date-time', nullable: true },
  },
  required: ['id', 'fullName', 'email', 'role', 'isActive', 'accountStatus'],
} as const;

const companyCreated = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    slug: { type: 'string' },
    document: { type: 'string' },
    walletBalance: { type: 'number' },
  },
  required: ['id', 'name', 'slug', 'document', 'walletBalance'],
} as const;

export const authOpenApiBodies = {
  login: bodyFromZod(loginSchema),
  registerUser: bodyFromZod(registerUserSchema),
  registerCompany: bodyFromZod(registerCompanySchema),
} as const;

export const healthOpenApi = {
  response200: {
    description: 'Serviço ativo',
    type: 'object',
    properties: {
      success: { type: 'boolean', const: true },
      data: {
        type: 'object',
        properties: {
          status: { type: 'string', const: 'ok' },
          uptime: { type: 'number' },
          timestamp: { type: 'string', format: 'date-time' },
        },
        required: ['status', 'uptime', 'timestamp'],
      },
    },
    required: ['success', 'data'],
  },
} as const;

export const authOpenApiResponses = {
  login200: {
    description: 'Credenciais válidas',
    type: 'object',
    properties: {
      success: { type: 'boolean', const: true },
      data: {
        type: 'object',
        properties: {
          accessToken: { type: 'string' },
          user: userPublic,
        },
        required: ['accessToken', 'user'],
      },
    },
    required: ['success', 'data'],
  },
  registerUser201: {
    description: 'Usuário cadastrado',
    type: 'object',
    properties: {
      success: { type: 'boolean', const: true },
      data: userPublic,
    },
    required: ['success', 'data'],
  },
  registerCompany201: {
    description: 'Empresa e dono criados',
    type: 'object',
    properties: {
      success: { type: 'boolean', const: true },
      data: {
        type: 'object',
        properties: {
          company: companyCreated,
          owner: userPublic,
        },
        required: ['company', 'owner'],
      },
    },
    required: ['success', 'data'],
  },
} as const;
