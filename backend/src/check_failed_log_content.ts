import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== CONTEUDO DO LOG DE TESTE CMQGRNVDH0008U6C0S54BN131 ===');
  const log = await prisma.providerTestLog.findUnique({
    where: { id: 'cmqgrnvdh0008u6c0s54bn131' }
  });

  if (!log) {
    console.log('Log não encontrado!');
    return;
  }

  const payload: any = log.responsePayload || {};
  const cred = payload.CREDCADASTRAL || {};
  
  console.log('Tem CREDCADASTRAL?', !!payload.CREDCADASTRAL);
  console.log('Chaves de CREDCADASTRAL:', Object.keys(cred));
  
  if (cred.PROTESTO_SINTETICO) {
    console.log('PROTESTO_SINTETICO no log de teste:', JSON.stringify(cred.PROTESTO_SINTETICO, null, 2));
  } else {
    console.log('PROTESTO_SINTETICO NAO existe no log de teste!');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
