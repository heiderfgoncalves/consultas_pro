import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3333),
  HOST: z.string().default('0.0.0.0'),
  APP_URL: z.string().url(),
  JWT_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.string().default('7d'),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  DEFAULT_INVITE_EXPIRATION_HOURS: z.coerce.number().default(72),
  PROVIDER_REQUEST_TIMEOUT_MS: z.coerce.number().default(30000),
  /** Concorrência do worker BullMQ de execução de consultas (exposto na API admin para leitura). */
  CONSULTATION_WORKER_CONCURRENCY: z.coerce.number().int().positive().max(50).default(5),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  /** Origens extras permitidas no CORS, separadas por vírgula (opcional). */
  CORS_ORIGINS: z.string().optional(),
});

export const env = envSchema.parse(process.env);
export type Env = typeof env;
