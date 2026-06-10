import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../core/auth';
import { ok } from '../../core/http';
import { createTemplateSchema, updateTemplateLayoutSchema } from './templates.schemas';

export async function registerTemplateRoutes(app: FastifyInstance) {
  app.get('/templates', { preHandler: [authenticate] }, async (request, reply) => {
    const companyId = request.authUser?.companyId;
    const userId = request.authUser!.userId;
    const role = request.authUser!.role;

    let filters: any[] = [];

    if (role === 'PLATFORM_ADMIN') {
      // Platform Admin visualiza todos os templates (sem restrições)
    } else {
      // 1. Carrega as restrições da empresa (se houver)
      const company = companyId ? await app.prisma.company.findUnique({ where: { id: companyId } }) : null;
      const allowedGlobalIds = company?.metadata && typeof company.metadata === 'object'
        ? (company.metadata as any).allowedGlobalTemplates as string[] | undefined
        : undefined;

      if (role === 'COMPANY_OWNER' || role === 'COMPANY_MANAGER') {
        // Admins da empresa visualizam templates privados, da empresa e globais permitidos
        filters.push({ visibility: 'PRIVATE', userId });
        if (companyId) {
          filters.push({ visibility: 'COMPANY', companyId });
        }

        const globalFilter: any = { visibility: 'GLOBAL' };
        if (allowedGlobalIds) {
          globalFilter.OR = [
            { id: { in: allowedGlobalIds } },
            { name: { mode: 'insensitive', equals: 'Default' } }
          ];
        }
        filters.push(globalFilter);
      } else {
        // Usuário comum (USER)
        // 2. Carrega as restrições do usuário (se houver)
        const user = await app.prisma.user.findUnique({ where: { id: userId } });
        const allowedUserTemplateIds = user?.metadata && typeof user.metadata === 'object'
          ? (user.metadata as any).allowedTemplates as string[] | undefined
          : undefined;

        filters.push({ visibility: 'PRIVATE', userId });

        if (allowedUserTemplateIds) {
          // Se o admin explicitamente delegou quais templates este usuário pode ver:
          filters.push({
            id: { in: allowedUserTemplateIds },
            OR: [
              ...(companyId ? [{ visibility: 'COMPANY', companyId }] : []),
              { visibility: 'GLOBAL' }
            ]
          });
          // Sempre inclui templates globais chamados "Default" como segurança
          filters.push({
            visibility: 'GLOBAL',
            name: { mode: 'insensitive', equals: 'Default' }
          });
        } else {
          // Se não há delegação explícita, o usuário vê os templates da empresa e os globais autorizados para a empresa
          if (companyId) {
            filters.push({ visibility: 'COMPANY', companyId });
          }
          const globalFilter: any = { visibility: 'GLOBAL' };
          if (allowedGlobalIds) {
            globalFilter.OR = [
              { id: { in: allowedGlobalIds } },
              { name: { mode: 'insensitive', equals: 'Default' } }
            ];
          }
          filters.push(globalFilter);
        }
      }
    }

    const templates = await app.prisma.template.findMany({
      where: filters.length > 0 ? { OR: filters } : {},
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
          include: {
            providerProduct: {
              include: { provider: true, consultationType: true },
            },
          },
        },
      },
      orderBy: [{ isFavorite: 'desc' }, { updatedAt: 'desc' }],
    });

    return ok(reply, templates);
  });

  app.post('/templates', { preHandler: [authenticate] }, async (request, reply) => {
    const payload = createTemplateSchema.parse(request.body);

    const template = await app.prisma.template.create({
      data: {
        companyId: payload.visibility === 'COMPANY' ? request.authUser?.companyId ?? null : null,
        userId: payload.visibility === 'PRIVATE' ? request.authUser!.userId : null,
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

    return ok(reply, template, 201);
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
