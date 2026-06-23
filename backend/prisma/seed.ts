import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';

import {
  PrismaClient,
  Role,
  TemplateVisibility,
  ProviderAuthType,
  ProviderOperationType,
  HttpMethod,
} from '@prisma/client';
// @ts-ignore
import bcrypt from 'bcryptjs';
import { DEFAULT_CANONICAL_SECTION_FIELDS } from '../src/modules/admin/canonical-field-defaults';

const prisma = new PrismaClient();

const mockProviders = [
  {
    slug: 'sollos',
    name: 'Sollos',
    baseUrl: 'https://api.sollos.com.br/v2',
    balancePath: '/account/balance',
    rechargePath: '/account/recharge',
    authType: ProviderAuthType.BEARER,
    credentials: { token: '***demo***' },
    isActive: true,
  },
  {
    slug: 'ehm',
    name: 'EHM',
    baseUrl: 'https://api.ehm.com.br/api',
    balancePath: '/saldo',
    rechargePath: '/recarga',
    authType: ProviderAuthType.API_KEY,
    credentials: { 'x-api-key': '***demo***' },
    isActive: true,
  },
  {
    slug: 'brasil-cred',
    name: 'Brasil Cred',
    baseUrl: 'https://sets.brasilcred.com.br/functions/v1/api-gateway/api/v1',
    balancePath: '/account',
    rechargePath: '/recharge',
    authType: ProviderAuthType.BEARER,
    credentials: { token: 'bc_live_demo' },
    isActive: true,
  },
  {
    slug: 'ksi',
    name: 'KSI',
    baseUrl: 'https://ksi.com.br/api/v1',
    balancePath: '/credits',
    rechargePath: '/credits/add',
    authType: ProviderAuthType.BEARER,
    credentials: { token: '***demo***' },
    isActive: true,
  },
  {
    slug: 'iconsulte',
    name: 'iConsulte',
    baseUrl: 'https://api.iconsulte.com.br',
    balancePath: '/account/credits',
    rechargePath: '/account/topup',
    authType: ProviderAuthType.API_KEY,
    credentials: { Authorization: '***demo***' },
    isActive: true,
  },
] as const;

const sollosSampleResponse = {
  status: 'ok',
  dados_pessoais: { nome: 'João Silva', cpf: '123.456.789-00', nascimento: '1985-05-15' },
  spc: { total_registros: 3, valor_total: 1520.4, registros: [{ credor: 'Loja X', valor: 450.0, data: '2025-08-10' }] },
  serasa: { score: 320, total_registros: 2, valor_total: 3200.0 },
  score: { valor: 320, faixa: 'ruim', probabilidade: '15.2%' },
};

const ehmSampleResponse = {
  resultado: {
    pontuacao: { score: 450, classificacao: 'regular' },
    restricoes_spc: { quantidade: 1, total: 300.0 },
    restricoes_serasa: { quantidade: 0, total: 0 },
    protestos: { quantidade: 2, valor_total: 1200.0 },
  },
};

