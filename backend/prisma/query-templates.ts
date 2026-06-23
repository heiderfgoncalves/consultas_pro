import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== LISTANDO TEMPLATES ===');
  const templates = await prisma.template.findMany({
    include: {
      items: {
        include: {
          providerProduct: true
        }
      }
    }
  });

  for (const t of templates) {
    console.log(`\nTemplate ID: ${t.id}`);
    console.log(`Nome: ${t.name}`);
    console.log(`Descrição: ${t.description}`);
    console.log(`Items associados:`);
    for (const item of t.items) {
      console.log(`  - Produto ID: ${item.providerProduct.id} | Code: ${item.providerProduct.code} | Nome: ${item.providerProduct.name}`);
    }
  }

  console.log('\n=== LISTANDO PRODUTOS DO PRONAMPE ===');
  const products = await prisma.providerProduct.findMany({
    where: {
      OR: [
        { name: { contains: 'PRONAMPE', mode: 'insensitive' } },
        { code: { contains: 'PRONAMPE', mode: 'insensitive' } }
      ]
    }
  });

  for (const p of products) {
    console.log(`Produto ID: ${p.id} | Code: ${p.code} | Nome: ${p.name}`);
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
