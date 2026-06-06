import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const product = await prisma.providerProduct.findFirst({
    where: {
      externalId: '1079'
    }
  });
  if (product) {
    const filters = product.typeItemFilters as any;
    console.log("DIVIDAS_SPC:");
    console.log(JSON.stringify(filters?.DIVIDAS_SPC, null, 2));
    console.log("\nDIVIDAS_SERASA:");
    console.log(JSON.stringify(filters?.DIVIDAS_SERASA, null, 2));
  } else {
    console.log("Product 1079 not found");
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
