import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== BUSCANDO JSON DE TAMANHO 15588 ===');
  
  // 1. Verificar todos os produtos
  const products = await prisma.providerProduct.findMany();
  for (const p of products) {
    if (p.sampleResponse) {
      const formatted = JSON.stringify(p.sampleResponse, null, 2);
      const compact = JSON.stringify(p.sampleResponse);
      console.log(`Produto ID: ${p.id}, Nome: ${p.name}`);
      console.log(`  Tamanho compactado: ${compact.length}`);
      console.log(`  Tamanho formatado (null, 2): ${formatted.length}`);
    }
  }

  // 2. Verificar logs de teste
  const testLogs = await prisma.providerTestLog.findMany({
    include: { product: true }
  });
  console.log('\nTotal de logs de teste:', testLogs.length);
  for (const log of testLogs) {
    if (log.responsePayload) {
      const formatted = JSON.stringify(log.responsePayload, null, 2);
      const compact = JSON.stringify(log.responsePayload);
      if (formatted.length === 15588 || compact.length === 15588) {
        console.log(`** ENCONTRADO LOG DE TESTE **`);
        console.log(`Log ID: ${log.id}, Produto: ${log.product?.name}`);
        console.log(`  Tamanho compactado: ${compact.length}`);
        console.log(`  Tamanho formatado: ${formatted.length}`);
        console.log(`  Sucesso: ${log.success}, Criado em: ${log.createdAt}`);
      }
    }
  }

  // 3. Verificar pool de testes MVP
  const pool = await prisma.templateMvpTestPool.findMany({
    include: { providerProduct: true }
  });
  console.log('\nTotal de itens no pool MVP:', pool.length);
  for (const item of pool) {
    if (item.payload) {
      const formatted = JSON.stringify(item.payload, null, 2);
      const compact = JSON.stringify(item.payload);
      if (formatted.length === 15588 || compact.length === 15588) {
        console.log(`** ENCONTRADO ITEM NO POOL MVP **`);
        console.log(`Pool ID: ${item.id}, Produto: ${item.providerProduct?.name}`);
        console.log(`  Tamanho compactado: ${compact.length}`);
        console.log(`  Tamanho formatado: ${formatted.length}`);
      }
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
