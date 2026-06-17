import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== RAW SAMPLERESPONSE DO PRODUTO 1079 ===');
  const product = await prisma.providerProduct.findFirst({
    where: {
      OR: [
        { code: '1079' },
        { id: '1079' },
        { name: { contains: '1079' } },
        { name: { contains: 'COMPLETA BRASIL' } }
      ]
    }
  });

  if (!product) {
    console.log('Produto não encontrado!');
    return;
  }

  console.log(JSON.stringify(product.sampleResponse, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
