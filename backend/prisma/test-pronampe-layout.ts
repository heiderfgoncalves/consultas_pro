import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("=== INSPECTING PRONAMPE TEMPLATE LAYOUT ===");
  const t = await prisma.template.findUnique({
    where: { id: 'template_pronampe_brasil_cred' }
  });

  if (!t) {
    console.log("Template template_pronampe_brasil_cred não encontrado no banco!");
    return;
  }

  console.log(`ID: ${t.id}`);
  console.log(`Nome: ${t.name}`);
  console.log(`Visibilidade: ${t.visibility}`);
  console.log(`Layout definido? ${t.layout ? 'SIM' : 'NÃO'}`);
  
  if (t.layout) {
    const layout = typeof t.layout === 'string' ? JSON.parse(t.layout) : t.layout;
    console.log(`Tipo do layout: ${typeof layout}`);
    console.log(`ID no layout: ${layout.id}`);
    console.log(`Nome no layout: ${layout.name}`);
    console.log(`Tem frames? ${Array.isArray(layout.frames) ? 'SIM (' + layout.frames.length + ')' : 'NÃO'}`);
    
    if (Array.isArray(layout.frames)) {
      for (const f of layout.frames) {
        console.log(`  - Frame ID: ${f.id} | Nome: ${f.name} | customHtml definido? ${f.customHtml ? 'SIM (' + f.customHtml.length + ' caracteres)' : 'NÃO'}`);
      }
    }

    console.log(`Metadata:`, JSON.stringify(layout.metadata, null, 2));
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
