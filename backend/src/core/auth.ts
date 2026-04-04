import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Role } from '@prisma/client';
import { ForbiddenError, UnauthorizedError } from './errors';
import { isKnownExternalRouteKey } from './external-endpoints.catalog';

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

/** Restringe endpoints catalogados em `external-endpoints.catalog.ts` por papel (matriz global). */
export function requireEndpointAccess(routeKey: string) {
  if (!isKnownExternalRouteKey(routeKey)) {
    throw new Error(`requireEndpointAccess: routeKey não catalogado: ${routeKey}`);
  }

  return async function endpointAccessGuard(request: FastifyRequest) {
    if (!request.authUser) {
      throw new UnauthorizedError();
    }

    if (request.authUser.role === 'PLATFORM_ADMIN') {
      return;
    }

    const policy = await request.server.prisma.roleEndpointPolicy.findUnique({
      where: {
        role_routeKey: {
          role: request.authUser.role,
          routeKey,
        },
      },
    });

    const enabled = policy?.isEnabled ?? true;
    if (!enabled) {
      throw new ForbiddenError('Endpoint não liberado para o seu papel');
    }
  };
}
