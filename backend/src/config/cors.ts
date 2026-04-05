import type { FastifyCorsOptions } from '@fastify/cors';
import { env } from './env';

function stripTrailingSlash(s: string): string {
  return s.replace(/\/+$/, '');
}

/** Homolog + produção (Origin do browser é scheme+host+porta, sem path). */
const BUILTIN_ALLOWED = [
  'https://consultaspro-api-homol.limpanome.pro',
  'https://consultaspro-app-homol.limpanome.pro',
  'https://consultas.limpanome.pro',
] as const;

function parseExtraOrigins(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(',')
    .map((s) => stripTrailingSlash(s.trim()))
    .filter(Boolean);
}

function isLocalhostStyleOrigin(origin: string): boolean {
  try {
    const { protocol, hostname } = new URL(origin);
    if (protocol !== 'http:' && protocol !== 'https:') return false;
    return (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '[::1]' ||
      hostname === '::1'
    );
  } catch {
    return false;
  }
}

const allowedSet = new Set<string>([
  ...BUILTIN_ALLOWED,
  ...parseExtraOrigins(env.CORS_ORIGINS),
]);

export function buildCorsOptions(): FastifyCorsOptions {
  return {
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Authorization',
      'Content-Type',
      'Accept',
      'Origin',
      'X-Requested-With',
    ],
    exposedHeaders: ['Content-Type', 'Content-Length'],
    maxAge: 86400,
    strictPreflight: false,
    origin: (origin, cb) => {
      if (!origin) {
        cb(null, true);
        return;
      }
      const normalized = stripTrailingSlash(origin);
      if (allowedSet.has(normalized)) {
        cb(null, true);
        return;
      }
      if (isLocalhostStyleOrigin(origin)) {
        cb(null, true);
        return;
      }
      cb(null, false);
    },
  };
}
