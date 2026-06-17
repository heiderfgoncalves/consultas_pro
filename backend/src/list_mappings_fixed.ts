import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== LISTAGEM DE MAPPINGS CORRETA PARA PRODUTO 1079 ===');
  const product = await prisma.providerProduct.findFirst({
    where: {
      OR: [
        { code: '1079' },
        { id: '1079' },
        { name: { contains: '1079' } },
        { name: { contains: 'COMPLETA BRASIL' } }
      ]
    },
    include: {
      mappings: {
        include: {
          canonicalField: true
        }
      }
    }
  });

  if (!product) {
    console.log('Produto não encontrado!');
    return;
  }

  console.log('Total de Mappings:', product.mappings.length);
  for (const m of product.mappings) {
    console.log(`Mapping ID: ${m.id}`);
    console.log(`  sourcePath: ${m.sourcePath}`);
    console.log(`  canonicalField pathKey: ${m.canonicalField?.pathKey}`);
    console.log(`  canonicalField label: ${m.canonicalField?.label}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
