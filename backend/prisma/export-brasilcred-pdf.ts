import 'dotenv/config';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { PrismaClient } from '@prisma/client';
import puppeteer from 'puppeteer';
import { renderTemplateToHtml } from '../src/lib/template-engine/renderTemplateToHtml';
import type { ReportTemplate } from '../src/lib/template-engine/template';
import { BRASILCRED_COMPOSICAO_COMPLETA } from '../src/modules/templates/brasilcred-template-products';
import { buildRadarPronampeMappedData } from '../src/modules/templates/brasilcred-radar-pronampe.mapper';

/**
 * Exporta o relatorio Brasil Cred em PDF A4, no padrao CONSULTAS_PRO_1079.
 *
 *   npx tsx prisma/export-brasilcred-pdf.ts [saida.pdf]
 */
const prisma = new PrismaClient();

const TEMPLATE_ID = 'brasilcred-template-radar-pronampe-composta';
const RADAR_PATH = path.join(__dirname, 'brasilcred-radar-pronampe-samples.json');
const COMPOSICAO_PATH = path.join(__dirname, 'brasilcred-composicao-sample.json');

async function main() {
  const output = process.argv[2] ?? path.join(__dirname, 'radar-pronampe-consultas-pro.pdf');

  const template = await prisma.template.findUnique({ where: { id: TEMPLATE_ID } });
  if (!template?.layout) throw new Error(`Template ${TEMPLATE_ID} nao encontrado.`);
  const layout = template.layout as unknown as ReportTemplate;

  const composicao = JSON.parse(fs.readFileSync(COMPOSICAO_PATH, 'utf-8'));
  const { samples } = JSON.parse(fs.readFileSync(RADAR_PATH, 'utf-8'));
  const radar = samples.find(
    (s: { document: string }) =>
      s.document.replace(/\D/g, '') === composicao.document.replace(/\D/g, ''),
  );

  const merged = {
    ...radar.response,
    ...composicao.diagnosticoResponse,
    consultation_id: radar.response.consultation_id,
    product_name: radar.response.product_name,
    status: radar.response.status,
    document: radar.response.document,
    queried_at: radar.response.queried_at,
    credit_portfolio: {
      ...(composicao.diagnosticoResponse.credit_portfolio ?? {}),
      ...(radar.response.credit_portfolio ?? {}),
      loss_brl: composicao.diagnosticoResponse.credit_portfolio?.loss_brl,
    },
  };

  const data = buildRadarPronampeMappedData(merged, BRASILCRED_COMPOSICAO_COMPLETA);
  const pages = layout.frames.map((frame) => renderTemplateToHtml(layout, frame.id, data).html);

  const pending = pages.join('').match(/\{\{[^}]+\}\}/g);
  if (pending) throw new Error(`Expressao nao resolvida: ${pending[0]}`);

  const html = `<!doctype html><meta charset="utf-8">
<style>
  @page { size: 794px 1123px; margin: 0; }
  html, body { margin: 0; padding: 0; background: #fff; }
  .sheet { width: 794px; height: 1123px; position: relative; overflow: hidden;
           page-break-after: always; break-after: page; }
  .sheet:last-child { page-break-after: auto; break-after: auto; }
</style>
${pages.map((page) => `<div class="sheet">${page}</div>`).join('\n')}`;

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 794, height: 1123 });
    await page.setContent(html, { waitUntil: 'load' });
    const pdf = await page.pdf({
      width: '794px',
      height: '1123px',
      printBackground: true,
      pageRanges: `1-${pages.length}`,
    });
    fs.writeFileSync(output, pdf);
  } finally {
    await browser.close();
  }

  console.log(`Documento : ${composicao.document}`);
  console.log(`Paginas   : ${pages.length}`);
  console.log(`Gravado   : ${output} (${(fs.statSync(output).size / 1024).toFixed(0)} KB)`);
}

main()
  .catch((error) => {
    console.error('FALHOU:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
