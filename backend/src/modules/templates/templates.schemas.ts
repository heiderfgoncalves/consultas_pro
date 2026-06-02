import { z } from 'zod';

export const createTemplateSchema = z.object({
  name: z.string().min(3),
  description: z.string().optional(),
  visibility: z.enum(['PRIVATE', 'COMPANY', 'GLOBAL']).default('PRIVATE'),
  isFavorite: z.boolean().default(false),
  layout: z.any().optional(),
  logo: z.string().nullable().optional(),
  items: z.array(z.object({
    providerProductId: z.string().min(1),
    sortOrder: z.number().int().nonnegative().default(0),
    alias: z.string().optional(),
  })).min(1),
});

const templateLayoutV1Schema = z.object({
  schemaVersion: z.literal(1),
  sections: z.array(z.any()),
});

const templateLayoutV2Schema = z.object({
  schemaVersion: z.literal(2),
  name: z.string().optional(),
  nodes: z.array(z.any()),
  metadata: z.object({
    logo: z.string().nullable().optional(),
    selectedBlockIds: z.array(z.string()).optional(),
    xml: z.string().optional(),
    updatedAt: z.string().optional(),
  }).optional(),
});

const reportTemplateSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  version: z.number().optional(),
  canvas: z.object({
    background: z.string().optional(),
    grid: z.number().optional(),
  }).optional(),
  frames: z.array(z.any()).optional(),
  elements: z.array(z.any()).optional(),
  metadata: z.record(z.any()).optional(),
});

export const updateTemplateLayoutSchema = z.object({
  name: z.string().min(1).optional(),
  layout: z.any().optional(),
  logo: z.string().nullable().optional(),
  items: z.array(z.object({
    providerProductId: z.string().min(1),
    sortOrder: z.number().int().nonnegative().default(0),
    alias: z.string().optional(),
  })).optional(),
});
