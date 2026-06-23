import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  const templateId = 'cmpuh6oue0000u6omv22c0fjb';
  const template = await prisma.template.findUnique({
    where: { id: templateId }
  });

  if (!template) {
    console.error(`Template com ID ${templateId} não foi encontrado.`);
    return;
  }

  const outPath = path.join(__dirname, 'template-base.json');
  fs.writeFileSync(outPath, JSON.stringify(template.layout, null, 2), 'utf-8');
  console.log(`✅ Layout do template "${template.name}" exportado com sucesso para ${outPath}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
