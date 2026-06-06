import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("=== TYPE ITEM FILTERS DOS PRODUTOS ===");
  const products = await prisma.providerProduct.findMany({
    select: {
      code: true,
      name: true,
      typeItemFilters: true,
    }
  });
  console.dir(products, { depth: null });
}

main().finally(() => prisma.$disconnect());
