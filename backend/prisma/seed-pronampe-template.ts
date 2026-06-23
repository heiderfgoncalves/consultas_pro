import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('=== Iniciando Criação do Template PRONAMPE · Brasil Cred (Layout A4) ===');

  // 1. Carregar CSS e Páginas HTML do template
  const templatesDir = path.join(__dirname, 'templates');
  const cssPath = path.join(templatesDir, 'pronampe-style.css');
  
  if (!fs.existsSync(cssPath)) {
    throw new Error(`CSS do template não encontrado em: ${cssPath}`);
  }
  const cssContent = fs.readFileSync(cssPath, 'utf-8');
  const styleBlock = `<style>\n${cssContent}\n</style>`;

  const frames = [];
  for (let i = 1; i <= 6; i++) {
    const pagePath = path.join(templatesDir, `pronampe-page-${i}.html`);
    if (!fs.existsSync(pagePath)) {
      throw new Error(`HTML da Página ${i} não encontrado em: ${pagePath}`);
    }
    const pageHtml = fs.readFileSync(pagePath, 'utf-8');
    frames.push({
      id: `frame_page_${i}`,
      name: `Página ${i}`,
      type: 'page',
      customHtml: `${styleBlock}\n${pageHtml}`,
      width: 794,
      height: 1123,
      x: 0,
      y: (i - 1) * 1150,
      sortOrder: i - 1
    });
  }

  // 2. Construir objeto de layout com frames físicos A4 e sem elementos individuais no canvas
  const layout = {
    id: 'template_pronampe_brasil_cred',
    name: 'Relatório Analítico PRONAMPE · Brasil Cred',
    elements: [],
    frames
  };

  // 3. Fazer o upsert do Template no banco Prisma
  const templateId = 'template_pronampe_brasil_cred';
  console.log(`Fazendo upsert do template '${templateId}'...`);

  const template = await prisma.template.upsert({
    where: { id: templateId },
    update: {
      name: 'Relatório Analítico PRONAMPE · Brasil Cred',
      description: 'Template visual analítico de altíssimo padrão para o Radar PRONAMPE (CNPJ) - Brasil Cred',
      layout: layout as any,
      visibility: 'GLOBAL',
    },
    create: {
      id: templateId,
      name: 'Relatório Analítico PRONAMPE · Brasil Cred',
      description: 'Template visual analítico de altíssimo padrão para o Radar PRONAMPE (CNPJ) - Brasil Cred',
      layout: layout as any,
      visibility: 'GLOBAL',
    }
  });

  console.log(`✅ Template cadastrado com sucesso! ID: ${template.id}, Nome: ${template.name}`);

  // 4. Vincular o Template ao ProviderProduct RADAR_PRONAMPE_PJ
  const productCode = 'RADAR_PRONAMPE_PJ';
  const product = await prisma.providerProduct.findFirst({
    where: { code: productCode }
  });

  if (!product) {
    throw new Error(`Produto com o código ${productCode} não foi encontrado no banco de dados!`);
  }

  console.log(`Vinculando ao produto PRONAMPE: ID: ${product.id}, Código: ${product.code}, Nome: ${product.name}`);

  // 4.1. Limpar associações existentes de TemplateItem para o produto do Pronampe
  await prisma.templateItem.deleteMany({
    where: { providerProductId: product.id }
  });

  // 4.2. Criar a nova associação no TemplateItem
  const templateItem = await prisma.templateItem.create({
    data: {
      templateId: template.id,
      providerProductId: product.id,
      alias: 'Pronampe',
      sortOrder: 0
    }
  });

  console.log(`✅ Associação criada com sucesso em TemplateItem! ID: ${templateItem.id}, Alias: ${templateItem.alias}`);
  console.log('=== Processo de Semente do PRONAMPE Concluído com Sucesso! ===');
}

main()
  .catch((e) => {
    console.error('❌ Erro fatal durante a execução do script de semente:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
