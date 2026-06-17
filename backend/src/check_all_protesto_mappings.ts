import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== VERIFICANDO TODOS OS PRODUTOS COM MAPPING PARA PROTESTO_CARTORIO ===');
  const mappings = await prisma.providerFieldMapping.findMany({
    where: {
      canonicalField: {
        pathKey: 'PROTESTO_CARTORIO'
      }
    },
    include: {
      product: true,
      canonicalField: true
    }
  });

  console.log('Total de mappings para PROTESTO_CARTORIO:', mappings.length);
  for (const m of mappings) {
    console.log(`Produto ID: ${m.productId}, Produto Nome: ${m.product?.name}`);
    console.log(`  sourcePath: ${m.sourcePath}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
