import { z } from 'zod';

export const createCustomBlockSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.string().min(1).default('custom'),
  template: z.string().min(1),
  skeleton: z.string().min(1),
  variables: z.array(z.string()).default([]),
});

export const updateCustomBlockSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  category: z.string().min(1).optional(),
  template: z.string().min(1).optional(),
  skeleton: z.string().min(1).optional(),
  variables: z.array(z.string()).optional(),
});
