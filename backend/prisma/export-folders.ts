import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log("Conectando ao banco de dados para exportar pastas e associações...");

  const folders = await prisma.canonicalFolder.findMany({
    orderBy: { createdAt: 'asc' }
  });

  const associations = await prisma.canonicalFieldFolderAssociation.findMany({
    orderBy: { createdAt: 'asc' }
  });

  console.log(`Encontradas ${folders.length} pastas e ${associations.length} associações.`);

  const seedCode = `import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("Iniciando a semente de pastas canônicas e associações...");

  const foldersData = ${JSON.stringify(folders, null, 2)};
  const associationsData = ${JSON.stringify(associations, null, 2)};

  // 1. Inserir pastas respeitando hierarquia (pais primeiro)
  // Como as pastas podem ter parentId, ordenamos por parentId nulo primeiro e depois os outros, ou fazemos uma inserção iterativa segura.
  // Vamos usar um mapa para acompanhar o que já foi criado ou fazer upserts sucessivos.
  
  // Primeiro, criamos as pastas sem parentId para evitar violação de chave estrangeira
  const noParentFolders = foldersData.filter(f => !f.parentId);
  const withParentFolders = foldersData.filter(f => f.parentId);

  console.log(\`Criando \${noParentFolders.length} pastas raiz...\`);
  for (const folder of noParentFolders) {
    await prisma.canonicalFolder.upsert({
      where: { id: folder.id },
      update: {
        name: folder.name,
        parentId: null,
        createdAt: new Date(folder.createdAt),
        updatedAt: new Date(folder.updatedAt)
      },
      create: {
        id: folder.id,
        name: folder.name,
        parentId: null,
        createdAt: new Date(folder.createdAt),
        updatedAt: new Date(folder.updatedAt)
      }
    });
  }

  console.log(\`Criando \${withParentFolders.length} pastas filhas...\`);
  for (const folder of withParentFolders) {
    await prisma.canonicalFolder.upsert({
      where: { id: folder.id },
      update: {
        name: folder.name,
        parentId: folder.parentId,
        createdAt: new Date(folder.createdAt),
        updatedAt: new Date(folder.updatedAt)
      },
      create: {
        id: folder.id,
        name: folder.name,
        parentId: folder.parentId,
        createdAt: new Date(folder.createdAt),
        updatedAt: new Date(folder.updatedAt)
      }
    });
  }

  // 2. Inserir associações de campos
  console.log(\`Criando \${associationsData.length} associações de campos...\`);
  for (const assoc of associationsData) {
    await prisma.canonicalFieldFolderAssociation.upsert({
      where: { fieldTypeKey: assoc.fieldTypeKey },
      update: {
        folderId: assoc.folderId,
        createdAt: new Date(assoc.createdAt),
        updatedAt: new Date(assoc.updatedAt)
      },
      create: {
        id: assoc.id,
        fieldTypeKey: assoc.fieldTypeKey,
        folderId: assoc.folderId,
        createdAt: new Date(assoc.createdAt),
        updatedAt: new Date(assoc.updatedAt)
      }
    });
  }

  console.log("Semente de pastas e associações aplicada com sucesso!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
`;

  const outputPath = path.join(__dirname, 'seed-folders.ts');
  fs.writeFileSync(outputPath, seedCode, 'utf-8');
  console.log(`Script de seed de pastas gravado com sucesso em: ${outputPath}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
