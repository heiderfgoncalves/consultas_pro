import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== BUSCANDO LOG DE TESTE REQ-48971824 ===');
  
  // Vamos buscar todos e tentar achar via stringify
  const allLogs = await prisma.providerTestLog.findMany({
    take: 100,
    orderBy: { createdAt: 'desc' }
  });

  for (const log of allLogs) {
    const str = JSON.stringify(log.responsePayload) + ' ' + JSON.stringify(log.normalizedPayload);
    if (str.includes('REQ-48971824')) {
      console.log('Encontrado por texto!');
      console.log('ID do Log:', log.id);
      console.log('Criado em:', log.createdAt);
      console.log('Normalized Payload:', JSON.stringify(log.normalizedPayload, null, 2));
      console.log('Response Payload:', JSON.stringify(log.responsePayload, null, 2));
      return;
    }
  }
  console.log('Log REQ-48971824 não encontrado nos logs do banco.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
