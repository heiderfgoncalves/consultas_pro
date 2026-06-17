import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== TESTANDO O QUE A QUERY RETORNA DE FATO ===');
  const providers = await prisma.provider.findMany({
    include: {
      operations: { orderBy: { createdAt: 'asc' } },
      products: {
        include: {
          consultationType: true,
          mappings: {
            include: { canonicalField: true },
            orderBy: { sortOrder: 'asc' },
          },
          sessionAssignments: {
            include: { canonicalField: true },
            orderBy: { sortOrder: 'asc' },
          },
        },
        orderBy: { updatedAt: 'desc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const p1079 = providers
    .flatMap((p) => p.products)
    .find((prod) => prod.code === '1079' || prod.id === '1079' || prod.name.includes('COMPLETA BRASIL'));

  if (!p1079) {
    console.log('Produto 1079 não encontrado na listagem de provedores!');
    return;
  }

  console.log('Produto 1079 encontrado na listagem de provedores!');
  console.log('Tamanho de sampleResponse retornado pela query:', JSON.stringify(p1079.sampleResponse).length);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
