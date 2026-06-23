const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const fields = await prisma.canonicalFieldCatalog.findMany({
    select: {
      id: true,
      pathKey: true,
      label: true,
      dataType: true,
      isActive: true,
      reportFieldConfig: true
    }
  });
  console.log(JSON.stringify(fields, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
