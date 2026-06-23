import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const mappings = await prisma.providerFieldMapping.findMany({
    where: {
      providerProduct: {
        code: 'RADAR_PRONAMPE_PJ'
      }
    },
    include: {
      providerProduct: true
    }
  });

  console.log('=== MAPEAMENTOS DO PRODUTOR RADAR_PRONAMPE_PJ ===');
  for (const m of mappings) {
    console.log(`ID: ${m.id} | SourcePath: ${m.sourcePath} | PathKey: ${m.pathKey}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
