import { z } from 'zod';

export const createCompanyUserSchema = z.object({
  fullName: z.string().min(3),
  email: z.string().email(),
  document: z.string().min(11),
  phone: z.string().min(8),
  password: z.string().min(8),
  role: z.enum(['COMPANY_MANAGER', 'USER']).default('USER'),
});

export const createCompanyUserInviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['COMPANY_MANAGER', 'USER']).default('USER'),
  metadata: z.record(z.any()).optional(),
});
