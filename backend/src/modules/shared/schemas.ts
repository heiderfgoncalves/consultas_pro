import { z } from 'zod';

export const paginationSchema = z.object({
  page: z.coerce.number().default(1),
  pageSize: z.coerce.number().max(100).default(20),
});

export const documentSchema = z.string().min(11).max(18);
