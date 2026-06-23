import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("=== INSPECIONANDO ELEMENTOS DO TEMPLATE IMPORT_TEST_1 ===");
  const template = await prisma.template.findUnique({
    where: { id: 'cmpuh6oue0000u6omv22c0fjb' }
  });

  if (!template || !template.layout) {
    console.log("Template Import_test_1 não encontrado ou sem layout.");
    return;
  }

  const layoutObj: any = template.layout;
  if (layoutObj.elements && Array.isArray(layoutObj.elements)) {
    console.log(`Total de elementos: ${layoutObj.elements.length}`);
    
    // Procura por elementos que contêm referências a score ou a cor #ef4444
    for (const el of layoutObj.elements) {
      const elStr = JSON.stringify(el);
      if (elStr.includes('SCORE_CREDITO') || elStr.includes('round(avg') || elStr.includes('#ef4444')) {
        console.log(`\n[!] Encontrado elemento suspeito:`);
        console.log(`ID: ${el.id}`);
        console.log(`Tipo: ${el.type}`);
        // Imprime todas as chaves do elemento
        console.log(`Chaves: ${Object.keys(el).join(', ')}`);
        // Imprime o conteúdo em formato formatado
        console.log(`Conteúdo do Elemento:`);
        console.log(JSON.stringify(el, null, 2));
      }
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
