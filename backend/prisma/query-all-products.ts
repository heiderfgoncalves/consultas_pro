import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const products = await prisma.providerProduct.findMany({
    orderBy: { updatedAt: 'desc' }
  });

  for (const p of products) {
    console.log(`\n========================================`);
    console.log(`Product ID: ${p.id}, Code: ${p.code}, Name: ${p.name}`);
    console.log('typeItemFilters:', JSON.stringify(p.typeItemFilters, null, 2));
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
