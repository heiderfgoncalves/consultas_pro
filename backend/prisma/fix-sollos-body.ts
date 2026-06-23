import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const correctBodyTemplate = {
  Info: {
    Solicitante: "IDENTIFICAÇÃO DO CLIENTE FINAL (OPCIONAL)"
  },
  Versao: "20180521",
  WebHook: {
    UrlCallBack: ""
  },
  Parametros: {
    CPFCNPJ: "{{document}}",
    TipoPessoa: "F"
  },
  ChaveAcesso: "ZzM67lS3CL7SSW6680p9fEcNPcD5wE88aSQa/D3EnDeL6cnwsrkpmrCsSt4dssftiiooSega",
  CodigoProduto: "1079"
};

async function main() {
  console.log('=== Iniciando Correção do Corpo da Requisição do Sollos 1079 ===');

  const product1079 = await prisma.providerProduct.findFirst({
    where: {
      OR: [
        { code: '1079' },
        { id: '1079' },
        { name: { contains: '1079' } },
        { name: { contains: 'COMPLETA BRASIL' } }
      ]
    }
  });

  if (product1079) {
    console.log(`Produto 1079 encontrado: "${product1079.name}" (ID: ${product1079.id}).`);
    
    await prisma.providerProduct.update({
      where: { id: product1079.id },
      data: {
        bodyTemplate: correctBodyTemplate as any
      }
    });
    
    console.log('✅ Campo bodyTemplate do produto 1079 restaurado para o JSON complexo original com "{{document}}"!');
  } else {
    console.log('⚠️ Produto 1079 não foi localizado no banco remoto.');
  }

  console.log('=== Correção Concluída ===');
}

main()
  .catch((e) => {
    console.error('Erro ao executar a correção:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
