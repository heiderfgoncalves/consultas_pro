import { z } from 'zod';

export const createConsultationSchema = z.object({
  subjectDocument: z.string().min(11),
  subjectType: z.enum(['CPF', 'CNPJ']).default('CPF'),
  templateId: z.string().optional(),
  providerProductIds: z.array(z.string()).optional(),
  externalUserId: z.string().optional(),
});

export const mergePreviewSchema = z.object({
  executionIds: z.array(z.string()).optional(),
  testLogIds: z.array(z.string()).optional(),
});
