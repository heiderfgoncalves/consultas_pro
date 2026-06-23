import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const wallets = await prisma.wallet.findMany({
    include: {
      company: true
    }
  });
  console.log("=== WALLETS NO BANCO ===");
  console.dir(wallets, { depth: null });
}

main().catch(console.error).finally(() => prisma.$disconnect());
