import { z } from 'zod';

export const createTemplateSchema = z.object({
  name: z.string().min(3),
  description: z.string().optional(),
  visibility: z.enum(['PRIVATE', 'COMPANY']).default('PRIVATE'),
  isFavorite: z.boolean().default(false),
  items: z.array(z.object({
    providerProductId: z.string().min(1),
    sortOrder: z.number().int().nonnegative().default(0),
    alias: z.string().optional(),
  })).min(1),
});
