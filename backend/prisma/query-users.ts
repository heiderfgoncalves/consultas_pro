import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("=== LISTANDO USUÁRIOS ===");
  const users = await prisma.user.findMany({
    include: {
      company: true
    }
  });

  for (const u of users) {
    console.log(`\nUser ID: ${u.id}`);
    console.log(`Nome: ${u.fullName}`);
    console.log(`Email: ${u.email}`);
    console.log(`Role: ${u.role}`);
    console.log(`Empresa: ${u.company ? u.company.name : 'Nenhuma'} | ID: ${u.companyId}`);
    if (u.company?.metadata) {
      console.log(`Metadata da empresa:`, JSON.stringify(u.company.metadata, null, 2));
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
