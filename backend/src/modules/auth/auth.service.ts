import type { FastifyInstance } from 'fastify';
import { Role } from '@prisma/client';
import { ConflictError, NotFoundError, ValidationError } from '../../core/errors';
import { comparePassword, generateOpaqueToken, hashPassword, sha256 } from '../../lib/hash';
import { normalizeDocument } from '../../lib/documents';
import { slugify } from '../../lib/slug';
import { env } from '../../config/env';

export async function login(app: FastifyInstance, email: string, password: string) {
  const user = await app.prisma.user.findUnique({
    where: { email },
    include: { company: true },
  });

  if (!user || !user.isActive) {
    throw new ValidationError('Credenciais inválidas');
  }

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) {
    throw new ValidationError('Credenciais inválidas');
  }

  await app.prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const token = await app.jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
      tenantId: user.company?.tenantId ?? null,
    },
    { expiresIn: env.JWT_EXPIRES_IN },
  );

  return {
    accessToken: token,
    user: sanitizeUser(user),
  };
}

export async function registerStandaloneUser(app: FastifyInstance, payload: {
  fullName: string;
  email: string;
  document: string;
  phone: string;
  password: string;
}) {
  const emailInUse = await app.prisma.user.findUnique({ where: { email: payload.email } });
  if (emailInUse) throw new ConflictError('Já existe um cadastro com este e-mail');

  const document = normalizeDocument(payload.document);
  const documentInUse = await app.prisma.user.findUnique({ where: { document } });
  if (documentInUse) throw new ConflictError('Já existe um cadastro com este documento');

  const user = await app.prisma.user.create({
    data: {
      fullName: payload.fullName,
      email: payload.email,
      document,
      phone: payload.phone,
      passwordHash: await hashPassword(payload.password),
      role: Role.USER,
    },
  });

  return sanitizeUser(user);
}

export async function registerCompanyOwner(app: FastifyInstance, payload: {
  companyName: string;
  companyDocument: string;
  companyEmail?: string;
  companyPhone?: string;
  ownerFullName: string;
  ownerEmail: string;
  ownerDocument: string;
  ownerPhone: string;
  password: string;
  tenantSlug?: string;
}) {
  const ownerEmailExists = await app.prisma.user.findUnique({ where: { email: payload.ownerEmail } });
  if (ownerEmailExists) throw new ConflictError('Já existe um cadastro com este e-mail');

  const ownerDocument = normalizeDocument(payload.ownerDocument);
  const ownerDocumentExists = await app.prisma.user.findUnique({ where: { document: ownerDocument } });
  if (ownerDocumentExists) throw new ConflictError('Já existe um cadastro com este documento');

  const companyDocument = normalizeDocument(payload.companyDocument);
  const companyDocumentExists = await app.prisma.company.findUnique({ where: { document: companyDocument } });
  if (companyDocumentExists) throw new ConflictError('Já existe uma company com este documento');

  const tenant = payload.tenantSlug
    ? await app.prisma.tenant.findUnique({ where: { slug: payload.tenantSlug } })
    : null;

  const slugBase = slugify(payload.companyName);
  const slug = await ensureUniqueCompanySlug(app, slugBase);

  const company = await app.prisma.company.create({
    data: {
      tenantId: tenant?.id,
      name: payload.companyName,
      slug,
      document: companyDocument,
      email: payload.companyEmail,
      phone: payload.companyPhone,
      wallet: {
        create: {
          balance: 0,
        },
      },
      users: {
        create: {
          fullName: payload.ownerFullName,
          email: payload.ownerEmail,
          document: ownerDocument,
          phone: payload.ownerPhone,
          role: Role.COMPANY_OWNER,
          passwordHash: await hashPassword(payload.password),
        },
      },
    },
    include: {
      users: true,
      wallet: true,
    },
  });

  return {
    company: {
      id: company.id,
      name: company.name,
      slug: company.slug,
      document: company.document,
      walletBalance: company.wallet?.balance ?? 0,
    },
    owner: sanitizeUser(company.users[0]!),
  };
}

