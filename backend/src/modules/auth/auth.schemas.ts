import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const registerUserSchema = z.object({
  fullName: z.string().min(3),
  email: z.string().email(),
  document: z.string().min(11),
  phone: z.string().min(8),
  password: z.string().min(8),
});

export const registerCompanySchema = z.object({
  companyName: z.string().min(3),
  companyDocument: z.string().min(14),
  companyEmail: z.string().email().optional(),
  companyPhone: z.string().min(8).optional(),
  ownerFullName: z.string().min(3),
  ownerEmail: z.string().email(),
  ownerDocument: z.string().min(11),
  ownerPhone: z.string().min(8),
  password: z.string().min(8),
  tenantSlug: z.string().optional(),
});

export const acceptInviteSchema = z.object({
  token: z.string().min(20),
  fullName: z.string().min(3).optional(),
  email: z.string().email().optional(),
  document: z.string().min(11).optional(),
  phone: z.string().min(8).optional(),
  password: z.string().min(8),
  companyName: z.string().min(3).optional(),
  companyDocument: z.string().min(14).optional(),
  companyPhone: z.string().min(8).optional(),
});
