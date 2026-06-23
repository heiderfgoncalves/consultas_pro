import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const providers = await prisma.provider.findMany({
    include: {
      operations: true,
      products: true,
    }
  });
  console.log(JSON.stringify(providers, null, 2));
}

main().finally(() => prisma.$disconnect());