export async function acceptInvite(app: FastifyInstance, payload: {
  token: string;
  fullName?: string;
  email?: string;
  document?: string;
  phone?: string;
  password: string;
  companyName?: string;
  companyDocument?: string;
  companyPhone?: string;
}) {
  const tokenHash = sha256(payload.token);

  const invite = await app.prisma.invite.findUnique({
    where: { tokenHash },
    include: { company: true },
  });

  if (!invite || invite.status !== 'PENDING' || invite.expiresAt < new Date()) {
    throw new NotFoundError('Convite inválido ou expirado');
  }

  if (invite.type === 'USER') {
    if (!invite.companyId) throw new ValidationError('Convite de usuário sem company vinculada');
    if (!payload.fullName || !payload.document || !payload.phone) {
      throw new ValidationError('Dados obrigatórios ausentes para aceite do convite');
    }

    const email = payload.email ?? invite.email;
    const existingEmail = await app.prisma.user.findUnique({ where: { email } });
    if (existingEmail) throw new ConflictError('Já existe um cadastro com este e-mail');

    const document = normalizeDocument(payload.document);
    const existingDocument = await app.prisma.user.findUnique({ where: { document } });
    if (existingDocument) throw new ConflictError('Já existe um cadastro com este documento');

    const user = await app.prisma.user.create({
      data: {
        companyId: invite.companyId,
        fullName: payload.fullName,
        email,
        document,
        phone: payload.phone,
        passwordHash: await hashPassword(payload.password),
        role: invite.roleToAssign ?? Role.USER,
      },
    });

    await app.prisma.invite.update({
      where: { id: invite.id },
      data: {
        status: 'ACCEPTED',
        acceptedAt: new Date(),
      },
    });

    return { type: 'USER', user: sanitizeUser(user) };
  }

  if (!payload.companyName || !payload.companyDocument || !payload.fullName || !payload.document || !payload.phone) {
    throw new ValidationError('Dados obrigatórios ausentes para cadastro da company');
  }

  const existingCompanyDocument = await app.prisma.company.findUnique({
    where: { document: normalizeDocument(payload.companyDocument) },
  });
  if (existingCompanyDocument) throw new ConflictError('Já existe uma company com este documento');

  const ownerEmail = payload.email ?? invite.email;
  const existingEmail = await app.prisma.user.findUnique({ where: { email: ownerEmail } });
  if (existingEmail) throw new ConflictError('Já existe um cadastro com este e-mail');

  const ownerDocument = normalizeDocument(payload.document);
  const existingOwnerDocument = await app.prisma.user.findUnique({ where: { document: ownerDocument } });
  if (existingOwnerDocument) throw new ConflictError('Já existe um cadastro com este documento');

  const slug = await ensureUniqueCompanySlug(app, slugify(payload.companyName));

  const company = await app.prisma.company.create({
    data: {
      name: payload.companyName,
      slug,
      document: normalizeDocument(payload.companyDocument),
      phone: payload.companyPhone,
      wallet: { create: { balance: 0 } },
      users: {
        create: {
          fullName: payload.fullName,
          email: ownerEmail,
          document: ownerDocument,
          phone: payload.phone,
          passwordHash: await hashPassword(payload.password),
          role: Role.COMPANY_OWNER,
        },
      },
    },
    include: { users: true },
  });

  await app.prisma.invite.update({
    where: { id: invite.id },
    data: {
      status: 'ACCEPTED',
      acceptedAt: new Date(),
    },
  });

  return {
    type: 'COMPANY',
    company: {
      id: company.id,
      name: company.name,
      slug: company.slug,
      document: company.document,
    },
    owner: sanitizeUser(company.users[0]!),
  };
}

export async function createInvite(app: FastifyInstance, data: {
  type: 'USER' | 'COMPANY';
  email: string;
  companyId?: string;
  roleToAssign?: Role;
  invitedByUserId?: string;
  metadata?: Record<string, unknown>;
}) {
  const rawToken = generateOpaqueToken(24);

  const invite = await app.prisma.invite.create({
    data: {
      type: data.type,
      email: data.email,
      companyId: data.companyId,
      roleToAssign: data.roleToAssign,
      invitedByUserId: data.invitedByUserId,
      tokenHash: sha256(rawToken),
      expiresAt: new Date(Date.now() + env.DEFAULT_INVITE_EXPIRATION_HOURS * 60 * 60 * 1000),
      metadata: data.metadata,
    },
  });

  return {
    inviteId: invite.id,
    token: rawToken,
    expiresAt: invite.expiresAt,
  };
}

export function sanitizeUser<T extends {
  id: string;
  fullName: string;
  email: string;
  document: string | null;
  phone: string | null;
  role: Role;
  companyId?: string | null;
  isActive?: boolean;
  lastLoginAt?: Date | null;
  createdAt?: Date;
}>(user: T) {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    document: user.document,
    phone: user.phone,
    role: user.role,
    companyId: user.companyId ?? null,
    isActive: user.isActive ?? true,
    lastLoginAt: user.lastLoginAt ?? null,
    createdAt: user.createdAt ?? null,
  };
}

async function ensureUniqueCompanySlug(app: FastifyInstance, baseSlug: string) {
  let candidate = baseSlug;
  let index = 1;

  while (await app.prisma.company.findUnique({ where: { slug: candidate } })) {
    index += 1;
    candidate = `${baseSlug}-${index}`;
  }

  return candidate;
}
