import { PrismaClient, HttpMethod, ProviderAuthType, ProviderOperationType } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log("Starting Brasil Cred & Radar PRONAMPE configuration...");

  // 1. Configurar Provedor Brasil Cred
  // Buscamos o provedor com slug 'brasil-consultas' (antigo mock) para reconfigurá-lo
  let provider = await prisma.provider.findFirst({
    where: {
      OR: [
        { slug: 'brasil-cred' },
        { slug: 'brasil-consultas' }
      ]
    }
  });

  if (provider) {
    provider = await prisma.provider.update({
      where: { id: provider.id },
      data: {
        name: "Brasil Cred",
        slug: "brasil-cred",
        baseUrl: "https://sets.brasilcred.com.br/functions/v1/api-gateway/api/v1",
        authType: ProviderAuthType.BEARER,
        credentials: { token: "bc_live_demo" },
        isActive: true,
      }
    });
    console.log(`Updated existing provider: ID=${provider.id}, Slug=${provider.slug}`);
  } else {
    provider = await prisma.provider.create({
      data: {
        name: "Brasil Cred",
        slug: "brasil-cred",
        baseUrl: "https://sets.brasilcred.com.br/functions/v1/api-gateway/api/v1",
        authType: ProviderAuthType.BEARER,
        credentials: { token: "bc_live_demo" },
        isActive: true,
      }
    });
    console.log(`Created new provider: ID=${provider.id}, Slug=${provider.slug}`);
  }

  // 2. Configurar Operações do Provedor (Saldo e Recarga)
  await prisma.providerOperation.deleteMany({
    where: { providerId: provider.id }
  });

  await prisma.providerOperation.createMany({
    data: [
      {
        providerId: provider.id,
        operationType: ProviderOperationType.BALANCE_CHECK,
        name: "Saldo",
        path: "/account",
        method: HttpMethod.GET,
      },
      {
        providerId: provider.id,
        operationType: ProviderOperationType.RECHARGE,
        name: "Recarga",
        path: "/recharge",
        method: HttpMethod.POST,
      }
    ]
  });
  console.log("Reconfigured provider operations (Balance Check & Recharge)");

  // 3. Configurar Novos Tipos e Campos Canônicos
  const sectionsToCreate = [
    {
      pathKey: "PRONAMPE_RESULTADO",
      label: "PRONAMPE - Resultado",
      description: "Resultado consolidado da consulta Radar PRONAMPE",
      fields: [
        { key: "recomendacao_final", label: "Recomendação Final", dataType: "string" },
        { key: "credito_estimado", label: "Crédito Estimado", dataType: "currency" },
        { key: "prob_inadimplencia", label: "Probabilidade de Inadimplência", dataType: "string" },
        { key: "rating_bancario", label: "Rating Bancário", dataType: "string" },
        { key: "score", label: "Score de Crédito", dataType: "number" },
        { key: "faturamento_estimado", label: "Faturamento Estimado", dataType: "currency" },
        { key: "gasto_estimado", label: "Gasto Estimado", dataType: "currency" },
        { key: "parecer_executivo", label: "Parecer Executivo", dataType: "string" }
      ]
    },
    {
      pathKey: "PRONAMPE_SOCIOS",
      label: "PRONAMPE - Quadro Societário e Restrições",
      description: "Informações cadastrais e restrições ativas dos sócios",
      fields: [
        { key: "nome", label: "Nome", dataType: "string" },
        { key: "documento", label: "CPF/CNPJ", dataType: "string" },
        { key: "vinculo", label: "Vínculo", dataType: "string" },
        { key: "participacao", label: "Participação (%)", dataType: "number" },
        { key: "score", label: "Score", dataType: "number" },
        { key: "total_refin", label: "Total REFIN", dataType: "currency" },
        { key: "qtd_refin", label: "Qtd REFIN", dataType: "number" },
        { key: "total_protestos", label: "Total Protestos", dataType: "currency" },
        { key: "qtd_protestos", label: "Qtd Protestos", dataType: "number" }
      ]
    },
    {
      pathKey: "PRONAMPE_PGFN",
      label: "PRONAMPE - Dívida Ativa PGFN",
      description: "Dívidas tributárias federais ativas na PGFN",
      fields: [
        { key: "tipo_divida", label: "Tipo de Dívida", dataType: "string" },
        { key: "numero_inscricao", label: "Número de Inscrição", dataType: "string" },
        { key: "valor", label: "Valor", dataType: "currency" }
      ]
    },
    {
      pathKey: "PRONAMPE_RECEITA",
      label: "PRONAMPE - Cadastro Receita Federal",
      description: "Dados do cartão CNPJ da Receita Federal",
      fields: [
        { key: "razao_social", label: "Razão Social", dataType: "string" },
        { key: "situacao_cadastral", label: "Situação Cadastral", dataType: "string" },
        { key: "data_abertura", label: "Abertura", dataType: "date" },
        { key: "cnae_principal", label: "CNAE Principal", dataType: "string" },
        { key: "telefones", label: "Telefones", dataType: "string" },
        { key: "endereco", label: "Endereço", dataType: "string" }
      ]
    },
    {
      pathKey: "PRONAMPE_BUREAUS",
      label: "PRONAMPE - Scores e Bureaus",
      description: "Métricas consolidadas dos bureaus Quod e Boa Vista",
      fields: [
        { key: "quod_score", label: "Score Quod", dataType: "number" },
        { key: "quod_faixa", label: "Faixa Quod", dataType: "string" },
        { key: "boavista_score", label: "Score Boa Vista", dataType: "number" },
        { key: "boavista_faixa", label: "Faixa Boa Vista", dataType: "string" }
      ]
    },
    {
      pathKey: "PRONAMPE_BACEN",
      label: "PRONAMPE - SCR BACEN (Registrato)",
      description: "Dados de endividamento bancário no SCR do Banco Central",
      fields: [
        { key: "limite", label: "Limite de Crédito", dataType: "currency" },
        { key: "prejuizo", label: "Prejuízo", dataType: "currency" },
        { key: "obrigacao_assumida", label: "Obrigação Assumida", dataType: "currency" },
        { key: "vencer", label: "A Vencer", dataType: "currency" },
        { key: "vencido", label: "Vencido", dataType: "currency" },
        { key: "responsabilidade_total", label: "Responsabilidade Total", dataType: "currency" },
        { key: "faixa_risco", label: "Faixa de Risco", dataType: "string" }
      ]
    }
  ];

  for (const s of sectionsToCreate) {
    const reportFieldConfig = {
      version: 1,
      title: s.label,
      fields: s.fields.map((f, idx) => ({
        id: `field_${s.pathKey.toLowerCase()}_${f.key}`,
        key: f.key,
        label: f.label,
        dataType: f.dataType,
        sortOrder: idx
      }))
    };

    // Upsert da Seção
    await prisma.canonicalFieldCatalog.upsert({
      where: { pathKey: s.pathKey },
      update: {
        label: s.label,
        description: s.description,
        dataType: "object",
        reportFieldConfig: reportFieldConfig as any
      },
      create: {
        pathKey: s.pathKey,
        label: s.label,
        description: s.description,
        dataType: "object",
        reportFieldConfig: reportFieldConfig as any
      }
    });
    console.log(`Upserted section canonical field: ${s.pathKey}`);

    // Upsert dos campos individuais da seção
    for (const f of s.fields) {
      const fieldPathKey = s.pathKey === "PRONAMPE_SOCIOS" || s.pathKey === "PRONAMPE_PGFN"
        ? `${s.pathKey}[].${f.key}`
        : `${s.pathKey}.${f.key}`;
      await prisma.canonicalFieldCatalog.upsert({
        where: { pathKey: fieldPathKey },
        update: {
          label: f.label,
          dataType: f.dataType,
        },
        create: {
          pathKey: fieldPathKey,
          label: f.label,
          dataType: f.dataType,
        }
      });
    }
  }

  // 4. Configurar Consulta "Radar PRONAMPE (CNPJ)"
  const logFilePath = path.join(__dirname, '../../logs/radar_pronampe_brasilconsultas.json');
  if (!fs.existsSync(logFilePath)) {
    throw new Error(`Log file not found at ${logFilePath}`);
  }
  const logFileContent = fs.readFileSync(logFilePath, 'utf-8');
  const logJson = JSON.parse(logFileContent);
  const sampleResponse = logJson.raw_data; // Usamos o raw_data como o retorno direto do provedor

  // Buscamos o tipo de consulta composta
  const compostaType = await prisma.consultationType.findFirst({
    where: { key: 'consulta_composta' }
  });

  const typeItemFilters = {
    PRONAMPE_RESULTADO: {
      version: 2,
      groups: [],
      fieldMappings: [
        { id: "map_res_rec", reportFieldId: "field_pronampe_resultado_recomendacao_final", reportFieldLabel: "Recomendação Final", jsonPath: "tipoRecomendacaoVenda", sourceTrechoPath: "recomenda.data" },
        { id: "map_res_cred", reportFieldId: "field_pronampe_resultado_credito_estimado", reportFieldLabel: "Crédito Estimado", jsonPath: "valorLimiteRecomendado", sourceTrechoPath: "recomenda.data" },
        { id: "map_res_prob", reportFieldId: "field_pronampe_resultado_prob_inadimplencia", reportFieldLabel: "Probabilidade de Inadimplência", jsonPath: "quod.pessoaJuridica.faixaScore", sourceTrechoPath: "" },
        { id: "map_res_rat", reportFieldId: "field_pronampe_resultado_rating_bancario", reportFieldLabel: "Rating Bancário", jsonPath: "codNivelRisco", sourceTrechoPath: "recomenda.data" },
        { id: "map_res_sc", reportFieldId: "field_pronampe_resultado_score", reportFieldLabel: "Score de Crédito", jsonPath: "quod.pessoaJuridica.score", sourceTrechoPath: "" },
        { id: "map_res_fat", reportFieldId: "field_pronampe_resultado_faturamento_estimado", reportFieldLabel: "Faturamento Estimado", jsonPath: "faturamentoEstimado", sourceTrechoPath: "recomenda.data" },
        { id: "map_res_gast", reportFieldId: "field_pronampe_resultado_gasto_estimado", reportFieldLabel: "Gasto Estimado", jsonPath: "scrBacen.retorno.responsabilidadeTotal", sourceTrechoPath: "" },
        { id: "map_res_par", reportFieldId: "field_pronampe_resultado_parecer_executivo", reportFieldLabel: "Parecer Executivo", jsonPath: "mensagemScore", sourceTrechoPath: "recomenda.data" }
      ],
      dedupFieldIds: [],
      computedFields: []
    },
    PRONAMPE_SOCIOS: {
      version: 2,
      groups: [],
      fieldMappings: [
        { id: "map_soc_nome", reportFieldId: "field_pronampe_socios_nome", reportFieldLabel: "Nome", jsonPath: "nome", sourceTrechoPath: "recomenda.data.quadroSocietarioCompleto" },
        { id: "map_soc_doc", reportFieldId: "field_pronampe_socios_documento", reportFieldLabel: "CPF/CNPJ", jsonPath: "documento", sourceTrechoPath: "recomenda.data.quadroSocietarioCompleto" },
        { id: "map_soc_vin", reportFieldId: "field_pronampe_socios_vinculo", reportFieldLabel: "Vínculo", jsonPath: "vinculo", sourceTrechoPath: "recomenda.data.quadroSocietarioCompleto" },
        { id: "map_soc_part", reportFieldId: "field_pronampe_socios_participacao", reportFieldLabel: "Participação (%)", jsonPath: "capitalTotal", sourceTrechoPath: "recomenda.data.quadroSocietarioCompleto" },
        { id: "map_soc_tref", reportFieldId: "field_pronampe_socios_total_refin", reportFieldLabel: "Total REFIN", jsonPath: "anotacoesNegativas[0].valorTotalRefin", sourceTrechoPath: "recomenda.data.quadroSocietarioCompleto" },
        { id: "map_soc_qref", reportFieldId: "field_pronampe_socios_qtd_refin", reportFieldLabel: "Qtd REFIN", jsonPath: "anotacoesNegativas[0].quantidadeTotalRefin", sourceTrechoPath: "recomenda.data.quadroSocietarioCompleto" },
        { id: "map_soc_tprot", reportFieldId: "field_pronampe_socios_total_protestos", reportFieldLabel: "Total Protestos", jsonPath: "anotacoesNegativas[0].valorTotalProtesto", sourceTrechoPath: "recomenda.data.quadroSocietarioCompleto" },
        { id: "map_soc_qprot", reportFieldId: "field_pronampe_socios_qtd_protestos", reportFieldLabel: "Qtd Protestos", jsonPath: "anotacoesNegativas[0].quantidadeTotalProtesto", sourceTrechoPath: "recomenda.data.quadroSocietarioCompleto" }
      ],
      dedupFieldIds: [],
      computedFields: []
    },
    PRONAMPE_PGFN: {
      version: 2,
      groups: [],
      fieldMappings: [
        { id: "map_pgfn_tipo", reportFieldId: "field_pronampe_pgfn_tipo_divida", reportFieldLabel: "Tipo de Dívida", jsonPath: "tipoDivida", sourceTrechoPath: "pgfn.retorno.naturezas" },
        { id: "map_pgfn_num", reportFieldId: "field_pronampe_pgfn_numero_inscricao", reportFieldLabel: "Número de Inscrição", jsonPath: "numeroInscricao", sourceTrechoPath: "pgfn.retorno.naturezas" },
        { id: "map_pgfn_val", reportFieldId: "field_pronampe_pgfn_valor", reportFieldLabel: "Valor", jsonPath: "total", sourceTrechoPath: "pgfn.retorno.naturezas" }
      ],
      dedupFieldIds: [],
      computedFields: []
    },
    PRONAMPE_RECEITA: {
      version: 2,
      groups: [],
      fieldMappings: [
        { id: "map_rec_rs", reportFieldId: "field_pronampe_receita_razao_social", reportFieldLabel: "Razão Social", jsonPath: "razaoSocial", sourceTrechoPath: "recomenda.data" },
        { id: "map_rec_sit", reportFieldId: "field_pronampe_receita_situacao_cadastral", reportFieldLabel: "Situação Cadastral", jsonPath: "identificacaoCadastral.situacaoCadastral", sourceTrechoPath: "recomenda.data" },
        { id: "map_rec_dt", reportFieldId: "field_pronampe_receita_data_abertura", reportFieldLabel: "Abertura", jsonPath: "identificacaoCadastral.dataFundacao", sourceTrechoPath: "recomenda.data" },
        { id: "map_rec_cnae", reportFieldId: "field_pronampe_receita_cnae_principal", reportFieldLabel: "CNAE Principal", jsonPath: "pgfn.retorno.cnaeDescricao", sourceTrechoPath: "" },
        { id: "map_rec_tel", reportFieldId: "field_pronampe_receita_telefones", reportFieldLabel: "Telefones", jsonPath: "enderecos[0].telefone", sourceTrechoPath: "recomenda.data" },
        { id: "map_rec_end", reportFieldId: "field_pronampe_receita_endereco", reportFieldLabel: "Endereço", jsonPath: "enderecos[0].endereco", sourceTrechoPath: "recomenda.data" }
      ],
      dedupFieldIds: [],
      computedFields: []
    },
    PRONAMPE_BUREAUS: {
      version: 2,
      groups: [],
      fieldMappings: [
        { id: "map_bur_qs", reportFieldId: "field_pronampe_bureaus_quod_score", reportFieldLabel: "Score Quod", jsonPath: "quod.pessoaJuridica.score", sourceTrechoPath: "" },
        { id: "map_bur_qf", reportFieldId: "field_pronampe_bureaus_quod_faixa", reportFieldLabel: "Faixa Quod", jsonPath: "quod.pessoaJuridica.faixaScore", sourceTrechoPath: "" },
        { id: "map_bur_bs", reportFieldId: "field_pronampe_bureaus_boavista_score", reportFieldLabel: "Score Boa Vista", jsonPath: "boaVista.score", sourceTrechoPath: "" },
        { id: "map_bur_bf", reportFieldId: "field_pronampe_bureaus_boavista_faixa", reportFieldLabel: "Faixa Boa Vista", jsonPath: "boaVista.risk", sourceTrechoPath: "" }
      ],
      dedupFieldIds: [],
      computedFields: []
    },
    PRONAMPE_BACEN: {
      version: 2,
      groups: [],
      fieldMappings: [
        { id: "map_bac_lim", reportFieldId: "field_pronampe_bacen_limite", reportFieldLabel: "Limite de Crédito", jsonPath: "carteiraCredito.limite", sourceTrechoPath: "scrBacen.retorno" },
        { id: "map_bac_prej", reportFieldId: "field_pronampe_bacen_prejuizo", reportFieldLabel: "Prejuízo", jsonPath: "carteiraCredito.prejuizo", sourceTrechoPath: "scrBacen.retorno" },
        { id: "map_bac_ass", reportFieldId: "field_pronampe_bacen_obrigacao_assumida", reportFieldLabel: "Obrigação Assumida", jsonPath: "obrigacaoAssumida", sourceTrechoPath: "scrBacen.retorno" },
        { id: "map_bac_ven", reportFieldId: "field_pronampe_bacen_vencer", reportFieldLabel: "A Vencer", jsonPath: "carteiraCredito.vencer", sourceTrechoPath: "scrBacen.retorno" },
        { id: "map_bac_venc", reportFieldId: "field_pronampe_bacen_vencido", reportFieldLabel: "Vencido", jsonPath: "carteiraCredito.vencido", sourceTrechoPath: "scrBacen.retorno" },
        { id: "map_bac_resp", reportFieldId: "field_pronampe_bacen_responsabilidade_total", reportFieldLabel: "Responsabilidade Total", jsonPath: "responsabilidadeTotal", sourceTrechoPath: "scrBacen.retorno" },
        { id: "map_bac_risk", reportFieldId: "field_pronampe_bacen_faixa_risco", reportFieldLabel: "Faixa de Risco", jsonPath: "faixaRisco", sourceTrechoPath: "scrBacen.retorno" }
      ],
      dedupFieldIds: [],
      computedFields: []
    }
  };

  const productCode = "RADAR_PRONAMPE_PJ";
  const product = await prisma.providerProduct.upsert({
    where: { providerId_code: { providerId: provider.id, code: productCode } },
    update: {
      name: "Radar PRONAMPE (CNPJ)",
      externalId: "radar-pronampe-pj",
      endpointPath: "/consult/radar-pronampe",
      method: HttpMethod.POST,
      cost: 3.57,
      consultationPrice: 6.90,
      isActive: true,
      sampleResponse: sampleResponse as any,
      bodyTemplate: { document: "$document" } as any,
      typeItemFilters: typeItemFilters as any,
      consultationTypeId: compostaType?.id
    },
    create: {
      providerId: provider.id,
      name: "Radar PRONAMPE (CNPJ)",
      code: productCode,
      externalId: "radar-pronampe-pj",
      endpointPath: "/consult/radar-pronampe",
      method: HttpMethod.POST,
      cost: 3.57,
      consultationPrice: 6.90,
      isActive: true,
      sampleResponse: sampleResponse as any,
      bodyTemplate: { document: "$document" } as any,
      typeItemFilters: typeItemFilters as any,
      consultationTypeId: compostaType?.id
    }
  });
  console.log(`Configured product: ID=${product.id}, Code=${product.code}`);

  // 5. Configurar Mapeamentos de Retorno (ProviderFieldMapping)
  await prisma.providerFieldMapping.deleteMany({
    where: { productId: product.id }
  });

  const mappingsToCreate = [
    // PRONAMPE Root Mappings (para mapear os trechos na tela)
    { sourcePath: "recomenda.data", pathKey: "PRONAMPE_RESULTADO" },
    { sourcePath: "recomenda.data.quadroSocietarioCompleto", pathKey: "PRONAMPE_SOCIOS" },
    { sourcePath: "pgfn.retorno.naturezas", pathKey: "PRONAMPE_PGFN" },
    { sourcePath: "recomenda.data", pathKey: "PRONAMPE_RECEITA" },
    { sourcePath: "", pathKey: "PRONAMPE_BUREAUS" },
    { sourcePath: "scrBacen.retorno", pathKey: "PRONAMPE_BACEN" },

    // PRONAMPE_RESULTADO Mappings
    { sourcePath: "recomenda.data.tipoRecomendacaoVenda", pathKey: "PRONAMPE_RESULTADO.recomendacao_final" },
    { sourcePath: "recomenda.data.valorLimiteRecomendado", pathKey: "PRONAMPE_RESULTADO.credito_estimado" },
    { sourcePath: "quod.pessoaJuridica.faixaScore", pathKey: "PRONAMPE_RESULTADO.prob_inadimplencia" },
    { sourcePath: "recomenda.data.codNivelRisco", pathKey: "PRONAMPE_RESULTADO.rating_bancario" },
    { sourcePath: "quod.pessoaJuridica.score", pathKey: "PRONAMPE_RESULTADO.score" },
    { sourcePath: "recomenda.data.faturamentoEstimado", pathKey: "PRONAMPE_RESULTADO.faturamento_estimado" },
    { sourcePath: "scrBacen.retorno.responsabilidadeTotal", pathKey: "PRONAMPE_RESULTADO.gasto_estimado" },
    { sourcePath: "recomenda.data.mensagemScore", pathKey: "PRONAMPE_RESULTADO.parecer_executivo" },

    // PRONAMPE_SOCIOS Mappings (Array)
    { sourcePath: "recomenda.data.quadroSocietarioCompleto[*].nome", pathKey: "PRONAMPE_SOCIOS[].nome" },
    { sourcePath: "recomenda.data.quadroSocietarioCompleto[*].documento", pathKey: "PRONAMPE_SOCIOS[].documento" },
    { sourcePath: "recomenda.data.quadroSocietarioCompleto[*].vinculo", pathKey: "PRONAMPE_SOCIOS[].vinculo" },
    { sourcePath: "recomenda.data.quadroSocietarioCompleto[*].capitalTotal", pathKey: "PRONAMPE_SOCIOS[].participacao" },
    { sourcePath: "recomenda.data.quadroSocietarioCompleto[*].anotacoesNegativas[0].valorTotalRefin", pathKey: "PRONAMPE_SOCIOS[].total_refin" },
    { sourcePath: "recomenda.data.quadroSocietarioCompleto[*].anotacoesNegativas[0].quantidadeTotalRefin", pathKey: "PRONAMPE_SOCIOS[].qtd_refin" },
    { sourcePath: "recomenda.data.quadroSocietarioCompleto[*].anotacoesNegativas[0].valorTotalProtesto", pathKey: "PRONAMPE_SOCIOS[].total_protestos" },
    { sourcePath: "recomenda.data.quadroSocietarioCompleto[*].anotacoesNegativas[0].quantidadeTotalProtesto", pathKey: "PRONAMPE_SOCIOS[].qtd_protestos" },

    // PRONAMPE_PGFN Mappings (Array)
    { sourcePath: "pgfn.retorno.naturezas[*].tipoDivida", pathKey: "PRONAMPE_PGFN[].tipo_divida" },
    { sourcePath: "pgfn.retorno.naturezas[*].numeroInscricao", pathKey: "PRONAMPE_PGFN[].numero_inscricao" },
    { sourcePath: "pgfn.retorno.naturezas[*].total", pathKey: "PRONAMPE_PGFN[].valor" },

    // PRONAMPE_RECEITA Mappings
    { sourcePath: "recomenda.data.razaoSocial", pathKey: "PRONAMPE_RECEITA.razao_social" },
    { sourcePath: "recomenda.data.identificacaoCadastral.situacaoCadastral", pathKey: "PRONAMPE_RECEITA.situacao_cadastral" },
    { sourcePath: "recomenda.data.identificacaoCadastral.dataFundacao", pathKey: "PRONAMPE_RECEITA.data_abertura" },
    { sourcePath: "pgfn.retorno.cnaeDescricao", pathKey: "PRONAMPE_RECEITA.cnae_principal" },
    { sourcePath: "recomenda.data.enderecos[0].telefone", pathKey: "PRONAMPE_RECEITA.telefones" },
    { sourcePath: "recomenda.data.enderecos[0].endereco", pathKey: "PRONAMPE_RECEITA.endereco" },

    // PRONAMPE_BUREAUS Mappings
    { sourcePath: "quod.pessoaJuridica.score", pathKey: "PRONAMPE_BUREAUS.quod_score" },
    { sourcePath: "quod.pessoaJuridica.faixaScore", pathKey: "PRONAMPE_BUREAUS.quod_faixa" },
    { sourcePath: "boaVista.score", pathKey: "PRONAMPE_BUREAUS.boavista_score" },
    { sourcePath: "boaVista.risk", pathKey: "PRONAMPE_BUREAUS.boavista_faixa" },

    // PRONAMPE_BACEN Mappings
    { sourcePath: "scrBacen.retorno.carteiraCredito.limite", pathKey: "PRONAMPE_BACEN.limite" },
    { sourcePath: "scrBacen.retorno.carteiraCredito.prejuizo", pathKey: "PRONAMPE_BACEN.prejuizo" },
    { sourcePath: "scrBacen.retorno.obrigacaoAssumida", pathKey: "PRONAMPE_BACEN.obrigacao_assumida" },
    { sourcePath: "scrBacen.retorno.carteiraCredito.vencer", pathKey: "PRONAMPE_BACEN.vencer" },
    { sourcePath: "scrBacen.retorno.carteiraCredito.vencido", pathKey: "PRONAMPE_BACEN.vencido" },
    { sourcePath: "scrBacen.retorno.responsabilidadeTotal", pathKey: "PRONAMPE_BACEN.responsabilidade_total" },
    { sourcePath: "scrBacen.retorno.faixaRisco", pathKey: "PRONAMPE_BACEN.faixa_risco" }
  ];

  for (let idx = 0; idx < mappingsToCreate.length; idx += 1) {
    const m = mappingsToCreate[idx];
    const canonical = await prisma.canonicalFieldCatalog.findUnique({
      where: { pathKey: m.pathKey }
    });

    if (!canonical) {
      console.warn(`Warning: Canonical field ${m.pathKey} not found in database!`);
      continue;
    }

    await prisma.providerFieldMapping.create({
      data: {
        productId: product.id,
        canonicalFieldId: canonical.id,
        sourcePath: m.sourcePath,
        sortOrder: idx,
        isActive: true,
      }
    });
  }

  console.log(`Configured ${mappingsToCreate.length} mappings for Radar PRONAMPE query!`);
  console.log("Configuration successfully completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
