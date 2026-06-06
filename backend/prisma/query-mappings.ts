import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const mappings = await prisma.providerFieldMapping.findMany({
    where: {
      product: {
        externalId: '1079'
      }
    },
    include: {
      canonicalField: true
    }
  });

  console.log("Mappings for product 1079:");
  for (const m of mappings) {
    console.log(`Mapping ID: ${m.id}`);
    console.log(`Source Path: ${m.sourcePath}`);
    console.log(`Canonical PathKey: ${m.canonicalField.pathKey}`);
    console.log(`Sort Order: ${m.sortOrder}`);
    console.log("-----------------------");
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
