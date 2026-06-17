import type { FastifyInstance } from 'fastify';
import { Prisma, SubscriptionStatus } from '@prisma/client';
import { authenticate, requireRoles } from '../../core/auth';
import { NotFoundError, ForbiddenError, BadRequestError } from '../../core/errors';
import { ok } from '../../core/http';
import { z } from 'zod';

// Seed automático de planos na inicialização para garantir consistência
async function seedDefaultPlans(app: FastifyInstance) {
  const defaultPlans = [
    {
      slug: 'individual-free',
      name: 'Individual (Grátis)',
      price: 0.00,
      userLimit: 1,
      extraUserPrice: 0.00,
      extraUserBlock: 0,
      allowWhiteLabel: false,
      description: 'Ideal para profissionais autônomos. Faça recargas por conta própria e realize consultas livremente.',
    },
    {
      slug: 'company-premium',
      name: 'Empresa (Premium)',
      price: 599.90,
      userLimit: 500,
      extraUserPrice: 99.90,
      extraUserBlock: 100,
      allowWhiteLabel: true,
      description: 'Gestão completa de equipe. Inclui até 500 usuários. Apenas R$ 99,90 adicionais a cada 100 novos usuários.',
    },
    {
      slug: 'partner-enterprise',
      name: 'Parceiro (Enterprise)',
      price: 0.00, // Orçamento personalizado
      userLimit: 0, // Ilimitado ou negociado
      extraUserPrice: 0.00,
      extraUserBlock: 0,
      allowWhiteLabel: true,
      description: 'Acesso nível Enterprise de alta escala. Suporte total a sandboxes multi-tenant, templates e white-label.',
    },
  ];

  for (const plan of defaultPlans) {
    await app.prisma.plan.upsert({
      where: { slug: plan.slug },
      update: {
        name: plan.name,
        price: new Prisma.Decimal(plan.price),
        userLimit: plan.userLimit,
        extraUserPrice: new Prisma.Decimal(plan.extraUserPrice),
        extraUserBlock: plan.extraUserBlock,
        allowWhiteLabel: plan.allowWhiteLabel,
        description: plan.description,
      },
      create: {
        slug: plan.slug,
        name: plan.name,
        price: new Prisma.Decimal(plan.price),
        userLimit: plan.userLimit,
        extraUserPrice: new Prisma.Decimal(plan.extraUserPrice),
        extraUserBlock: plan.extraUserBlock,
        allowWhiteLabel: plan.allowWhiteLabel,
        description: plan.description,
      },
    });
  }
}

