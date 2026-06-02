import type { FastifyInstance } from 'fastify';
import { Role } from '@prisma/client';
import { ConflictError, NotFoundError, ValidationError } from '../../core/errors';
import { normalizeDocument } from '../../lib/documents';
import { hashPassword } from '../../lib/hash';
import { createInvite } from '../auth/auth.service';

export async function getCompanyContext(app: FastifyInstance, companyId: string) {
  const company = await app.prisma.company.findUnique({
    where: { id: companyId },
    include: {
      wallet: true,
    },
  });

  if (!company) throw new NotFoundError('Company não encontrada');
  return company;
}

export async function createCompanyUser(app: FastifyInstance, companyId: string, payload: {
  fullName: string;
  email: string;
  document: string;
  phone: string;
  password: string;
  role: 'COMPANY_MANAGER' | 'USER';
}) {
  const emailExists = await app.prisma.user.findUnique({ where: { email: payload.email } });
  if (emailExists) throw new ConflictError('Já existe um cadastro com este e-mail');

  const document = normalizeDocument(payload.document);
  const documentExists = await app.prisma.user.findUnique({ where: { document } });
  if (documentExists) throw new ConflictError('Já existe um cadastro com este documento');

  return app.prisma.user.create({
    data: {
      companyId,
      fullName: payload.fullName,
      email: payload.email,
      document,
      phone: payload.phone,
      passwordHash: await hashPassword(payload.password),
      role: payload.role,
    },
  });
}

export async function inviteCompanyUser(app: FastifyInstance, companyId: string, actorUserId: string, payload: {
  email: string;
  role: 'COMPANY_MANAGER' | 'USER';
  metadata?: Record<string, unknown>;
}) {
  return createInvite(app, {
    type: 'USER',
    email: payload.email,
    companyId,
    invitedByUserId: actorUserId,
    roleToAssign: payload.role as Role,
    metadata: payload.metadata as any,
  });
}

export function assertCompanyAccess(requestCompanyId: string | null | undefined, actorCompanyId: string | null | undefined) {
  if (!requestCompanyId || !actorCompanyId || requestCompanyId !== actorCompanyId) {
    throw new ValidationError('Acesso inválido para esta company');
  }
}
