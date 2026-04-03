import type { FastifyReply, FastifyRequest } from 'fastify';
import { ForbiddenError, UnauthorizedError } from './errors';
import type { Role } from '@prisma/client';

export async function authenticate(request: FastifyRequest, _reply: FastifyReply) {
  try {
    await request.jwtVerify<{
      sub: string;
      email: string;
      role: Role;
      companyId?: string | null;
      tenantId?: string | null;
    }>();

    request.authUser = {
      userId: request.user.sub,
      email: request.user.email,
      role: request.user.role,
      companyId: request.user.companyId,
      tenantId: request.user.tenantId,
    };
  } catch {
    throw new UnauthorizedError();
  }
}

export function requireRoles(roles: Role[]) {
  return async function roleGuard(request: FastifyRequest) {
    if (!request.authUser) {
      throw new UnauthorizedError();
    }

    if (!roles.includes(request.authUser.role)) {
      throw new ForbiddenError();
    }
  };
}
