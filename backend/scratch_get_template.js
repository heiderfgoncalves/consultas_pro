const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const prisma = new PrismaClient();

async function main() {
  const template = await prisma.template.findUnique({
    where: { id: 'cmpuh6oue0000u6omv22c0fjb' },
    select: {
      id: true,
      name: true,
      layout: true
    }
  });

  if (!template) {
    console.log("Template não encontrado!");
    return;
  }

  const filePath = '/home/victorbrunno/.gemini/antigravity/brain/a40b2e8c-ff87-4f5a-b761-edf2db333eac/scratch/template_layout.json';
  fs.writeFileSync(filePath, JSON.stringify(template.layout, null, 2));
  console.log("Layout salvo com sucesso em: " + filePath);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
