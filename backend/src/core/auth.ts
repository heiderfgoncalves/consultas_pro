import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Role } from '@prisma/client';
import { ForbiddenError, UnauthorizedError } from './errors';
import { isKnownExternalRouteKey } from './external-endpoints.catalog';

import { sha256 } from '../lib/hash';

export async function authenticate(request: FastifyRequest, _reply: FastifyReply) {
  // 0. Se veio token via query param (?token=...), injeta no header para o jwtVerify funcionar
  const queryToken = (request.query as Record<string, string>)?.token;
  if (queryToken && !request.headers.authorization) {
    request.headers.authorization = `Bearer ${queryToken}`;
  }

  // 1. Tenta autenticação via JWT (sessão web do painel principal)
  try {
    await request.jwtVerify<{
      sub: string;
      email: string;
      role: Role;
      companyId?: string | null;
      tenantId?: string | null;
    }>();

    const user = await request.server.prisma.user.findUnique({
      where: { id: (request.user as any).sub },
      include: { company: true },
    });

    if (!user || !user.isActive || user.accountStatus !== 'ACTIVE') {
      throw new UnauthorizedError('Usuário inativo ou não encontrado');
    }

    request.authUser = {
      userId: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
      tenantId: user.company?.tenantId ?? null,
    };
    return; // Autenticado com sucesso via JWT
  } catch (jwtError) {
    // JWT falhou, prossegue para tentar autenticação via API Token
  }

  // 2. Tenta autenticação via Token de API (Headers Authorization ou X-API-Key)
  let rawToken: string | undefined;

  const authHeader = request.headers.authorization;
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    rawToken = authHeader.substring(7).trim();
  } else {
    const apiKeyHeader = request.headers['x-api-key'];
    if (typeof apiKeyHeader === 'string') {
      rawToken = apiKeyHeader.trim();
    }
  }

  if (!rawToken) {
    throw new UnauthorizedError('Credenciais não fornecidas');
  }

  try {
    const tokenHash = sha256(rawToken);
    const apiToken = await request.server.prisma.apiToken.findUnique({
      where: { tokenHash, isActive: true },
      include: { company: true },
    });

    if (!apiToken) {
      throw new UnauthorizedError('Token de API inválido ou inativo');
    }

    if (apiToken.expiresAt && apiToken.expiresAt < new Date()) {
      throw new UnauthorizedError('Token de API expirado');
    }

    // 3. Validação de Restrição de Domínio (CORS / Domain Lock)
    if (apiToken.allowedOrigins) {
      const allowedOriginsArray = Array.isArray(apiToken.allowedOrigins)
        ? (apiToken.allowedOrigins as string[])
        : typeof apiToken.allowedOrigins === 'string'
        ? JSON.parse(apiToken.allowedOrigins)
        : [];

      if (allowedOriginsArray.length > 0) {
        const origin = request.headers.origin;
        const referer = request.headers.referer;
        let clientOrigin = origin;

        if (!clientOrigin && referer) {
          try {
            clientOrigin = new URL(referer).origin;
          } catch {}
        }

        if (clientOrigin) {
          const clientOriginLower = clientOrigin.toLowerCase();
          const isAllowed = allowedOriginsArray.some((allowed: string) => {
            const allowedLower = allowed.toLowerCase().trim();
            if (allowedLower === '*') return true;
            
            // Remove protocolos para comparação flexível se o parceiro cadastrou apenas o domínio (ex: rprotec.com.br)
            const cleanClient = clientOriginLower.replace(/^https?:\/\//, '');
            const cleanAllowed = allowedLower.replace(/^https?:\/\//, '');
            
            return cleanClient === cleanAllowed || cleanClient.endsWith('.' + cleanAllowed);
          });

          if (!isAllowed) {
            throw new ForbiddenError('Origem da requisição não autorizada para este Token de API');
          }
        }
      }
    }

    // Atualiza assincronamente a última data de uso do Token
    request.server.prisma.apiToken.update({
      where: { id: apiToken.id },
      data: { lastUsedAt: new Date() },
    }).catch((err) => request.log.error({ err, tokenId: apiToken.id }, 'failed_to_update_token_last_used'));

    // Injeta o authUser associado à empresa dona do token
    request.authUser = {
      userId: apiToken.createdById || 'api-bot',
      email: apiToken.company?.email || 'api@company.com',
      role: 'COMPANY_MANAGER', // Papel padrão da empresa para rotas autorizadas
      companyId: apiToken.companyId,
      tenantId: apiToken.tenantId,
    };
  } catch (err) {
    if (err instanceof ForbiddenError || err instanceof UnauthorizedError) {
      throw err;
    }
    throw new UnauthorizedError('Falha na autenticação do Token de API');
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
