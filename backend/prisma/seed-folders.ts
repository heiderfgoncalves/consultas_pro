import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("Iniciando a semente de pastas canônicas e associações...");

  const foldersData = [
  {
    "id": "cmqpuagkv0009u64iw3o6ighj",
    "name": "Dividas Birôs",
    "parentId": null,
    "createdAt": "2026-06-22T23:21:21.775Z",
    "updatedAt": "2026-06-22T23:21:21.775Z"
  },
  {
    "id": "cmqpw6y14000du64iuqn4mntw",
    "name": "Pronampe",
    "parentId": null,
    "createdAt": "2026-06-23T00:14:36.994Z",
    "updatedAt": "2026-06-23T00:14:36.994Z"
  }
];
  const associationsData = [
  {
    "id": "cmqpuaj9k000bu64ixfo6p1pj",
    "fieldTypeKey": "APONTAMENTOS_BACEN",
    "folderId": "cmqpuagkv0009u64iw3o6ighj",
    "createdAt": "2026-06-22T23:21:25.256Z",
    "updatedAt": "2026-06-22T23:21:25.256Z"
  },
  {
    "id": "cmqpw7d1m000hu64in6qqupdq",
    "fieldTypeKey": "PRONAMPE_BUREAUS",
    "folderId": "cmqpw6y14000du64iuqn4mntw",
    "createdAt": "2026-06-23T00:14:56.457Z",
    "updatedAt": "2026-06-23T00:14:56.457Z"
  },
  {
    "id": "cmqpw7d1m000gu64ifnz56y67",
    "fieldTypeKey": "PRONAMPE_BACEN",
    "folderId": "cmqpw6y14000du64iuqn4mntw",
    "createdAt": "2026-06-23T00:14:56.458Z",
    "updatedAt": "2026-06-23T00:14:56.458Z"
  },
  {
    "id": "cmqpw7d1m000ju64ieh636mxm",
    "fieldTypeKey": "PRONAMPE_RECEITA",
    "folderId": "cmqpw6y14000du64iuqn4mntw",
    "createdAt": "2026-06-23T00:14:56.458Z",
    "updatedAt": "2026-06-23T00:14:56.458Z"
  },
  {
    "id": "cmqpw7d1o000lu64ig0t5r2gy",
    "fieldTypeKey": "PRONAMPE_RESULTADO",
    "folderId": "cmqpw6y14000du64iuqn4mntw",
    "createdAt": "2026-06-23T00:14:56.461Z",
    "updatedAt": "2026-06-23T00:14:56.461Z"
  },
  {
    "id": "cmqpw7d2i000nu64iw3lgdwlo",
    "fieldTypeKey": "RATING",
    "folderId": "cmqpw6y14000du64iuqn4mntw",
    "createdAt": "2026-06-23T00:14:56.463Z",
    "updatedAt": "2026-06-23T00:14:56.463Z"
  },
  {
    "id": "cmqpw7d3z000pu64i7pozm3gi",
    "fieldTypeKey": "PRONAMPE_PGFN",
    "folderId": "cmqpw6y14000du64iuqn4mntw",
    "createdAt": "2026-06-23T00:14:56.491Z",
    "updatedAt": "2026-06-23T00:14:56.491Z"
  },
  {
    "id": "cmqpw7d59000ru64izmhthne1",
    "fieldTypeKey": "PRONAMPE_SOCIOS",
    "folderId": "cmqpw6y14000du64iuqn4mntw",
    "createdAt": "2026-06-23T00:14:56.590Z",
    "updatedAt": "2026-06-23T00:14:56.590Z"
  },
  {
    "id": "cmqpwee0m000tu64icqcxf45e",
    "fieldTypeKey": "DIVIDAS_SPC",
    "folderId": "cmqpuagkv0009u64iw3o6ighj",
    "createdAt": "2026-06-23T00:20:24.310Z",
    "updatedAt": "2026-06-23T00:20:24.310Z"
  },
  {
    "id": "cmqpwee0n000xu64icv0vosp7",
    "fieldTypeKey": "DIVIDAS_BOA_VISTA",
    "folderId": "cmqpuagkv0009u64iw3o6ighj",
    "createdAt": "2026-06-23T00:20:24.311Z",
    "updatedAt": "2026-06-23T00:20:24.311Z"
  },
  {
    "id": "cmqpwee0m000vu64iq8fjsg8t",
    "fieldTypeKey": "DIVIDAS_SERASA",
    "folderId": "cmqpuagkv0009u64iw3o6ighj",
    "createdAt": "2026-06-23T00:20:24.311Z",
    "updatedAt": "2026-06-23T00:20:24.311Z"
  },
  {
    "id": "cmqpwee6m0011u64i2xjqs3up",
    "fieldTypeKey": "SCORE_CREDITO",
    "folderId": "cmqpuagkv0009u64iw3o6ighj",
    "createdAt": "2026-06-23T00:20:24.526Z",
    "updatedAt": "2026-06-23T00:20:24.526Z"
  },
  {
    "id": "cmqpwee6m000zu64i405tnzhm",
    "fieldTypeKey": "PROTESTO_CARTORIO",
    "folderId": "cmqpuagkv0009u64iw3o6ighj",
    "createdAt": "2026-06-23T00:20:24.526Z",
    "updatedAt": "2026-06-23T00:20:24.526Z"
  },
  {
    "id": "cmqpwee8l0013u64ivvitoqn0",
    "fieldTypeKey": "DADOS_PESSOAIS",
    "folderId": "cmqpuagkv0009u64iw3o6ighj",
    "createdAt": "2026-06-23T00:20:24.597Z",
    "updatedAt": "2026-06-23T00:20:24.597Z"
  }
];

  // 1. Inserir pastas respeitando hierarquia (pais primeiro)
  // Como as pastas podem ter parentId, ordenamos por parentId nulo primeiro e depois os outros, ou fazemos uma inserção iterativa segura.
  // Vamos usar um mapa para acompanhar o que já foi criado ou fazer upserts sucessivos.
  
  // Primeiro, criamos as pastas sem parentId para evitar violação de chave estrangeira
  const noParentFolders = foldersData.filter(f => !f.parentId);
  const withParentFolders = foldersData.filter(f => f.parentId);

  console.log(`Criando ${noParentFolders.length} pastas raiz...`);
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

  console.log(`Criando ${withParentFolders.length} pastas filhas...`);
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
  console.log(`Criando ${associationsData.length} associações de campos...`);
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
