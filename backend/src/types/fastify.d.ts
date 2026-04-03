import type { PrismaClient, Role } from '@prisma/client';
import type { Redis } from 'ioredis';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
    redis: Redis;
    authenticate: (request: import('fastify').FastifyRequest, reply: import('fastify').FastifyReply) => Promise<void>;
  }

  interface FastifyRequest {
    authUser?: {
      userId: string;
      role: Role;
      companyId?: string | null;
      tenantId?: string | null;
      email: string;
    };
  }
}
