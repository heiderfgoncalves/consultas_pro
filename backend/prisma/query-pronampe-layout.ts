import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const t = await prisma.template.findUnique({
    where: { id: 'template_pronampe_brasil_cred' }
  });

  if (!t) {
    console.log('Template não encontrado!');
    return;
  }

  console.log('=== DADOS DO TEMPLATE ===');
  console.log(`ID: ${t.id}`);
  console.log(`Nome: ${t.name}`);
  console.log(`Descrição: ${t.description}`);
  console.log(`Visibilidade: ${t.visibility}`);
  
  if (t.layout) {
    const layout = typeof t.layout === 'string' ? JSON.parse(t.layout) : t.layout;
    console.log('\n=== ESTRUTURA DO LAYOUT ===');
    console.log(`ID do Layout: ${layout.id}`);
    console.log(`Nome do Layout: ${layout.name}`);
    console.log(`Elementos (count): ${layout.elements?.length ?? 0}`);
    console.log(`Frames (count): ${layout.frames?.length ?? 0}`);
    
    if (layout.frames) {
      for (const f of layout.frames) {
        console.log(`\nFrame ID: ${f.id}`);
        console.log(`Nome: ${f.name}`);
        console.log(`Tipo: ${f.type}`);
        console.log(`Geometria: ${f.width}x${f.height} em (${f.x}, ${f.y})`);
        console.log(`customHtml definido? ${f.customHtml ? 'SIM' : 'NÃO'}`);
        if (f.customHtml) {
          console.log(`customHtml comprimento: ${f.customHtml.length}`);
          console.log(`customHtml início: ${f.customHtml.substring(0, 150)}...`);
        }
      }
    }
  } else {
    console.log('Layout está nulo ou indefinido.');
  }
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
