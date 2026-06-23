import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const sections = ['PRONAMPE_BACEN', 'PRONAMPE_RESULTADO', 'PRONAMPE_RECEITA', 'PRONAMPE_BUREAUS', 'PRONAMPE_SOCIOS'];
  
  console.log('=== CAMPOS CANÔNICOS CADASTRADOS NO BANCO ===');
  for (const key of sections) {
    const s = await prisma.canonicalFieldCatalog.findFirst({
      where: { pathKey: key }
    });

    if (!s) {
      console.log(`Seção ${key} não encontrada!`);
      continue;
    }

    console.log(`\nSeção: ${s.pathKey} | Label: ${s.label}`);
    if (s.reportFieldConfig) {
      const config = typeof s.reportFieldConfig === 'string' ? JSON.parse(s.reportFieldConfig) : s.reportFieldConfig;
      if (config.fields) {
        for (const f of config.fields) {
          console.log(`  - Campo ID: ${f.id} | Key: ${f.key} | Label: ${f.label} | Tipo: ${f.dataType}`);
        }
      } else {
        console.log('  Sem fields cadastrados na config.');
      }
    } else {
      console.log('  Sem reportFieldConfig.');
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