export async function registerPlansRoutes(app: FastifyInstance) {
  // Executa o seed de planos em segundo plano na inicialização
  seedDefaultPlans(app).catch((err) => {
    app.log.error(err, 'Erro ao semear planos padrões');
  });

  const platformAdminOnly = { preHandler: [authenticate, requireRoles(['PLATFORM_ADMIN'])] };
  const userAuthenticated = { preHandler: [authenticate] };

  // 1. Rota pública para listar planos ativos
  app.get('/plans', async (_request, reply) => {
    const plans = await app.prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { price: 'asc' },
    });
    return ok(reply, plans);
  });

  // 2. Rota pública para registrar leads de contato (Plano Parceiro/Enterprise)
  app.post('/plans/contact', async (request, reply) => {
    const bodySchema = z.object({
      name: z.string().min(2),
      email: z.string().email(),
      phone: z.string().optional(),
      companyName: z.string().optional(),
      message: z.string().optional(),
    });

    const body = bodySchema.parse(request.body);

    const lead = await app.prisma.planContactLead.create({
      data: {
        name: body.name,
        email: body.email,
        phone: body.phone,
        companyName: body.companyName,
        message: body.message,
      },
    });

    return ok(reply, { success: true, leadId: lead.id });
  });

  // 3. Obter assinatura ativa do usuário/empresa logado
  app.get('/subscriptions/me', userAuthenticated, async (request, reply) => {
    const role = request.authUser?.role;
    const userId = request.authUser?.userId;
    const companyId = request.authUser?.companyId;

    let subscription = null;

    if (role === 'PLATFORM_ADMIN' || role === 'CUSTOMER_ADMIN' || role === 'COMPANY_ADMIN') {
      if (companyId) {
        subscription = await app.prisma.subscription.findUnique({
          where: { companyId },
          include: { plan: true },
        });

        // Se a empresa de PLATFORM_ADMIN, CUSTOMER_ADMIN ou COMPANY_ADMIN não possuir assinatura, criamos uma para compatibilidade
        if (!subscription) {
          const defaultPlanSlug = role === 'CUSTOMER_ADMIN' ? 'partner-enterprise' : 'company-premium';
          const defaultPlan = await app.prisma.plan.findUnique({ where: { slug: defaultPlanSlug } });
          
          if (defaultPlan) {
            subscription = await app.prisma.subscription.create({
              data: {
                companyId,
                planId: defaultPlan.id,
                price: defaultPlan.price,
                userLimit: defaultPlan.userLimit,
                extraUserPrice: defaultPlan.extraUserPrice,
                extraUserBlock: defaultPlan.extraUserBlock,
                status: 'ACTIVE',
                currentPeriodStart: new Date(),
                currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 dias
              },
              include: { plan: true },
            });
          }
        }
      }
    } else {
      // Usuário individual comum
      subscription = await app.prisma.subscription.findUnique({
        where: { userId },
        include: { plan: true },
      });

      // Criar de forma automática a assinatura grátis do plano individual se não tiver
      if (!subscription) {
        const freePlan = await app.prisma.plan.findUnique({ where: { slug: 'individual-free' } });
        if (freePlan) {
          subscription = await app.prisma.subscription.create({
            data: {
              userId,
              planId: freePlan.id,
              price: freePlan.price,
              userLimit: freePlan.userLimit,
              extraUserPrice: freePlan.extraUserPrice,
              extraUserBlock: freePlan.extraUserBlock,
              status: 'ACTIVE',
              currentPeriodStart: new Date(),
              currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 ano
            },
            include: { plan: true },
          });
        }
      }
    }

    // Calcula quantidade atual de usuários ativos contra o limite (apenas para empresas)
    let activeUsersCount = 0;
    let extraUsersCost = 0;

    if (companyId) {
      activeUsersCount = await app.prisma.user.count({
        where: { companyId, isActive: true },
      });

      if (subscription && subscription.userLimit > 0 && activeUsersCount > subscription.userLimit) {
        const extraUsers = activeUsersCount - subscription.userLimit;
        const extraBlocks = Math.ceil(extraUsers / (subscription.extraUserBlock || 100));
        extraUsersCost = extraBlocks * Number(subscription.extraUserPrice || 99.90);
      }
    }

    return ok(reply, {
      subscription,
      activeUsersCount,
      extraUsersCost,
      totalExpectedBill: subscription ? Number(subscription.price) + extraUsersCost : 0,
    });
  });

  // 4. Assinar/Trocar de plano
  app.post('/subscriptions/subscribe', userAuthenticated, async (request, reply) => {
    const bodySchema = z.object({
      planSlug: z.string(),
    });

    const { planSlug } = bodySchema.parse(request.body);
    const role = request.authUser?.role;
    const userId = request.authUser?.userId;
    const companyId = request.authUser?.companyId;

    const plan = await app.prisma.plan.findUnique({ where: { slug: planSlug } });
    if (!plan) throw new NotFoundError('Plano não encontrado');

    if (plan.slug === 'partner-enterprise') {
      throw new BadRequestError('Assinaturas do plano Parceiro (Enterprise) devem ser requisitadas via contato comercial');
    }

    let subscription = null;

    if (role === 'PLATFORM_ADMIN' || role === 'CUSTOMER_ADMIN' || role === 'COMPANY_ADMIN') {
      if (!companyId) throw new BadRequestError('Usuário não está vinculado a uma empresa');
      
      subscription = await app.prisma.subscription.upsert({
        where: { companyId },
        update: {
          planId: plan.id,
          price: plan.price,
          userLimit: plan.userLimit,
          extraUserPrice: plan.extraUserPrice,
          extraUserBlock: plan.extraUserBlock,
          status: 'ACTIVE',
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
        create: {
          companyId,
          planId: plan.id,
          price: plan.price,
          userLimit: plan.userLimit,
          extraUserPrice: plan.extraUserPrice,
          extraUserBlock: plan.extraUserBlock,
          status: 'ACTIVE',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
        include: { plan: true },
      });
    } else {
      // Usuário individual
      subscription = await app.prisma.subscription.upsert({
        where: { userId },
        update: {
          planId: plan.id,
          price: plan.price,
          userLimit: plan.userLimit,
          extraUserPrice: plan.extraUserPrice,
          extraUserBlock: plan.extraUserBlock,
          status: 'ACTIVE',
          currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
        create: {
          userId,
          planId: plan.id,
          price: plan.price,
          userLimit: plan.userLimit,
          extraUserPrice: plan.extraUserPrice,
          extraUserBlock: plan.extraUserBlock,
          status: 'ACTIVE',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
        include: { plan: true },
      });
    }

    return ok(reply, { success: true, subscription });
  });

  // ================= ADMIN ENDPOINTS (Master Only) =================

  // 5. Lista todos os planos (Master)
  app.get('/admin/plans', platformAdminOnly, async (_request, reply) => {
    const plans = await app.prisma.plan.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return ok(reply, plans);
  });

  // 6. Atualizar plano (Master)
  app.patch('/admin/plans/:planId', platformAdminOnly, async (request, reply) => {
    const params = request.params as { planId: string };
    const bodySchema = z.object({
      name: z.string().optional(),
      price: z.number().optional(),
      userLimit: z.number().optional(),
      extraUserPrice: z.number().optional(),
      extraUserBlock: z.number().optional(),
      isActive: z.boolean().optional(),
      description: z.string().optional(),
    });

    const body = bodySchema.parse(request.body);
    const existing = await app.prisma.plan.findUnique({ where: { id: params.planId } });
    if (!existing) throw new NotFoundError('Plano não encontrado');

    const data: Prisma.PlanUpdateInput = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.price !== undefined) data.price = new Prisma.Decimal(body.price);
    if (body.userLimit !== undefined) data.userLimit = body.userLimit;
    if (body.extraUserPrice !== undefined) data.extraUserPrice = new Prisma.Decimal(body.extraUserPrice);
    if (body.extraUserBlock !== undefined) data.extraUserBlock = body.extraUserBlock;
    if (body.isActive !== undefined) data.isActive = body.isActive;
    if (body.description !== undefined) data.description = body.description;

    const updated = await app.prisma.plan.update({
      where: { id: params.planId },
      data,
    });

    return ok(reply, updated);
  });

  // 7. Lista Leads de Contato (Master)
  app.get('/admin/plans/leads', platformAdminOnly, async (_request, reply) => {
    const leads = await app.prisma.planContactLead.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return ok(reply, leads);
  });

  // 8. Lista Assinaturas Ativas (Master)
  app.get('/admin/subscriptions', platformAdminOnly, async (_request, reply) => {
    // 8.1 Sincronizar: garantir que TODA empresa no sistema sem assinatura ativa receba uma assinatura company-premium
    const companiesWithoutSub = await app.prisma.company.findMany({
      where: {
        subscription: { is: null }
      }
    });

    if (companiesWithoutSub.length > 0) {
      const defaultCompanyPlan = await app.prisma.plan.findUnique({
        where: { slug: 'company-premium' }
      });

      if (defaultCompanyPlan) {
        for (const company of companiesWithoutSub) {
          await app.prisma.subscription.create({
            data: {
              companyId: company.id,
              planId: defaultCompanyPlan.id,
              price: defaultCompanyPlan.price,
              userLimit: defaultCompanyPlan.userLimit,
              extraUserPrice: defaultCompanyPlan.extraUserPrice,
              extraUserBlock: defaultCompanyPlan.extraUserBlock,
              status: 'ACTIVE',
              currentPeriodStart: company.createdAt,
              currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 dias a partir de hoje
            }
          });
        }
      }
    }

    const subscriptions = await app.prisma.subscription.findMany({
      include: {
        plan: true,
        company: {
          include: {
            _count: { select: { users: true } },
          },
        },
        user: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calcula dados dinâmicos de faturamento extra para cada assinatura de empresa
    const formattedSubscriptions = subscriptions.map((sub) => {
      let activeUsers = 0;
      let extraCost = 0;

      if (sub.company) {
        activeUsers = sub.company._count.users;
        if (sub.userLimit > 0 && activeUsers > sub.userLimit) {
          const extraUsers = activeUsers - sub.userLimit;
          const extraBlocks = Math.ceil(extraUsers / (sub.extraUserBlock || 100));
          extraCost = extraBlocks * Number(sub.extraUserPrice || 99.90);
        }
      }

      return {
        ...sub,
        activeUsersCount: activeUsers,
        extraUsersCost: extraCost,
        totalExpectedBill: Number(sub.price) + extraCost,
      };
    });

    return ok(reply, formattedSubscriptions);
  });

  // 9. Forçar/Vincular Assinatura Manual (Master)
  app.post('/admin/companies/:companyId/subscription', platformAdminOnly, async (request, reply) => {
    const params = request.params as { companyId: string };
    const bodySchema = z.object({
      planId: z.string(),
      status: z.nativeEnum(SubscriptionStatus).optional(),
      currentPeriodEnd: z.string().optional(),
    });

    const { planId, status, currentPeriodEnd } = bodySchema.parse(request.body);

    const plan = await app.prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) throw new NotFoundError('Plano não encontrado');

    const company = await app.prisma.company.findUnique({ where: { id: params.companyId } });
    if (!company) throw new NotFoundError('Empresa não encontrada');

    const subscription = await app.prisma.subscription.upsert({
      where: { companyId: params.companyId },
      update: {
        planId: plan.id,
        price: plan.price,
        userLimit: plan.userLimit,
        extraUserPrice: plan.extraUserPrice,
        extraUserBlock: plan.extraUserBlock,
        status: status ?? 'ACTIVE',
        currentPeriodEnd: currentPeriodEnd ? new Date(currentPeriodEnd) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      create: {
        companyId: params.companyId,
        planId: plan.id,
        price: plan.price,
        userLimit: plan.userLimit,
        extraUserPrice: plan.extraUserPrice,
        extraUserBlock: plan.extraUserBlock,
        status: status ?? 'ACTIVE',
        currentPeriodStart: new Date(),
        currentPeriodEnd: currentPeriodEnd ? new Date(currentPeriodEnd) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    return ok(reply, subscription);
  });
}
