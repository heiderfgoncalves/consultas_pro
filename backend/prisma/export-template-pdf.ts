import 'dotenv/config';
import * as fs from 'node:fs';
import { PrismaClient } from '@prisma/client';
import puppeteer from 'puppeteer';
import { renderTemplateToHtml } from '../src/lib/template-engine/renderTemplateToHtml';
import type { ReportTemplate } from '../src/lib/template-engine/template';
import {
  buildTypeKeyedData,
  parseTypeItemFiltersRecord,
} from '../src/modules/providers/canonical-builder.service';

/**
 * Exporta o relatorio de qualquer produto em PDF A4, com a amostra catalogada.
 *
 *   npx tsx prisma/export-template-pdf.ts <externalId> <saida.pdf>
 */
const prisma = new PrismaClient();

async function main() {
  const [externalId, output] = process.argv.slice(2);
  if (!externalId || !output) {
    throw new Error('Uso: export-template-pdf.ts <externalId> <saida.pdf>');
  }

  const product = await prisma.providerProduct.findFirst({
    where: { externalId },
    include: { mappings: { include: { canonicalField: true } } },
  });
  if (!product) throw new Error(`Produto ${externalId} nao encontrado.`);

  const template = await prisma.template.findFirst({
    where: { id: { in: [`sollos-template-${externalId}`, `brasilcred-template-${externalId}`] } },
  });
  if (!template?.layout) throw new Error(`Template de ${externalId} nao encontrado.`);
  const layout = template.layout as unknown as ReportTemplate;

  // Reconstroi o PARA tipo a tipo, como o gerador faz.
  const ativos = product.mappings.filter((mapping) => mapping.isActive);
  const tipos = [
    ...new Map(
      ativos.map((mapping) => [mapping.canonicalField.pathKey, mapping.canonicalField]),
    ).values(),
  ];
  const sampleResponse = JSON.stringify(product.sampleResponse ?? {});
  const filtros = parseTypeItemFiltersRecord(product.typeItemFilters);
  const data: Record<string, unknown> = {};
  for (const tipo of tipos) {
    const doTipo = ativos.filter(
      (mapping) => mapping.canonicalField.pathKey === tipo.pathKey,
    );
    if (doTipo.length === 0) continue;
    try {
      data[tipo.pathKey] = buildTypeKeyedData({
        sampleResponse,
        trechoMappings: doTipo.map((mapping) => ({
          fieldTypeKey: tipo.pathKey,
          jsonPath: mapping.sourcePath,
          label: mapping.canonicalField.label,
        })) as never,
        fieldType: {
          id: tipo.id,
          key: tipo.pathKey,
          label: tipo.label,
          reportFieldConfig: tipo.reportFieldConfig,
        } as never,
        typeItemFilterConfig: (filtros?.[tipo.pathKey] ?? {}) as never,
      });
    } catch {
      data[tipo.pathKey] = null;
    }
  }

  const pages = layout.frames.map(
    (frame) => renderTemplateToHtml(layout, frame.id, data).html,
  );
  const pending = pages.join('').match(/\{\{[^}]+\}\}/g);

  const html = `<!doctype html><meta charset="utf-8">
<style>
  @page { size: 794px 1123px; margin: 0; }
  html, body { margin: 0; padding: 0; background: #fff; }
  .sheet { width: 794px; height: 1123px; position: relative; overflow: hidden;
           page-break-after: always; break-after: page; }
  .sheet:last-child { page-break-after: auto; break-after: auto; }
  i[data-lucide] { display: flex; align-items: center; justify-content: center; }
  i[data-lucide] svg, svg.lucide { width: 100%; height: 100%; }
</style>
${pages.map((page) => `<div class="sheet">${page}</div>`).join('\n')}
<script src="https://cdn.jsdelivr.net/npm/lucide@0.462.0/dist/umd/lucide.min.js"></script>`;

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });
    // `networkidle0` garante que a biblioteca de icones chegou antes de
    // converter os `<i data-lucide>` em SVG.
    await page.setContent(html, { waitUntil: 'networkidle0' as never, timeout: 120000 });
    const icons = await page.evaluate(`
      (function () {
        if (typeof lucide === 'undefined') return 0;
        lucide.createIcons();
        return document.querySelectorAll('i[data-lucide] svg, svg.lucide').length;
      })()
    `);
    const pdf = await page.pdf({
      width: '794px',
      height: '1123px',
      printBackground: true,
    });
    fs.writeFileSync(output, pdf);
    console.log(
      `[${externalId}] ${product.name.slice(0, 32).padEnd(32)} ` +
        `${pages.length}p | icones: ${icons} | ${(fs.statSync(output).size / 1024).toFixed(0)} KB` +
        (pending ? ` | PENDENTE: ${pending[0].slice(0, 30)}` : ''),
    );
  } finally {
    await browser.close();
  }
}

main()
  .catch((error) => {
    console.error('FALHOU:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
