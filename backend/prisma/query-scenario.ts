import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const items = await prisma.templateMvpTestPool.findMany({
    where: {
      document: {
        contains: '153423',
      },
    },
  });

  if (items.length > 0) {
    for (const item of items) {
      console.log('Found item:', item.id, 'Document:', item.document, 'Payload null?', item.payload == null);
      if (item.payload) {
        console.log(JSON.stringify(item.payload, null, 2).slice(0, 1000));
      }
    }
  } else {
    const items = await prisma.templateMvpTestPool.findMany({
      take: 10,
    });
    console.log('Available documents:');
    for (const it of items) {
      console.log(`- Document: ${it.document}, SourceFile: ${it.sourceFile}`);
    }
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
