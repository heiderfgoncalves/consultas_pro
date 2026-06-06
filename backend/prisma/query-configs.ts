import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const spc = await prisma.canonicalFieldCatalog.findFirst({
    where: {
      pathKey: 'DIVIDAS_SPC'
    }
  });
  console.log("DIVIDAS_SPC config:");
  console.log(JSON.stringify(spc?.reportFieldConfig, null, 2));

  const serasa = await prisma.canonicalFieldCatalog.findFirst({
    where: {
      pathKey: 'DIVIDAS_SERASA'
    }
  });
  console.log("\nDIVIDAS_SERASA config:");
  console.log(JSON.stringify(serasa?.reportFieldConfig, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
