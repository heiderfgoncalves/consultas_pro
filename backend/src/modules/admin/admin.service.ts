import type { FastifyInstance } from 'fastify';
import type { Prisma } from '@prisma/client';

export async function logAdminAudit(
  app: FastifyInstance,
  input: {
    actorUserId?: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    metadata?: Record<string, unknown>;
  },
) {
  return app.prisma.adminAuditLog.create({
    data: {
      actorUserId: input.actorUserId ?? undefined,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? undefined,
      metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });
}
