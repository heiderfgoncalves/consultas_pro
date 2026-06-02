import type { FastifyInstance } from 'fastify';
import { Role } from '@prisma/client';
import { authenticate, requireRoles } from '../../core/auth';
import { NotFoundError } from '../../core/errors';
import { ok, fail } from '../../core/http';
import { createCustomBlockSchema, updateCustomBlockSchema } from './custom-blocks.schemas';
import { validateTemplate } from '../../lib/expression-validator';

const customBlocksAdmin = {
  preHandler: [authenticate, requireRoles([Role.PLATFORM_ADMIN])],
};

export async function registerCustomBlockRoutes(app: FastifyInstance) {
  app.get('/admin/custom-blocks', customBlocksAdmin, async (request, reply) => {
    const { tenantId } = request.authUser!;
    const blocks = await app.prisma.customBlock.findMany({
      where: tenantId ? { tenantId } : undefined,
      orderBy: { createdAt: 'desc' },
    });
    return ok(reply, blocks);
  });

  app.post('/admin/custom-blocks', customBlocksAdmin, async (request, reply) => {
    const { tenantId } = request.authUser!;
    const body = createCustomBlockSchema.parse(request.body);

    const validation = validateTemplate(body.template);
    if (!validation.valid) {
      return fail(reply, 400, 'INVALID_TEMPLATE', 'Template contém expressões inválidas', validation.errors);
    }

    if (!tenantId) {
      return fail(reply, 400, 'MISSING_TENANT', 'Tenant não encontrado para o usuário');
    }

    const block = await app.prisma.customBlock.create({
      data: {
        tenantId,
        name: body.name,
        description: body.description,
        category: body.category,
        template: body.template,
        skeleton: body.skeleton,
        variables: validation.variables,
      },
    });

    return ok(reply, block, 201);
  });

  app.patch('/admin/custom-blocks/:id', customBlocksAdmin, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = updateCustomBlockSchema.parse(request.body);

    const existing = await app.prisma.customBlock.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Bloco customizado não encontrado');

    const templateToValidate = body.template ?? existing.template;
    const validation = validateTemplate(templateToValidate);
    if (!validation.valid) {
      return fail(reply, 400, 'INVALID_TEMPLATE', 'Template contém expressões inválidas', validation.errors);
    }

    const block = await app.prisma.customBlock.update({
      where: { id },
      data: {
        ...body,
        variables: validation.variables,
      },
    });

    return ok(reply, block);
  });

  app.delete('/admin/custom-blocks/:id', customBlocksAdmin, async (request, reply) => {
    const { id } = request.params as { id: string };

    const existing = await app.prisma.customBlock.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Bloco customizado não encontrado');
    if (existing.isSystem) {
      return fail(reply, 400, 'SYSTEM_BLOCK', 'Blocos de sistema não podem ser removidos');
    }

    await app.prisma.customBlock.delete({ where: { id } });
    return ok(reply, { deleted: true });
  });
}
