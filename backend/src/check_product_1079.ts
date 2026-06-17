import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== BUSCANDO PRODUTO COM CÓDIGO OU ID 1079 ===');
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

  const sample: any = product.sampleResponse;
  console.log('Existe sampleResponse?', !!sample);
  if (sample) {
    const cred = sample.CREDCADASTRAL || {};
    const prot = cred.PROTESTO_SINTETICO || sample.PROTESTO_SINTETICO || {};
    console.log('Trecho PROTESTO_SINTETICO no sampleResponse do banco:');
    console.log(JSON.stringify(prot, null, 2));
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
