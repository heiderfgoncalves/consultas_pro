import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../core/auth';
import { ok } from '../../core/http';
import { createTemplateSchema, updateTemplateLayoutSchema } from './templates.schemas';

type TemplateAccessAuth = {
  companyId?: string | null;
  userId: string;
  role: string;
};

async function buildTemplateAccessFilters(
  app: FastifyInstance,
  auth: TemplateAccessAuth,
) {
  const { companyId, userId, role } = auth;
  const filters: any[] = [];

  if (role === 'PLATFORM_ADMIN') {
    return filters;
  }

  if (role === 'CUSTOMER_ADMIN') {
    filters.push({ userId });
    if (companyId) {
      filters.push({ companyId });
    }
    filters.push({
      visibility: 'GLOBAL',
      OR: [
        { userId: null },
        { user: { role: 'PLATFORM_ADMIN' } },
      ],
    });
    return filters;
  }

  const company = companyId
    ? await app.prisma.company.findUnique({ where: { id: companyId } })
    : null;
  const allowedGlobalIds =
    company?.metadata && typeof company.metadata === 'object'
      ? ((company.metadata as any).allowedGlobalTemplates as string[] | undefined)
      : undefined;
  const partnerId =
    company?.metadata && typeof company.metadata === 'object'
      ? ((company.metadata as any).partnerId as string | undefined)
      : undefined;

  filters.push({ visibility: 'PRIVATE', userId });
  if (companyId) {
    filters.push({ visibility: 'COMPANY', companyId });
  }

  const globalOrConditions: any[] = [
    { userId: null },
    { user: { role: 'PLATFORM_ADMIN' } },
  ];

  if (partnerId) {
    globalOrConditions.push({ userId: partnerId });
    const partnerUser = await app.prisma.user.findUnique({
      where: { id: partnerId },
    });
    if (partnerUser?.companyId) {
      filters.push({ visibility: 'COMPANY', companyId: partnerUser.companyId });
    }
  }

  const globalFilter: any = {
    visibility: 'GLOBAL',
    OR: globalOrConditions,
  };

  if (allowedGlobalIds) {
    globalFilter.OR = [
      { id: { in: allowedGlobalIds } },
      { name: { mode: 'insensitive', equals: 'Default' } },
    ];
  }

  filters.push(globalFilter);
  return filters;
}

const templateRelations = {
  user: {
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
    },
  },
  company: {
    select: {
      id: true,
      name: true,
    },
  },
  items: {
    orderBy: { sortOrder: 'asc' as const },
    include: {
      providerProduct: {
        include: { provider: true, consultationType: true },
      },
    },
  },
};

