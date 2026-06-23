import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const products = await prisma.providerProduct.findMany({
    orderBy: { updatedAt: 'desc' }
  });

  for (const p of products) {
    console.log(`\n========================================`);
    console.log(`ID: ${p.id} | Code: ${p.code} | Name: ${p.name}`);
    console.log('bodyTemplate:', JSON.stringify(p.bodyTemplate, null, 2));
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