async function main() {
  const passwordHash = await bcrypt.hash('@123456a', 10);

  const tenant = await prisma.tenant.upsert({
    where: { slug: 'consultas-pro' },
    update: {},
    create: {
      name: 'Consultas PRO',
      slug: 'consultas-pro',
      branding: {
        logo: 'consultas-pro',
        primaryColor: '#0F172A',
      },
    },
  });

  await prisma.user.upsert({
    where: { email: 'admin@consultas.pro' },
    update: {
      fullName: 'Administrador Plataforma',
      passwordHash,
      role: Role.PLATFORM_ADMIN,
      isActive: true,
    },
    create: {
      fullName: 'Administrador Plataforma',
      email: 'admin@consultas.pro',
      document: '00000000000',
      phone: '31999999999',
      role: Role.PLATFORM_ADMIN,
      passwordHash,
    },
  });

  const canonicalFields = [
    ['DADOS_PESSOAIS.nome_completo', 'Nome completo', 'string'],
    ['DADOS_PESSOAIS.documento', 'Documento', 'string'],
    ['DADOS_PESSOAIS.data_nascimento', 'Data de nascimento', 'date'],
    ['DADOS_PESSOAIS.nome_mae', 'Nome da mãe', 'string'],
    ['DADOS_PESSOAIS.telefone', 'Telefone', 'string'],
    ['DADOS_PESSOAIS.email', 'Email', 'string'],
    ['SCORE.valor', 'Valor do score', 'number'],
    ['SCORE.faixa', 'Faixa do score', 'string'],
    ['RATING.classificacao', 'Classificação do rating', 'string'],
    ['RATING.renda_presumida', 'Renda presumida', 'currency'],
    ['RATING.capacidade_pagamento', 'Capacidade de pagamento', 'currency'],
    ['RATING.risco_credito', 'Risco de crédito', 'string'],
    ['DIVIDAS_SPC[].credor', 'Credor SPC', 'string'],
    ['DIVIDAS_SPC[].valor', 'Valor SPC', 'currency'],
    ['DIVIDAS_SPC[].data_vencimento', 'Data de vencimento SPC', 'date'],
    ['DIVIDAS_SERASA[].credor', 'Credor Serasa', 'string'],
    ['DIVIDAS_SERASA[].valor', 'Valor Serasa', 'currency'],
    ['DIVIDAS_SERASA[].data_vencimento', 'Data de vencimento Serasa', 'date'],
    ['DIVIDAS_BOA_VISTA[].credor', 'Credor Boa Vista', 'string'],
    ['DIVIDAS_BOA_VISTA[].valor', 'Valor Boa Vista', 'currency'],
    ['DIVIDAS_BOA_VISTA[].data_vencimento', 'Data de vencimento Boa Vista', 'date'],
    ['APONTAMENTOS_BACEN[].contrato', 'Contrato Bacen', 'string'],
    ['APONTAMENTOS_BACEN[].valor_vencido', 'Valor vencido Bacen', 'currency'],
    ['APONTAMENTOS_BACEN[].valor_a_vencer', 'Valor a vencer Bacen', 'currency'],
    ['PROTESTO_CARTORIO[].cartorio', 'Cartório', 'string'],
    ['PROTESTO_CARTORIO[].valor', 'Valor protesto', 'currency'],
    ['PROTESTO_CARTORIO[].data', 'Data protesto', 'date'],
  ];

  for (const [pathKey, label, dataType] of canonicalFields) {
    await prisma.canonicalFieldCatalog.upsert({
      where: { pathKey },
      update: { label, dataType },
      create: { pathKey, label, dataType },
    });
  }

  // Configurações padrão de reportFieldConfig para cada seção canônica
  const defaultSectionReportFields: Record<string, { version: number; title: string; fields: Array<{ id: string; key: string; label: string; dataType: string; sortOrder: number }> }> = {
    DADOS_PESSOAIS: {
      version: 1, title: 'Dados Pessoais',
      fields: [
        { id: 'field_dados_pessoais_nome_completo', key: 'nome_completo', label: 'Nome Completo', dataType: 'text', sortOrder: 0 },
        { id: 'field_dados_pessoais_documento', key: 'documento', label: 'Documento', dataType: 'document', sortOrder: 1 },
        { id: 'field_dados_pessoais_data_nascimento', key: 'data_nascimento', label: 'Data de Nascimento', dataType: 'date', sortOrder: 2 },
        { id: 'field_dados_pessoais_nome_mae', key: 'nome_mae', label: 'Nome da Mãe', dataType: 'text', sortOrder: 3 },
        { id: 'field_dados_pessoais_telefone', key: 'telefone', label: 'Telefone', dataType: 'text', sortOrder: 4 },
        { id: 'field_dados_pessoais_email', key: 'email', label: 'Email', dataType: 'text', sortOrder: 5 },
      ]
    },
    SCORE: {
      version: 1, title: 'Score de Crédito',
      fields: [
        { id: 'field_score_valor', key: 'valor', label: 'Valor do Score', dataType: 'numeric', sortOrder: 0 },
        { id: 'field_score_faixa', key: 'faixa', label: 'Faixa do Score', dataType: 'text', sortOrder: 1 },
        { id: 'field_score_chance_pagar', key: 'chancePagar', label: 'Chance de Pagar', dataType: 'percent', sortOrder: 2 },
        { id: 'field_score_prob_inadimplencia', key: 'probabilidadeInadimplencia', label: 'Probabilidade de Inadimplência', dataType: 'percent', sortOrder: 3 },
      ]
    },
    RATING: {
      version: 1, title: 'Rating de Crédito',
      fields: [
        { id: 'field_rating_classificacao', key: 'classificacao', label: 'Classificação', dataType: 'text', sortOrder: 0 },
        { id: 'field_rating_renda_presumida', key: 'renda_presumida', label: 'Renda Presumida', dataType: 'currency', sortOrder: 1 },
        { id: 'field_rating_capacidade_pagamento', key: 'capacidade_pagamento', label: 'Capacidade de Pagamento', dataType: 'currency', sortOrder: 2 },
        { id: 'field_rating_risco_credito', key: 'risco_credito', label: 'Risco de Crédito', dataType: 'text', sortOrder: 3 },
      ]
    },
    DIVIDAS_SPC: {
      version: 1, title: 'Dívidas SPC',
      fields: [
        { id: 'field_dividas_spc_credor', key: 'credor', label: 'Credor', dataType: 'text', sortOrder: 0 },
        { id: 'field_dividas_spc_valor', key: 'valor', label: 'Valor', dataType: 'currency', sortOrder: 1 },
        { id: 'field_dividas_spc_data_vencimento', key: 'data_vencimento', label: 'Data de Vencimento', dataType: 'date', sortOrder: 2 },
      ]
    },
    DIVIDAS_SERASA: {
      version: 1, title: 'Dívidas Serasa',
      fields: [
        { id: 'field_dividas_serasa_credor', key: 'credor', label: 'Credor', dataType: 'text', sortOrder: 0 },
        { id: 'field_dividas_serasa_valor', key: 'valor', label: 'Valor', dataType: 'currency', sortOrder: 1 },
        { id: 'field_dividas_serasa_data_vencimento', key: 'data_vencimento', label: 'Data de Vencimento', dataType: 'date', sortOrder: 2 },
      ]
    },
    DIVIDAS_BOA_VISTA: {
      version: 1, title: 'Dívidas Boa Vista',
      fields: [
        { id: 'field_dividas_boa_vista_credor', key: 'credor', label: 'Credor', dataType: 'text', sortOrder: 0 },
        { id: 'field_dividas_boa_vista_valor', key: 'valor', label: 'Valor', dataType: 'currency', sortOrder: 1 },
        { id: 'field_dividas_boa_vista_data_vencimento', key: 'data_vencimento', label: 'Data de Vencimento', dataType: 'date', sortOrder: 2 },
      ]
    },
    APONTAMENTOS_BACEN: {
      version: 1, title: 'Apontamentos BACEN',
      fields: [
        { id: 'field_apontamentos_bacen_contrato', key: 'contrato', label: 'Contrato', dataType: 'text', sortOrder: 0 },
        { id: 'field_apontamentos_bacen_valor_vencido', key: 'valor_vencido', label: 'Valor Vencido', dataType: 'currency', sortOrder: 1 },
        { id: 'field_apontamentos_bacen_valor_a_vencer', key: 'valor_a_vencer', label: 'Valor a Vencer', dataType: 'currency', sortOrder: 2 },
      ]
    },
    PROTESTO_CARTORIO: {
      version: 1, title: 'Protestos em Cartório',
      fields: [
        { id: 'field_protesto_cartorio_cartorio', key: 'cartorio', label: 'Cartório', dataType: 'text', sortOrder: 0 },
        { id: 'field_protesto_cartorio_valor', key: 'valor', label: 'Valor', dataType: 'currency', sortOrder: 1 },
        { id: 'field_protesto_cartorio_data', key: 'data', label: 'Data', dataType: 'date', sortOrder: 2 },
      ]
    },
  };

  for (const row of DEFAULT_CANONICAL_SECTION_FIELDS) {
    const reportFieldConfig = defaultSectionReportFields[row.pathKey] ?? null;
    await prisma.canonicalFieldCatalog.upsert({
      where: { pathKey: row.pathKey },
      update: {
        label: row.label,
        description: row.description,
        dataType: 'object',
        ...(reportFieldConfig ? { reportFieldConfig: reportFieldConfig as any } : {}),
      },
      create: {
        pathKey: row.pathKey,
        label: row.label,
        description: row.description,
        dataType: 'object',
        ...(reportFieldConfig ? { reportFieldConfig: reportFieldConfig as any } : {}),
      },
    });
  }

  const consultationTypes = [
    ['spc_full', 'Consulta SPC', 'Consulta focada em dados de SPC e apontamentos correlatos'],
    ['serasa_full', 'Consulta Serasa', 'Consulta focada em dados de Serasa'],
    ['boa_vista_full', 'Consulta Boa Vista', 'Consulta focada em dados de Boa Vista'],
    ['score_rating', 'Score e Rating', 'Consulta de score, rating e indicadores de crédito'],
    ['bacen_registrato', 'Registrato Bacen', 'Consulta de contratos Bacen, dívidas vencidas e a vencer'],
    ['protesto_cartorio', 'Protestos', 'Consulta de protestos e cartórios'],
    ['consulta_composta', 'Consulta composta', 'Consulta que retorna múltiplas seções combinadas'],
  ];

  for (const [key, name, description] of consultationTypes) {
    await prisma.consultationType.upsert({
      where: { key },
      update: { name, description },
      create: { key, name, description },
    });
  }

  const demoCompany = await prisma.company.upsert({
    where: { slug: 'empresa-demo' },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Empresa Demo',
      slug: 'empresa-demo',
      document: '12345678000199',
      email: 'contato@empresademo.local',
      phone: '3133333333',
    },
  });

  await prisma.wallet.upsert({
    where: { companyId: demoCompany.id },
    update: {},
    create: {
      companyId: demoCompany.id,
      balance: 0,
    },
  });

  await prisma.user.upsert({
    where: { email: 'owner@empresademo.local' },
    update: {},
    create: {
      fullName: 'Responsável Empresa Demo',
      email: 'owner@empresademo.local',
      document: '11111111111',
      phone: '31988888888',
      role: Role.COMPANY_OWNER,
      companyId: demoCompany.id,
      passwordHash,
    },
  });

  const existingTemplate = await prisma.template.findFirst({
    where: { name: 'Template básico score' },
  });

  if (!existingTemplate) {
    await prisma.template.create({
      data: {
        name: 'Template básico score',
        description: 'Template global de exemplo',
        visibility: TemplateVisibility.GLOBAL,
      },
    });
  }

  const composta = await prisma.consultationType.findUniqueOrThrow({ where: { key: 'consulta_composta' } });
  const scoreType = await prisma.consultationType.findUniqueOrThrow({ where: { key: 'score_rating' } });

  const sectionId = async (pathKey: string) => {
    const f = await prisma.canonicalFieldCatalog.findUniqueOrThrow({ where: { pathKey } });
    return f.id;
  };

  for (const p of mockProviders) {
    const provider = await prisma.provider.upsert({
      where: { slug: p.slug },
      update: {
        name: p.name,
        baseUrl: p.baseUrl,
        authType: p.authType,
        credentials: p.credentials as object,
        isActive: p.isActive,
      },
      create: {
        slug: p.slug,
        name: p.name,
        baseUrl: p.baseUrl,
        authType: p.authType,
        credentials: p.credentials as object,
        isActive: p.isActive,
      },
    });

    await prisma.providerOperation.deleteMany({
      where: {
        providerId: provider.id,
        name: { in: ['Saldo', 'Recarga'] },
      },
    });

    await prisma.providerOperation.createMany({
      data: [
        {
          providerId: provider.id,
          operationType: ProviderOperationType.BALANCE_CHECK,
          name: 'Saldo',
          path: p.balancePath,
          method: HttpMethod.GET,
        },
        {
          providerId: provider.id,
          operationType: ProviderOperationType.RECHARGE,
          name: 'Recarga',
          path: p.rechargePath,
          method: HttpMethod.POST,
        },
      ],
    });
  }

  const sollos = await prisma.provider.findUniqueOrThrow({ where: { slug: 'sollos' } });
  const ehm = await prisma.provider.findUniqueOrThrow({ where: { slug: 'ehm' } });

  const productSollos = await prisma.providerProduct.upsert({
    where: { providerId_code: { providerId: sollos.id, code: 'SOLLOS_FULL_PF' } },
    update: {
      name: 'Consulta Completa PF',
      externalId: 'SOLLOS_FULL_PF',
      endpointPath: '/consulta/pf/completa',
      method: HttpMethod.POST,
      cost: 12.5,
      consultationPrice: 18.9,
      isActive: true,
      consultationTypeId: composta.id,
      sampleResponse: sollosSampleResponse as object,
    },
    create: {
      providerId: sollos.id,
      consultationTypeId: composta.id,
      name: 'Consulta Completa PF',
      code: 'SOLLOS_FULL_PF',
      externalId: 'SOLLOS_FULL_PF',
      endpointPath: '/consulta/pf/completa',
      method: HttpMethod.POST,
      cost: 12.5,
      consultationPrice: 18.9,
      isActive: true,
      sampleResponse: sollosSampleResponse as object,
    },
  });

  const productEhm = await prisma.providerProduct.upsert({
    where: { providerId_code: { providerId: ehm.id, code: 'EHM_SCORE_REST' } },
    update: {
      name: 'Score + Restrições',
      externalId: 'EHM_SCORE_REST',
      endpointPath: '/consulta/score-restricoes',
      method: HttpMethod.POST,
      cost: 8,
      consultationPrice: 12.0,
      isActive: true,
      consultationTypeId: scoreType.id,
      sampleResponse: ehmSampleResponse as object,
    },
    create: {
      providerId: ehm.id,
      consultationTypeId: scoreType.id,
      name: 'Score + Restrições',
      code: 'EHM_SCORE_REST',
      externalId: 'EHM_SCORE_REST',
      endpointPath: '/consulta/score-restricoes',
      method: HttpMethod.POST,
      cost: 8,
      consultationPrice: 12.0,
      isActive: true,
      sampleResponse: ehmSampleResponse as object,
    },
  });

  await prisma.providerFieldMapping.deleteMany({
    where: { productId: { in: [productSollos.id, productEhm.id] } },
  });

  const sollosTypeItemFilters = {
    DADOS_PESSOAIS: {
      version: 2, groups: [],
      fieldMappings: [
        { id: 'map_sol_dp_nome', reportFieldId: 'field_dados_pessoais_nome_completo', reportFieldLabel: 'Nome Completo', jsonPath: 'nome', sourceTrechoPath: 'dados_pessoais' },
        { id: 'map_sol_dp_doc', reportFieldId: 'field_dados_pessoais_documento', reportFieldLabel: 'Documento', jsonPath: 'cpf', sourceTrechoPath: 'dados_pessoais' },
        { id: 'map_sol_dp_nasc', reportFieldId: 'field_dados_pessoais_data_nascimento', reportFieldLabel: 'Data de Nascimento', jsonPath: 'nascimento', sourceTrechoPath: 'dados_pessoais' },
      ],
      dedupFieldIds: [], computedFields: []
    },
    DIVIDAS_SPC: {
      version: 2, groups: [],
      fieldMappings: [
        { id: 'map_sol_spc_cred', reportFieldId: 'field_dividas_spc_credor', reportFieldLabel: 'Credor', jsonPath: 'credor', sourceTrechoPath: 'spc.registros' },
        { id: 'map_sol_spc_val', reportFieldId: 'field_dividas_spc_valor', reportFieldLabel: 'Valor', jsonPath: 'valor', sourceTrechoPath: 'spc.registros' },
        { id: 'map_sol_spc_dt', reportFieldId: 'field_dividas_spc_data_vencimento', reportFieldLabel: 'Data de Vencimento', jsonPath: 'data', sourceTrechoPath: 'spc.registros' },
      ],
      dedupFieldIds: [], computedFields: []
    },
    DIVIDAS_SERASA: {
      version: 2, groups: [],
      fieldMappings: [
        { id: 'map_sol_ser_val', reportFieldId: 'field_dividas_serasa_valor', reportFieldLabel: 'Valor', jsonPath: 'total_registros', sourceTrechoPath: 'serasa' },
      ],
      dedupFieldIds: [], computedFields: []
    },
    SCORE: {
      version: 2, groups: [],
      fieldMappings: [
        { id: 'map_sol_sc_val', reportFieldId: 'field_score_valor', reportFieldLabel: 'Valor do Score', jsonPath: 'valor', sourceTrechoPath: 'score' },
        { id: 'map_sol_sc_faixa', reportFieldId: 'field_score_faixa', reportFieldLabel: 'Faixa do Score', jsonPath: 'faixa', sourceTrechoPath: 'score' },
        { id: 'map_sol_sc_prob', reportFieldId: 'field_score_prob_inadimplencia', reportFieldLabel: 'Probabilidade de Inadimplência', jsonPath: 'probabilidade', sourceTrechoPath: 'score' },
      ],
      dedupFieldIds: [], computedFields: []
    },
  };

  // Atualizar typeItemFilters do produto Sollos
  await prisma.providerProduct.update({
    where: { id: productSollos.id },
    data: { typeItemFilters: sollosTypeItemFilters as any }
  });

  const ehmTypeItemFilters = {
    SCORE: {
      version: 2, groups: [],
      fieldMappings: [
        { id: 'map_ehm_sc_val', reportFieldId: 'field_score_valor', reportFieldLabel: 'Valor do Score', jsonPath: 'score', sourceTrechoPath: 'resultado.pontuacao' },
        { id: 'map_ehm_sc_faixa', reportFieldId: 'field_score_faixa', reportFieldLabel: 'Faixa do Score', jsonPath: 'classificacao', sourceTrechoPath: 'resultado.pontuacao' },
      ],
      dedupFieldIds: [], computedFields: []
    },
    DIVIDAS_SPC: {
      version: 2, groups: [],
      fieldMappings: [
        { id: 'map_ehm_spc_val', reportFieldId: 'field_dividas_spc_valor', reportFieldLabel: 'Valor', jsonPath: 'total', sourceTrechoPath: 'resultado.restricoes_spc' },
      ],
      dedupFieldIds: [], computedFields: []
    },
    DIVIDAS_SERASA: {
      version: 2, groups: [],
      fieldMappings: [
        { id: 'map_ehm_ser_val', reportFieldId: 'field_dividas_serasa_valor', reportFieldLabel: 'Valor', jsonPath: 'total', sourceTrechoPath: 'resultado.restricoes_serasa' },
      ],
      dedupFieldIds: [], computedFields: []
    },
    PROTESTO_CARTORIO: {
      version: 2, groups: [],
      fieldMappings: [
        { id: 'map_ehm_prot_val', reportFieldId: 'field_protesto_cartorio_valor', reportFieldLabel: 'Valor', jsonPath: 'valor_total', sourceTrechoPath: 'resultado.protestos' },
      ],
      dedupFieldIds: [], computedFields: []
    },
  };

  // Atualizar typeItemFilters do produto EHM
  await prisma.providerProduct.update({
    where: { id: productEhm.id },
    data: { typeItemFilters: ehmTypeItemFilters as any }
  });

  const sollosMappings: Array<{ sourcePath: string; pathKey: string; sortOrder: number }> = [
    { sourcePath: 'dados_pessoais', pathKey: 'DADOS_PESSOAIS', sortOrder: 0 },
    { sourcePath: 'spc', pathKey: 'DIVIDAS_SPC', sortOrder: 1 },
    { sourcePath: 'serasa', pathKey: 'DIVIDAS_SERASA', sortOrder: 2 },
    { sourcePath: 'score', pathKey: 'SCORE', sortOrder: 3 },
  ];

  for (const m of sollosMappings) {
    await prisma.providerFieldMapping.create({
      data: {
        productId: productSollos.id,
        canonicalFieldId: await sectionId(m.pathKey),
        sourcePath: m.sourcePath,
        sortOrder: m.sortOrder,
      },
    });
  }

  const ehmMappings: Array<{ sourcePath: string; pathKey: string; sortOrder: number }> = [
    { sourcePath: 'resultado.pontuacao', pathKey: 'SCORE', sortOrder: 0 },
    { sourcePath: 'resultado.restricoes_spc', pathKey: 'DIVIDAS_SPC', sortOrder: 1 },
    { sourcePath: 'resultado.restricoes_serasa', pathKey: 'DIVIDAS_SERASA', sortOrder: 2 },
    { sourcePath: 'resultado.protestos', pathKey: 'PROTESTO_CARTORIO', sortOrder: 3 },
  ];

  for (const m of ehmMappings) {
    await prisma.providerFieldMapping.create({
      data: {
        productId: productEhm.id,
        canonicalFieldId: await sectionId(m.pathKey),
        sourcePath: m.sourcePath,
        sortOrder: m.sortOrder,
      },
    });
  }

  const templateBaseBlock = {
    name: 'Template Base',
    description: 'Estrutura base do relatório com header, dados pessoais, resumo financeiro e footer',
    category: 'system',
    template: `<section name="Header">
  <value>{$template.company}</value>
  <value>Relatório Analítico de Crédito</value>
  <value>{$template.date}</value>
  <value>{$template.protocol}</value>
</section>
<section name="Dados Pessoais">
  <card><label>Cliente Analisado</label><value>{$cliente.nome}</value></card>
  <card><label>Documento</label><value>{$cliente.documento}</value></card>
  <card><label>Tipo de Relatório</label><value>Padrão</value></card>
</section>
<section name="Resumo Financeiro">
  <card><label>Total Apontado</label><value>{$RESUMO_FINANCEIRO.totalApontado}</value></card>
  <card><label>Total Deduzido</label><value>{$RESUMO_FINANCEIRO.totalDeduzido}</value></card>
  <card><label>Risco Bacen (Vencido)</label><value>{$RESUMO_FINANCEIRO.riscoBacenVencido}</value></card>
</section>`,
  };

  const scoreBlock = {
    name: 'Score de Crédito',
    description: 'Bloco de score e métricas de crédito',
    category: 'score',
    template: `<section name="Score de Crédito">
  <speedometer value="{$SCORE.valor}" max="1000" />
  <card><label>Faixa</label><value>{$SCORE.faixa}</value></card>
  <card><label>Chance de pagar</label><value>{$SCORE.chancePagar}</value></card>
  <card><label>Inadimplência</label><value>{$SCORE.probabilidadeInadimplencia}</value></card>
</section>`,
  };

  const headerBlock = {
    name: 'Header',
    description: 'Cabeçalho do relatório com logo, empresa, título, data e protocolo',
    category: 'system',
    template: `<section name="Header" kind="header">
  <field label="Empresa" tag="label" font-size="10" color="#2563eb">{$template.company}</field>
  <field label="Título do relatório" tag="text" font-size="14">Relatório Analítico de Crédito</field>
  <field label="Data" tag="value">{$template.date}</field>
  <field label="Protocolo" tag="value">{$template.protocol}</field>
</section>`,
  };

  const personalDataBlock = {
    name: 'Dados Pessoais',
    description: 'Cards com nome, documento e tipo de relatório',
    category: 'system',
    template: `<section name="Dados Pessoais" kind="data">
  <field label="Cliente Analisado" icon="User" tag="value">{$cliente.nome}</field>
  <field label="Documento" icon="Hash" tag="value">{$cliente.documento}</field>
  <field label="Tipo de Relatório" icon="Tag" tag="value">Padrão</field>
</section>`,
  };

  const financialSummaryBlock = {
    name: 'Resumo Financeiro',
    description: 'Linha adaptativa de cards KPI financeiros',
    category: 'system',
    template: `<section name="Resumo Financeiro" kind="kpi-row">
  <field label="Total Apontado" tag="value" color="#dc2626">{$RESUMO_FINANCEIRO.totalApontado}</field>
  <field label="Total Deduzido" tag="value" color="#16a34a">{$RESUMO_FINANCEIRO.totalDeduzido}</field>
  <field label="Risco Bacen (Vencido)" tag="value" color="#ca8a04">{$RESUMO_FINANCEIRO.riscoBacenVencido}</field>
</section>`,
  };

  const debtTableBlock = {
    name: 'Tabela de Dívidas',
    description: 'Seção dinâmica onde os tipos de consulta encaixam seus registros',
    category: 'system',
    template: `<section name="Tabela de Dívidas" kind="debt-table">
  <field label="Tipo" tag="label">{$consulta.tipo}</field>
  <field label="Credor" tag="value">{$divida.credor}</field>
  <field label="Contrato" tag="value">{$divida.contrato}</field>
  <field label="Valor" tag="value" color="#dc2626">{$divida.valor}</field>
</section>`,
  };

  const cardKpiBlock = {
    name: 'Card KPI',
    description: 'Card com ícone, label e valor para linhas adaptativas',
    category: 'layout',
    template: `<card variant="kpi">
  <field label="Label" icon="Gauge" tag="label">Label</field>
  <field label="Valor" tag="value" font-size="16">{$}</field>
</card>`,
  };

  const containerBlock = {
    name: 'Container',
    description: 'Agrupador genérico para compor blocos customizados',
    category: 'layout',
    template: `<container cols="3">
</container>`,
  };

  const freeTextBlock = {
    name: 'Texto Livre',
    description: 'Texto livre com suporte a expressões dinâmicas',
    category: 'layout',
    template: `<text>Texto editável aqui</text>`,
  };

  for (const block of [headerBlock, personalDataBlock, financialSummaryBlock, scoreBlock, debtTableBlock, cardKpiBlock, containerBlock, freeTextBlock, templateBaseBlock]) {
    const existing = await prisma.customBlock.findFirst({
      where: { tenantId: tenant.id, name: block.name },
    });

    if (existing) {
      await prisma.customBlock.update({
        where: { id: existing.id },
        data: {
          description: block.description,
          category: block.category,
          template: block.template,
          skeleton: block.template,
          isSystem: true,
        },
      });
    } else {
      await prisma.customBlock.create({
        data: {
          tenantId: tenant.id,
          ...block,
          skeleton: block.template,
          variables: [],
          isSystem: true,
        },
      });
    }
  }

  // --- CONFIGURAÇÃO BRASIL CRED E RADAR PRONAMPE ---
  console.log("Configuring Brasil Cred & Radar PRONAMPE from main seed...");
  // O seed.ts fica em /backend/prisma/, portanto sobe dois níveis para chegar em /backend/ e então logs/
  const logFilePath = path.join(__dirname, '../../logs/radar_pronampe_brasilconsultas.json');
  if (fs.existsSync(logFilePath)) {
    const logFileContent = fs.readFileSync(logFilePath, 'utf-8');
    const logJson = JSON.parse(logFileContent);
    const sampleResponse = logJson.raw_data;

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

    const brasilCredProvider = await prisma.provider.findUniqueOrThrow({
      where: { slug: 'brasil-cred' }
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
      where: { providerId_code: { providerId: brasilCredProvider.id, code: productCode } },
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
        consultationTypeId: composta.id
      },
      create: {
        providerId: brasilCredProvider.id,
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
        consultationTypeId: composta.id
      }
    });

    await prisma.providerFieldMapping.deleteMany({
      where: { productId: product.id }
    });

    const mappingsToCreate = [
      { sourcePath: "recomenda.data.tipoRecomendacaoVenda", pathKey: "PRONAMPE_RESULTADO.recomendacao_final" },
      { sourcePath: "recomenda.data.valorLimiteRecomendado", pathKey: "PRONAMPE_RESULTADO.credito_estimado" },
      { sourcePath: "quod.pessoaJuridica.faixaScore", pathKey: "PRONAMPE_RESULTADO.prob_inadimplencia" },
      { sourcePath: "recomenda.data.codNivelRisco", pathKey: "PRONAMPE_RESULTADO.rating_bancario" },
      { sourcePath: "quod.pessoaJuridica.score", pathKey: "PRONAMPE_RESULTADO.score" },
      { sourcePath: "recomenda.data.faturamentoEstimado", pathKey: "PRONAMPE_RESULTADO.faturamento_estimado" },
      { sourcePath: "scrBacen.retorno.responsabilidadeTotal", pathKey: "PRONAMPE_RESULTADO.gasto_estimado" },
      { sourcePath: "recomenda.data.mensagemScore", pathKey: "PRONAMPE_RESULTADO.parecer_executivo" },

      { sourcePath: "recomenda.data.quadroSocietarioCompleto[*].nome", pathKey: "PRONAMPE_SOCIOS[].nome" },
      { sourcePath: "recomenda.data.quadroSocietarioCompleto[*].documento", pathKey: "PRONAMPE_SOCIOS[].documento" },
      { sourcePath: "recomenda.data.quadroSocietarioCompleto[*].vinculo", pathKey: "PRONAMPE_SOCIOS[].vinculo" },
      { sourcePath: "recomenda.data.quadroSocietarioCompleto[*].capitalTotal", pathKey: "PRONAMPE_SOCIOS[].participacao" },
      { sourcePath: "recomenda.data.quadroSocietarioCompleto[*].anotacoesNegativas[0].valorTotalRefin", pathKey: "PRONAMPE_SOCIOS[].total_refin" },
      { sourcePath: "recomenda.data.quadroSocietarioCompleto[*].anotacoesNegativas[0].quantidadeTotalRefin", pathKey: "PRONAMPE_SOCIOS[].qtd_refin" },
      { sourcePath: "recomenda.data.quadroSocietarioCompleto[*].anotacoesNegativas[0].valorTotalProtesto", pathKey: "PRONAMPE_SOCIOS[].total_protestos" },
      { sourcePath: "recomenda.data.quadroSocietarioCompleto[*].anotacoesNegativas[0].quantidadeTotalProtesto", pathKey: "PRONAMPE_SOCIOS[].qtd_protestos" },

      { sourcePath: "pgfn.retorno.naturezas[*].tipoDivida", pathKey: "PRONAMPE_PGFN[].tipo_divida" },
      { sourcePath: "pgfn.retorno.naturezas[*].numeroInscricao", pathKey: "PRONAMPE_PGFN[].numero_inscricao" },
      { sourcePath: "pgfn.retorno.naturezas[*].total", pathKey: "PRONAMPE_PGFN[].valor" },

      { sourcePath: "recomenda.data.razaoSocial", pathKey: "PRONAMPE_RECEITA.razao_social" },
      { sourcePath: "recomenda.data.identificacaoCadastral.situacaoCadastral", pathKey: "PRONAMPE_RECEITA.situacao_cadastral" },
      { sourcePath: "recomenda.data.identificacaoCadastral.dataFundacao", pathKey: "PRONAMPE_RECEITA.data_abertura" },
      { sourcePath: "pgfn.retorno.cnaeDescricao", pathKey: "PRONAMPE_RECEITA.cnae_principal" },
      { sourcePath: "recomenda.data.enderecos[0].telefone", pathKey: "PRONAMPE_RECEITA.telefones" },
      { sourcePath: "recomenda.data.enderecos[0].endereco", pathKey: "PRONAMPE_RECEITA.endereco" },

      { sourcePath: "quod.pessoaJuridica.score", pathKey: "PRONAMPE_BUREAUS.quod_score" },
      { sourcePath: "quod.pessoaJuridica.faixaScore", pathKey: "PRONAMPE_BUREAUS.quod_faixa" },
      { sourcePath: "boaVista.score", pathKey: "PRONAMPE_BUREAUS.boavista_score" },
      { sourcePath: "boaVista.risk", pathKey: "PRONAMPE_BUREAUS.boavista_faixa" },

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
      if (canonical) {
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
    }

    // Criar log de teste para o Radar PRONAMPE (Brasil Cred)
    const brasilCredProv = await prisma.provider.findUnique({ where: { slug: 'brasil-cred' } });
    if (brasilCredProv && sampleResponse) {
      const existingBcLog = await prisma.providerTestLog.findFirst({
        where: { productId: product.id }
      });
      if (!existingBcLog) {
        await prisma.providerTestLog.create({
          data: {
            providerId: brasilCredProv.id,
            productId: product.id,
            responsePayload: sampleResponse as any,
            success: true,
          }
        });
      }
    }
  }

  // Criar logs de teste de exemplo para os outros produtos (Sollos e EHM)
  console.log("Creating sample test logs for Sollos and EHM...");
  const sollosProvider = await prisma.provider.findUnique({ where: { slug: 'sollos' } });
  const ehmProvider = await prisma.provider.findUnique({ where: { slug: 'ehm' } });

  if (sollosProvider) {
    const sollosProd = await prisma.providerProduct.findFirst({
      where: { providerId: sollosProvider.id, code: 'SOLLOS_FULL_PF' }
    });
    if (sollosProd) {
      const existingLog = await prisma.providerTestLog.findFirst({
        where: { productId: sollosProd.id }
      });
      if (!existingLog) {
        await prisma.providerTestLog.create({
          data: {
            providerId: sollosProvider.id,
            productId: sollosProd.id,
            responsePayload: sollosSampleResponse as any,
            success: true,
          }
        });
      }
    }
  }

  if (ehmProvider) {
    const ehmProd = await prisma.providerProduct.findFirst({
      where: { providerId: ehmProvider.id, code: 'EHM_SCORE_REST' }
    });
    if (ehmProd) {
      const existingLog = await prisma.providerTestLog.findFirst({
        where: { productId: ehmProd.id }
      });
      if (!existingLog) {
        await prisma.providerTestLog.create({
          data: {
            providerId: ehmProvider.id,
            productId: ehmProd.id,
            responsePayload: ehmSampleResponse as any,
            success: true,
          }
        });
      }
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