export async function registerTemplateRoutes(app: FastifyInstance) {
  app.get('/templates', { preHandler: [authenticate] }, async (request, reply) => {
    const companyId = request.authUser?.companyId;
    const userId = request.authUser!.userId;
    const role = request.authUser!.role;

    const query = request.query as { summary?: string } | undefined;
    const summaryOnly = query?.summary === 'true';
    const filters = await buildTemplateAccessFilters(app, {
      companyId,
      userId,
      role,
    });

    const where = filters.length > 0 ? { OR: filters } : {};
    const orderBy = [{ isFavorite: 'desc' as const }, { updatedAt: 'desc' as const }];
    const templates = summaryOnly
      ? await app.prisma.template.findMany({
          where,
          select: {
            id: true,
            name: true,
            description: true,
            visibility: true,
            isFavorite: true,
            userId: true,
            companyId: true,
            createdAt: true,
            updatedAt: true,
            user: templateRelations.user,
            company: templateRelations.company,
            items: {
              orderBy: { sortOrder: 'asc' },
              select: {
                id: true,
                templateId: true,
                providerProductId: true,
                sortOrder: true,
                alias: true,
              },
            },
          },
          orderBy,
        })
      : await app.prisma.template.findMany({
          where,
          include: templateRelations,
          orderBy,
        });

    // Injeta o campo virtual canEdit para o frontend saber se o usuário pode modificar este template
    const templatesWithPermissions = templates.map((t) => {
      const canEdit =
        role === 'PLATFORM_ADMIN' ||
        (t.userId !== null && t.userId === userId) ||
        (t.companyId !== null && t.companyId === companyId);
      
      return {
        ...t,
        canEdit,
      };
    });

    return ok(reply, templatesWithPermissions);
  });

  app.get('/templates/:templateId', { preHandler: [authenticate] }, async (request, reply) => {
    const params = request.params as { templateId: string };
    const auth = request.authUser!;
    const filters = await buildTemplateAccessFilters(app, auth);
    const template = await app.prisma.template.findFirst({
      where: {
        id: params.templateId,
        ...(filters.length > 0 ? { OR: filters } : {}),
      },
      include: templateRelations,
    });

    if (!template) {
      return reply.code(404).send({
        ok: false,
        error: { code: 'NOT_FOUND', message: 'Template não encontrado' },
      });
    }

    const canEdit =
      auth.role === 'PLATFORM_ADMIN' ||
      (template.userId !== null && template.userId === auth.userId) ||
      (template.companyId !== null && template.companyId === auth.companyId);

    return ok(reply, { ...template, canEdit });
  });

  app.post('/templates', { preHandler: [authenticate] }, async (request, reply) => {
    const payload = createTemplateSchema.parse(request.body);
    const auth = request.authUser!;

    // Apenas Master e Parceiro podem criar novos templates no editor
    if (auth.role !== 'PLATFORM_ADMIN' && auth.role !== 'CUSTOMER_ADMIN') {
      return reply.code(403).send({ ok: false, error: { code: 'FORBIDDEN', message: 'Sem permissão para criar templates' } });
    }

    const template = await app.prisma.template.create({
      data: {
        companyId: payload.visibility === 'COMPANY' ? auth.companyId ?? null : null,
        userId: auth.userId, // Sempre associa o criador para rastreamento
        name: payload.name,
        description: payload.description,
        visibility: payload.visibility,
        isFavorite: payload.isFavorite,
        layout: payload.layout || null,
        logo: payload.logo || null,
        items: {
          createMany: {
            data: payload.items.map((item) => ({
              providerProductId: item.providerProductId,
              sortOrder: item.sortOrder,
              alias: item.alias,
            })),
          },
        },
      },
      include: {
        items: true,
      },
    });

    return ok(reply, { ...template, canEdit: true }, 201);
  });

  app.delete('/templates/:templateId', { preHandler: [authenticate] }, async (request, reply) => {
    const params = request.params as { templateId: string };
    const existing = await app.prisma.template.findUnique({
      where: { id: params.templateId },
    });
    if (!existing) return reply.code(404).send({ ok: false, error: { code: 'NOT_FOUND', message: 'Template não encontrado' } });

    const auth = request.authUser!;
    const canDelete =
      auth.role === 'PLATFORM_ADMIN' ||
      (existing.userId !== null && existing.userId === auth.userId) ||
      (existing.companyId !== null && existing.companyId === auth.companyId);

    if (!canDelete) return reply.code(403).send({ ok: false, error: { code: 'FORBIDDEN', message: 'Sem permissão para deletar este template' } });

    await app.prisma.templateItem.deleteMany({
      where: { templateId: params.templateId },
    });

    await app.prisma.template.delete({
      where: { id: params.templateId },
    });

    return ok(reply, { id: params.templateId });
  });

  app.patch('/templates/:templateId/favorite', { preHandler: [authenticate] }, async (request, reply) => {
    const params = request.params as { templateId: string };
    const body = request.body as { isFavorite: boolean };

    const template = await app.prisma.template.update({
      where: { id: params.templateId },
      data: { isFavorite: body.isFavorite },
    });

    return ok(reply, template);
  });

  app.patch('/templates/:templateId/layout', { preHandler: [authenticate] }, async (request, reply) => {
    const params = request.params as { templateId: string };
    const payload = updateTemplateLayoutSchema.parse(request.body);

    const existing = await app.prisma.template.findUnique({
      where: { id: params.templateId },
      include: { items: true },
    });
    if (!existing) return reply.code(404).send({ ok: false, error: { code: 'NOT_FOUND', message: 'Template não encontrado' } });

    const auth = request.authUser!;
    const canEdit =
      auth.role === 'PLATFORM_ADMIN' ||
      (existing.userId !== null && existing.userId === auth.userId) ||
      (existing.companyId !== null && existing.companyId === auth.companyId);

    if (!canEdit) return reply.code(403).send({ ok: false, error: { code: 'FORBIDDEN', message: 'Sem permissão para editar este template' } });

    const template = await app.prisma.$transaction(async (tx) => {
      if (payload.items) {
        await tx.templateItem.deleteMany({ where: { templateId: params.templateId } });
        if (payload.items.length > 0) {
          await tx.templateItem.createMany({
            data: payload.items.map((item) => ({
              templateId: params.templateId,
              providerProductId: item.providerProductId,
              sortOrder: item.sortOrder,
              alias: item.alias,
            })),
            skipDuplicates: true,
          });
        }
      }

      return tx.template.update({
        where: { id: params.templateId },
        data: {
          ...(payload.name !== undefined ? { name: payload.name } : {}),
          ...(payload.description !== undefined ? { description: payload.description } : {}),
          ...(payload.visibility !== undefined ? { visibility: payload.visibility } : {}),
          ...(payload.layout !== undefined ? { layout: payload.layout } : {}),
          ...(payload.logo !== undefined ? { logo: payload.logo } : {}),
        },
        include: {
          items: {
            include: {
              providerProduct: {
                include: { provider: true, consultationType: true },
              },
            },
            orderBy: { sortOrder: 'asc' },
          },
        },
      });
    });

    return ok(reply, template);
  });

}
