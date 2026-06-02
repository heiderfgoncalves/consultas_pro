import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { validateTemplate } from '../src/lib/expression-validator';

const prisma = new PrismaClient();

const blocks = [
  {
    name: 'Header',
    description: 'Cabeçalho do relatório com logo, empresa, título, data e protocolo',
    category: 'system',
    template: `<section name="Header" kind="header">
  <field label="Empresa" tag="label" font-size="10" color="#2563eb">{$template.company}</field>
  <field label="Título do relatório" tag="text" font-size="14">Relatório Analítico de Crédito</field>
  <field label="Data" tag="value">{$template.date}</field>
  <field label="Protocolo" tag="value">{$template.protocol}</field>
</section>`,
  },
  {
    name: 'Dados Pessoais',
    description: 'Cards com nome, documento e tipo de relatório',
    category: 'system',
    template: `<section name="Dados Pessoais" kind="data">
  <field label="Cliente Analisado" icon="User" tag="value">{$cliente.nome}</field>
  <field label="Documento" icon="Hash" tag="value">{$cliente.documento}</field>
  <field label="Tipo de Relatório" icon="Tag" tag="value">Padrão</field>
</section>`,
  },
  {
    name: 'Resumo Financeiro',
    description: 'Linha adaptativa de cards KPI financeiros',
    category: 'system',
    template: `<section name="Resumo Financeiro" kind="kpi-row">
  <field label="Total Apontado" tag="value" color="#dc2626">{$RESUMO_FINANCEIRO.totalApontado}</field>
  <field label="Total Deduzido" tag="value" color="#16a34a">{$RESUMO_FINANCEIRO.totalDeduzido}</field>
  <field label="Risco Bacen (Vencido)" tag="value" color="#ca8a04">{$RESUMO_FINANCEIRO.riscoBacenVencido}</field>
</section>`,
  },
  {
    name: 'Score de Crédito',
    description: 'Bloco de score e métricas de crédito',
    category: 'score',
    template: `<section name="Score de Crédito" kind="score">
  <speedometer value="{$SCORE.valor}" max="1000" />
  <field label="Faixa" tag="value">{$SCORE.faixa}</field>
  <field label="Chance de pagar" tag="value">{$SCORE.chancePagar}</field>
  <field label="Inadimplência" tag="value">{$SCORE.probabilidadeInadimplencia}</field>
</section>`,
  },
  {
    name: 'Tabela de Dívidas',
    description: 'Seção dinâmica onde os tipos de consulta encaixam seus registros',
    category: 'system',
    template: `<section name="Tabela de Dívidas" kind="debt-table">
  <field label="Tipo" tag="label">{$consulta.tipo}</field>
  <field label="Credor" tag="value">{$divida.credor}</field>
  <field label="Contrato" tag="value">{$divida.contrato}</field>
  <field label="Valor" tag="value" color="#dc2626">{$divida.valor}</field>
</section>`,
  },
  {
    name: 'Card KPI',
    description: 'Card com ícone, label e valor para linhas adaptativas',
    category: 'layout',
    template: `<card variant="kpi">
  <field label="Label" icon="Gauge" tag="label">Label</field>
  <field label="Valor" tag="value" font-size="16">{$}</field>
</card>`,
  },
  {
    name: 'Container',
    description: 'Agrupador genérico para compor blocos customizados',
    category: 'layout',
    template: `<container cols="3">
</container>`,
  },
  {
    name: 'Texto Livre',
    description: 'Texto livre com suporte a expressões dinâmicas',
    category: 'layout',
    template: `<text>Texto editável aqui</text>`,
  },
];

async function main() {
  const tenant = await prisma.tenant.findFirst({ orderBy: { createdAt: 'asc' } });
  if (!tenant) throw new Error('Nenhum tenant encontrado para importar blocos');

  for (const block of blocks) {
    const validation = validateTemplate(block.template);
    if (!validation.valid) throw new Error(`${block.name}: ${validation.errors.join(', ')}`);

    const existing = await prisma.customBlock.findFirst({ where: { tenantId: tenant.id, name: block.name } });
    if (existing) {
      await prisma.customBlock.update({
        where: { id: existing.id },
        data: { ...block, skeleton: block.template, variables: validation.variables, isSystem: true },
      });
    } else {
      await prisma.customBlock.create({
        data: { tenantId: tenant.id, ...block, skeleton: block.template, variables: validation.variables, isSystem: true },
      });
    }
  }

  console.log(`Imported ${blocks.length} template layout blocks for tenant ${tenant.slug}`);
}

main().finally(async () => prisma.$disconnect());
