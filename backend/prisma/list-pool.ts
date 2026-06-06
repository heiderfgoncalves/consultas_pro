import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const items = await prisma.templateMvpTestPool.findMany({});
  console.log(`Total items in pool: ${items.length}`);
  for (const it of items) {
    console.log(`- ID: ${it.id}, Document: ${it.document}, SourceFile: ${it.sourceFile}, Payload length: ${it.payload ? JSON.stringify(it.payload).length : 0}`);
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
