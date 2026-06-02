import 'dotenv/config';

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
    slug: 'brasil-consultas',
    name: 'Brasil Consultas',
    baseUrl: 'https://api.brasilconsultas.com.br',
    balancePath: '/v1/balance',
    rechargePath: '/v1/recharge',
    authType: ProviderAuthType.BASIC_AUTH,
    credentials: { username: 'demo', password: '***demo***' },
    isActive: false,
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

  for (const row of DEFAULT_CANONICAL_SECTION_FIELDS) {
    await prisma.canonicalFieldCatalog.upsert({
      where: { pathKey: row.pathKey },
      update: { label: row.label, description: row.description, dataType: 'object' },
      create: {
        pathKey: row.pathKey,
        label: row.label,
        description: row.description,
        dataType: 'object',
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

  const sollosMappings: Array<{ sourcePath: string; pathKey: string; sortOrder: number }> = [
    { sourcePath: 'dados_pessoais', pathKey: 'DADOS_PESSOAIS', sortOrder: 0 },
    { sourcePath: 'spc', pathKey: 'DIVIDAS_SPC', sortOrder: 1 },
    { sourcePath: 'serasa', pathKey: 'DIVIDAS_SERASA', sortOrder: 2 },
    { sourcePath: 'score', pathKey: 'SCORE_CREDITO', sortOrder: 3 },
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
    { sourcePath: 'resultado.pontuacao', pathKey: 'SCORE_CREDITO', sortOrder: 0 },
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
