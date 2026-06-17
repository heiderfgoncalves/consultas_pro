import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== DETALHES DO PRODUTO 1079 ===');
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

  console.log('Produto ID:', product.id);
  console.log('Produto Nome:', product.name);
  console.log('Filtros (typeItemFilters):', JSON.stringify(product.typeItemFilters, null, 2));
  console.log('\nMappings cadastrados:');
  for (const m of product.mappings) {
    console.log(`- Campo Canônico: ${m.canonicalField?.pathKey} (${m.canonicalField?.label})`);
    console.log(`  sourcePath: ${m.sourcePath}`);
    console.log(`  ID Canônico: ${m.canonicalFieldId}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
