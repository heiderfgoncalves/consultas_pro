import type { FastifyInstance } from 'fastify';
import type { Role } from '@prisma/client';
import { ValidationError } from '../../core/errors';
import {
  EXTERNAL_ENDPOINT_CATALOG,
  getExternalCatalogRouteKeys,
} from '../../core/external-endpoints.catalog';

const ALL_ROLES: Role[] = ['PLATFORM_ADMIN', 'COMPANY_OWNER', 'COMPANY_MANAGER', 'USER'];

export type EndpointAccessCatalogItem = (typeof EXTERNAL_ENDPOINT_CATALOG)[number];

export type EndpointAccessMatrix = Record<string, Record<string, boolean>>;

export async function getEndpointAccessSnapshot(app: FastifyInstance): Promise<{
  catalog: EndpointAccessCatalogItem[];
  matrix: EndpointAccessMatrix;
}> {
  const routeKeys = getExternalCatalogRouteKeys();
  const policies = await app.prisma.roleEndpointPolicy.findMany({
    where: { routeKey: { in: routeKeys } },
  });

  const matrix: EndpointAccessMatrix = {};
  for (const role of ALL_ROLES) {
    matrix[role] = {};
    for (const key of routeKeys) {
      const row = policies.find((p) => p.role === role && p.routeKey === key);
      matrix[role][key] = row?.isEnabled ?? true;
    }
  }

  return { catalog: EXTERNAL_ENDPOINT_CATALOG, matrix };
}

export async function replaceEndpointAccessMatrix(
  app: FastifyInstance,
  rows: { role: Role; routeKey: string; isEnabled: boolean }[],
): Promise<EndpointAccessMatrix> {
  const routeKeys = new Set(getExternalCatalogRouteKeys());
  for (const row of rows) {
    if (!routeKeys.has(row.routeKey)) {
      throw new ValidationError(`routeKey desconhecido: ${row.routeKey}`);
    }
    if (!ALL_ROLES.includes(row.role)) {
      throw new ValidationError(`Papel inválido: ${row.role}`);
    }
  }

  const expected = ALL_ROLES.length * routeKeys.size;
  if (rows.length !== expected) {
    throw new ValidationError(`Matriz incompleta: esperado ${expected} células, recebido ${rows.length}`);
  }

  const seen = new Set<string>();
  for (const row of rows) {
    const k = `${row.role}:${row.routeKey}`;
    if (seen.has(k)) throw new ValidationError(`Entrada duplicada: ${k}`);
    seen.add(k);
  }

  await app.prisma.$transaction(
    rows.map((row) =>
      app.prisma.roleEndpointPolicy.upsert({
        where: {
          role_routeKey: {
            role: row.role,
            routeKey: row.routeKey,
          },
        },
        create: {
          role: row.role,
          routeKey: row.routeKey,
          isEnabled: row.isEnabled,
        },
        update: {
          isEnabled: row.isEnabled,
        },
      }),
    ),
  );

  return (await getEndpointAccessSnapshot(app)).matrix;
}
