import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const htmlOriginal = `html:<div style='font-size:28px;font-weight:700;color:{{if($SCORE_CREDITO[0].score <= 200, '#ef4444', if($SCORE_CREDITO[0].score <= 400, '#f97316', if($SCORE_CREDITO[0].score <= 600, '#eab308', if($SCORE_CREDITO[0].score <= 800, '#84cc16', '#22c55e'))))}};margin-top:5px;font-family:sans-serif;'>{{$SCORE_CREDITO[0].score}}</div><div style='font-size:10px;font-weight:700;text-transform:uppercase;color:{{if($SCORE_CREDITO[0].score <= 200, '#ef4444', if($SCORE_CREDITO[0].score <= 400, '#f97316', if($SCORE_CREDITO[0].score <= 600, '#eab308', if($SCORE_CREDITO[0].score <= 800, '#84cc16', '#22c55e'))))}};margin-top:2px;font-family:sans-serif;'>{{if($SCORE_CREDITO[0].score <= 200, 'Péssimo', if($SCORE_CREDITO[0].score <= 400, 'Ruim', if($SCORE_CREDITO[0].score <= 600, 'Regular', if($SCORE_CREDITO[0].score <= 800, 'Bom', 'Ótimo'))))}}</div>`;

const htmlAdaptado = `html:<div style='font-size:28px;font-weight:700;color:{{VAR score = $SCORE_CREDITO[0].score VAR cor = case when score <= 200 then "#ef4444" when score <= 400 then "#f97316" when score <= 600 then "#eab308" when score <= 800 then "#84cc16" else "#22c55e" end RETURN cor}};margin-top:5px;font-family:sans-serif;'>{{$SCORE_CREDITO[0].score}}</div><div style='font-size:10px;font-weight:700;text-transform:uppercase;color:{{VAR score = $SCORE_CREDITO[0].score VAR cor = case when score <= 200 then "#ef4444" when score <= 400 then "#f97316" when score <= 600 then "#eab308" when score <= 800 then "#84cc16" else "#22c55e" end RETURN cor}};margin-top:2px;font-family:sans-serif;'>{{VAR score = $SCORE_CREDITO[0].score VAR faixa = case when score <= 200 then "Péssimo" when score <= 400 then "Ruim" when score <= 600 then "Regular" when score <= 800 then "Bom" else "Ótimo" end RETURN faixa}}</div>`;

async function main() {
  console.log('=== Iniciando Atualização de Templates e Integrações ===');

  // 1. Atualizar o template Import_test_1 por ID se presente, ou varrer todos
  const templateId = 'cmpuh6oue0000u6omv22c0fjb';
  const template = await prisma.template.findUnique({
    where: { id: templateId }
  });

  if (template) {
    console.log(`Template "${template.name}" (ID: ${template.id}) carregado com sucesso.`);
    if (template.layout) {
      let layoutObj = JSON.parse(JSON.stringify(template.layout));
      let modified = false;

      if (layoutObj.elements && Array.isArray(layoutObj.elements)) {
        layoutObj.elements = layoutObj.elements.map((el: any) => {
          if (el.id === 'text_CuWRaAgh') {
            console.log(`Encontrado elemento "text_CuWRaAgh" no template.`);
            if (el.data && el.data.text) {
              console.log('Realizando a substituição pelo HTML premium adaptado com case when e VAR/RETURN...');
              el.data.text = htmlAdaptado;
              modified = true;
            }
          }
          return el;
        });
      }

      if (modified) {
        await prisma.template.update({
          where: { id: templateId },
          data: { layout: layoutObj }
        });
        console.log(`✅ Template "${template.name}" atualizado com sucesso no banco de dados remoto!`);
      } else {
        console.log(`⚠️ Elemento "text_CuWRaAgh" não foi modificado (não encontrado ou sem data.text).`);
      }
    }
  } else {
    console.log(`⚠️ Template com ID ${templateId} não foi encontrado.`);
  }

  // 2. Configurar o bodyTemplate para o produto Sollos 1079 com a variável de documento
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
    
    // Atualiza o bodyTemplate para o formato JSON correto contendo {{document}}
    await prisma.providerProduct.update({
      where: { id: product1079.id },
      data: {
        bodyTemplate: {
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
        } as any
      }
    });
    console.log('✅ Campo bodyTemplate do produto 1079 atualizado para o JSON complexo correto!');
  } else {
    console.log('⚠️ Produto 1079 (COMPLETA BRASIL + SCORE CPF) não foi localizado no banco remoto.');
  }

  // 3. Configurar o bodyTemplate para o produto Radar PRONAMPE (CNPJ) com a variável de documento $document
  const productPronampe = await prisma.providerProduct.findFirst({
    where: {
      OR: [
        { code: 'RADAR_PRONAMPE_PJ' },
        { externalId: 'radar-pronampe-pj' },
        { name: { contains: 'Radar PRONAMPE' } }
      ]
    }
  });

  if (productPronampe) {
    console.log(`Produto PRONAMPE encontrado: "${productPronampe.name}" (ID: ${productPronampe.id}).`);
    await prisma.providerProduct.update({
      where: { id: productPronampe.id },
      data: {
        bodyTemplate: {
          document: "$document"
        } as any
      }
    });
    console.log('✅ Campo bodyTemplate do produto RADAR_PRONAMPE_PJ restaurado para { "document": "$document" }!');
  } else {
    console.log('⚠️ Produto RADAR_PRONAMPE_PJ não foi localizado no banco remoto.');
  }

  console.log('=== Atualizações de Sementes Premium Concluídas ===');
}

main()
  .catch((e) => {
    console.error('Erro ao executar atualizações:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
