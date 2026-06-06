import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const products = await prisma.providerProduct.findMany({
    where: {
      name: {
        contains: 'COMPLETA BRASIL',
      },
    },
  });

  for (const p of products) {
    console.log(`Product ID: ${p.id}, Code: ${p.code}, Name: ${p.name}`);
    console.log('typeItemFilters:', JSON.stringify(p.typeItemFilters, null, 2));
    if (p.sampleResponse) {
      console.log('sampleResponse length:', String(p.sampleResponse).length);
      // Save it to a file so we can view it
      require('fs').writeFileSync('sample-response.json', JSON.stringify(p.sampleResponse, null, 2));
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
