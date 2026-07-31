import 'dotenv/config';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { Prisma, PrismaClient } from '@prisma/client';
import { renderTemplateToHtml } from '../src/lib/template-engine/renderTemplateToHtml';
import type { ReportTemplate } from '../src/lib/template-engine/template';
import {
  type ConsultasProBrandReference,
  type ConsultasProReportField,
  type ConsultasProReportFieldType,
} from '../src/modules/templates/consultas-pro-report-builder.service';
import {
  BRASILCRED_COMPOSICAO_COMPLETA,
  BRASILCRED_COMPOSICAO_LEAF_COUNT,
} from '../src/modules/templates/brasilcred-template-products';
import {
  auditRadarPronampeLineage,
  buildRadarPronampeMappedData,
} from '../src/modules/templates/brasilcred-radar-pronampe.mapper';
import { buildRadarPronampeReport } from '../src/modules/templates/brasilcred-radar-pronampe.report';

/**
 * Gera o relatorio da consulta COMPOSTA Brasil Cred.
 *
 * Radar PRONAMPE sozinho cobre ~25% do relatorio que o painel exibe. A composta
 * soma o Diagnostico Financeiro Avancado, que traz razao social, rating A-F com
 * fatores, parecer, restricoes, faturamento estimado e prejuizo no SCR.
 */
const prisma = new PrismaClient();
const apply = process.argv.includes('--apply');

const RADAR_PATH = path.join(__dirname, 'brasilcred-radar-pronampe-samples.json');
const COMPOSICAO_PATH = path.join(__dirname, 'brasilcred-composicao-sample.json');
const TEMPLATE_ID = 'brasilcred-template-radar-pronampe-composta';

function toReportFieldTypes(mapped: Record<string, unknown>): ConsultasProReportFieldType[] {
  return BRASILCRED_COMPOSICAO_COMPLETA.filter(
    (type) => mapped[type.key] !== undefined,
  ).map((type) => {
    const fields: ConsultasProReportField[] = type.fields
      .filter((field) => !field.auditOnly)
      .map((field, index) => ({
        id: `field_${type.key.toLowerCase()}_${field.key}`,
        key: field.key,
        label: field.label,
        sortOrder: index,
        dataType: field.dataType,
      }));
    return {
      id: `bc-type-${type.key}`,
      key: type.key,
      label: type.label,
      description: type.description,
      isCollection: type.isCollection,
      reportFieldConfig: { version: 1, title: type.label, fields },
    };
  });
}

async function loadBrandReference(): Promise<ConsultasProBrandReference> {
  const candidates = await prisma.template.findMany({
    where: { name: { contains: 'COMPLETA BRASIL + SCORE CPF', mode: 'insensitive' } },
    select: { id: true, name: true, layout: true },
  });
  const reference = candidates.find((candidate) => {
    const layout = candidate.layout as unknown as ReportTemplate | null;
    return layout?.elements?.some(
      (element) =>
        element.type === 'image' &&
        typeof element.data?.src === 'string' &&
        element.data.src.startsWith('data:image/'),
    );
  });
  if (!reference?.layout) throw new Error('Matriz visual 1079 nao encontrada.');
  return {
    templateId: reference.id,
    layout: reference.layout as unknown as ReportTemplate,
  };
}

async function main() {
  const composicao = JSON.parse(fs.readFileSync(COMPOSICAO_PATH, 'utf-8'));
  const { samples } = JSON.parse(fs.readFileSync(RADAR_PATH, 'utf-8')) as {
    samples: { document: string; response: Record<string, unknown> }[];
  };
  const radar = samples.find(
    (item) => item.document.replace(/\D/g, '') === composicao.document.replace(/\D/g, ''),
  );
  if (!radar) throw new Error(`Amostra Radar PRONAMPE ausente para ${composicao.document}`);

  // A consulta composta funde as respostas dos produtos numa unica origem,
  // exatamente como o worker faz com mergeNormalizedPayloads.
  const merged: Record<string, unknown> = {
    ...radar.response,
    ...composicao.diagnosticoResponse,
    // O envelope de identificacao permanece o do Radar PRONAMPE.
    consultation_id: radar.response.consultation_id,
    product: radar.response.product,
    product_name: radar.response.product_name,
    status: radar.response.status,
    document: radar.response.document,
    queried_at: radar.response.queried_at,
    // credit_portfolio do Radar e o oficial; o Diagnostico so acrescenta loss_brl.
    credit_portfolio: {
      ...(composicao.diagnosticoResponse.credit_portfolio ?? {}),
      ...((radar.response.credit_portfolio as Record<string, unknown>) ?? {}),
      loss_brl: composicao.diagnosticoResponse.credit_portfolio?.loss_brl,
    },
  };

  const brandReference = await loadBrandReference();
  const mappedData = buildRadarPronampeMappedData(merged, BRASILCRED_COMPOSICAO_COMPLETA);
  const fieldTypes = toReportFieldTypes(mappedData);

  let conferidos = 0;
  for (const item of auditRadarPronampeLineage(merged, BRASILCRED_COMPOSICAO_COMPLETA)) {
    if (item.status === 'divergente') {
      throw new Error(
        `${item.typeKey}.${item.fieldKey}: origem ${JSON.stringify(item.sourceValue)} virou ${JSON.stringify(item.previewValue)}`,
      );
    }
    if (item.status === 'ok') conferidos += 1;
  }

  // Layout desenhado a mao: este produto concorre com o relatorio do proprio
  // provedor, entao o gerador automatico (bom para varrer dezenas de produtos)
  // cede lugar a um desenho deliberado.
  const layout = buildRadarPronampeReport(brandReference);

  for (const frame of layout.frames) {
    const html = renderTemplateToHtml(layout, frame.id, mappedData).html;
    const pending = html.match(/\{\{[^}]+\}\}/g);
    if (pending) throw new Error(`Expressao pendente em ${frame.name}: ${pending[0]}`);
  }

  console.log(`Documento : ${composicao.document}`);
  console.log(`Contrato  : ${BRASILCRED_COMPOSICAO_LEAF_COUNT} caminhos (${BRASILCRED_COMPOSICAO_COMPLETA.length} blocos)`);
  console.log(`Conferidos: ${conferidos} valores, 0 divergencias`);
  console.log(`Template  : ${layout.frames.length} paginas | ${fieldTypes.length} tipos | ${layout.elements.length} campos`);

  if (!apply) {
    console.log('\nDry-run. Use --apply para gravar.');
    return;
  }

  const admin = await prisma.user.findFirst({ where: { role: 'PLATFORM_ADMIN' } });
  if (!admin) throw new Error('Administrador nao encontrado.');

  await prisma.template.upsert({
    where: { id: TEMPLATE_ID },
    update: { layout: layout as unknown as Prisma.InputJsonValue },
    create: {
      id: TEMPLATE_ID,
      userId: admin.id,
      name: 'Radar PRONAMPE — Análise Completa',
      description:
        `[REVISÃO MANUAL] Consulta composta Brasil Cred: Radar PRONAMPE + Diagnóstico Financeiro Avançado. ` +
        `${fieldTypes.length} tipos, ${layout.elements.length} campos, ${layout.frames.length} páginas. Padrão CONSULTAS_PRO_1079.`,
      visibility: 'PRIVATE',
      layout: layout as unknown as Prisma.InputJsonValue,
    },
  });
  console.log(`\nGravado: template ${TEMPLATE_ID} (PRIVATE)`);
}

main()
  .catch((error) => {
    console.error('FALHOU:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
