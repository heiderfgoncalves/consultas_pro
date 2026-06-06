import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const fields = await prisma.canonicalFieldCatalog.findMany();
  console.log("Canonical Fields:");
  for (const f of fields) {
    console.log(`ID: ${f.id}, PathKey: ${f.pathKey}, Label: ${f.label}, DataType: ${f.dataType}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
