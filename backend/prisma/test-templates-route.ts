import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function simulateTemplatesRoute(userEmail: string) {
  const user = await prisma.user.findUnique({
    where: { email: userEmail },
    include: { company: true }
  });

  if (!user) {
    console.log(`Usuário não encontrado para o email: ${userEmail}`);
    return;
  }

  const role = user.role;
  const userId = user.id;
  const companyId = user.companyId;

  console.log(`\n========================================`);
  console.log(`Simulando rota /templates para o usuário: ${user.fullName} (${user.email}) | Role: ${role}`);
  console.log(`========================================`);

  let filters: any[] = [];

  if (role === 'PLATFORM_ADMIN') {
    // Platform Admin visualiza todos os templates (sem restrições)
  } else if (role === 'CUSTOMER_ADMIN') {
    filters.push({ userId });
    if (companyId) {
      filters.push({ companyId });
    }
    filters.push({
      visibility: 'GLOBAL',
      OR: [
        { userId: null },
        { user: { role: 'PLATFORM_ADMIN' } }
      ]
    });
  } else {
    const company = companyId ? await prisma.company.findUnique({ where: { id: companyId } }) : null;
    const allowedGlobalIds = company?.metadata && typeof company.metadata === 'object'
      ? (company.metadata as any).allowedGlobalTemplates as string[] | undefined
      : undefined;

    const partnerId = company?.metadata && typeof company.metadata === 'object'
      ? (company.metadata as any).partnerId as string | undefined
      : undefined;

    filters.push({ visibility: 'PRIVATE', userId });

    if (companyId) {
      filters.push({ visibility: 'COMPANY', companyId });
    }

    const globalOrConditions: any[] = [
      { userId: null },
      { user: { role: 'PLATFORM_ADMIN' } }
    ];

    if (partnerId) {
      globalOrConditions.push({ userId: partnerId });
      const partnerUser = await prisma.user.findUnique({ where: { id: partnerId } });
      if (partnerUser?.companyId) {
        filters.push({ visibility: 'COMPANY', companyId: partnerUser.companyId });
      }
    }

    const globalFilter: any = {
      visibility: 'GLOBAL',
      OR: globalOrConditions
    };

    if (allowedGlobalIds) {
      globalFilter.OR = [
        { id: { in: allowedGlobalIds } },
        { name: { mode: 'insensitive', equals: 'Default' } }
      ];
    }

    filters.push(globalFilter);
  }

  const templates = await prisma.template.findMany({
    where: filters.length > 0 ? { OR: filters } : {},
    include: {
      items: {
        include: {
          providerProduct: true
        }
      }
    }
  });

  console.log(`Total de templates retornados: ${templates.length}`);
  for (const t of templates) {
    console.log(`- Template ID: ${t.id} | Nome: ${t.name} | Visibilidade: ${t.visibility} | userId: ${t.userId}`);
  }
}

async function main() {
  const emails = [
    'admin@consultas.pro',
    'claudio.tomich@consultas.pro',
    'mmvi.consultoria@consultas.pro',
    'marcus.vinicius@consultas.pro'
  ];

  for (const email of emails) {
    await simulateTemplatesRoute(email);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
