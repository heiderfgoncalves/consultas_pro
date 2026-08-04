import 'dotenv/config';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { PrismaClient } from '@prisma/client';
import puppeteer, { type Browser } from 'puppeteer';
import { renderTemplateToHtml } from '../src/lib/template-engine/renderTemplateToHtml';
import type { ReportTemplate } from '../src/lib/template-engine/template';
import {
  buildTypeKeyedData,
  parseTypeItemFiltersRecord,
} from '../src/modules/providers/canonical-builder.service';
import { applyPivotToData } from '../src/modules/templates/pivot-parallel-arrays';
import { PRUNE_BODY } from '../src/modules/templates/consultas-pro-1079-composer';
import { SOLLOS_TEMPLATE_PRODUCTS } from '../src/modules/templates/sollos-template-products';

/**
 * Gera, num unico lote, o PDF de cada produto Sollos com a amostra catalogada.
 * Cada PDF recebe o nome do produto. Reusa um browser para os 30.
 *
 *   npx tsx prisma/export-all-sollos-pdfs.ts <pasta-de-saida>
 */
const prisma = new PrismaClient();

function safeName(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, ' ').trim();
}

async function buildData(externalId: string) {
  const product = await prisma.providerProduct.findFirst({
    where: { externalId },
    include: { mappings: { include: { canonicalField: true } } },
  });
  if (!product) return null;
  const template =
    (await prisma.template.findFirst({ where: { id: `sollos-template-${externalId}` } })) ??
    (externalId === '1079'
      ? await prisma.template.findFirst({
          where: { name: { contains: 'COMPLETA BRASIL + SCORE CPF' } },
        })
      : null);
  if (!template?.layout) return null;

  const ativos = product.mappings.filter((m) => m.isActive);
  const tipos = [
    ...new Map(ativos.map((m) => [m.canonicalField.pathKey, m.canonicalField])).values(),
  ];
  const sampleResponse = JSON.stringify(product.sampleResponse ?? {});
  const filtros = parseTypeItemFiltersRecord(product.typeItemFilters);
  const data: Record<string, unknown> = {};
  for (const t of tipos) {
    const dt = ativos.filter((m) => m.canonicalField.pathKey === t.pathKey);
    if (!dt.length) continue;
    try {
      data[t.pathKey] = buildTypeKeyedData({
        sampleResponse,
        trechoMappings: dt.map((m) => ({
          fieldTypeKey: t.pathKey,
          jsonPath: m.sourcePath,
          label: m.canonicalField.label,
        })) as never,
        fieldType: {
          id: t.id,
          key: t.pathKey,
          label: t.label,
          reportFieldConfig: t.reportFieldConfig,
        } as never,
        typeItemFilterConfig: (filtros?.[t.pathKey] ?? {}) as never,
      });
    } catch {
      data[t.pathKey] = null;
    }
  }
  return {
    layout: template.layout as unknown as ReportTemplate,
    name: template.name,
    data: applyPivotToData(data),
  };
}

async function renderPdf(browser: Browser, built: NonNullable<Awaited<ReturnType<typeof buildData>>>) {
  const { layout, data } = built;
  const meta = (layout.metadata as any)?.consultasProTemplate ?? {};
  const flowing = meta.flowing === true;
  const rendered = layout.frames.map((f) => renderTemplateToHtml(layout, f.id, data).html);
  const pending = rendered.join('').match(/\{\{[^}]+\}\}/g);

  const page = await browser.newPage();
  await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });
  try {
    if (flowing) {
      const html = `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400..800&family=Inter:wght@400..700&display=swap" rel="stylesheet">
</head><body>${rendered.join('\n')}</body></html>`;
      await page.setContent(html, { waitUntil: 'networkidle0' as never, timeout: 120000 });
      // Garante a limpeza (pipes, vazios, colunas) — o script embutido nem
      // sempre executa no contexto de impressao.
      await page.evaluate(`${PRUNE_BODY}; __cproClean();`);
      const logo = String(meta.brandLogo ?? '');
      const title = String(meta.brandTitle ?? 'Relatório Analítico de Crédito');
      const accent = String(meta.brandAccent ?? '#6366f1');
      const pdf = await page.pdf({
        width: '794px',
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate: `<div style="width:100%;font-size:9px;padding:6px 30px 0;display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid ${accent};margin:0 12px;"><img src="${logo}" style="height:30px;object-fit:contain"/><div style="text-align:right"><div style="font-size:11px;font-weight:700;color:${accent}">${title}</div><div style="font-size:7px;color:#64748b">Consultas PRO</div></div></div>`,
        footerTemplate: `<div style="width:100%;font-size:7px;color:#94a3b8;padding:0 42px;display:flex;justify-content:space-between"><span>Consultas PRO — Relatório de Crédito</span><span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span></div>`,
        margin: { top: '70px', bottom: '40px', left: '0px', right: '0px' },
      });
      return { pdf, pending };
    }
    // 1079 (matriz, layout legado de altura fixa)
    const html = `<!doctype html><meta charset="utf-8"><style>@page{size:794px 1123px;margin:0}html,body{margin:0;background:#fff}.sheet{width:794px;height:1123px;position:relative;overflow:hidden;page-break-after:always}i[data-lucide]{display:flex;align-items:center;justify-content:center}i[data-lucide] svg{width:100%;height:100%}</style>${rendered.map((p) => `<div class="sheet">${p}</div>`).join('')}<script src="https://cdn.jsdelivr.net/npm/lucide@0.462.0/dist/umd/lucide.min.js"></script>`;
    await page.setContent(html, { waitUntil: 'networkidle0' as never, timeout: 120000 });
    await page.evaluate(`(function(){if(typeof lucide!=='undefined')lucide.createIcons();})()`);
    const pdf = await page.pdf({ width: '794px', height: '1123px', printBackground: true });
    return { pdf, pending };
  } finally {
    await page.close();
  }
}

async function main() {
  const outDir = process.argv[2] ?? path.join(__dirname, 'pdfs-sollos');
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  let ok = 0;
  const warns: string[] = [];
  try {
    for (const spec of SOLLOS_TEMPLATE_PRODUCTS) {
      const built = await buildData(spec.productId);
      if (!built) {
        warns.push(`${spec.productId}: template ausente`);
        continue;
      }
      const { pdf, pending } = await renderPdf(browser, built);
      const file = path.join(outDir, `${safeName(spec.productName)}.pdf`);
      fs.writeFileSync(file, pdf);
      ok += 1;
      const kb = (pdf.length / 1024).toFixed(0);
      console.log(
        `[${spec.productId}] ${safeName(spec.productName).slice(0, 40).padEnd(40)} ${kb} KB` +
          (pending ? `  ⚠ ${pending[0].slice(0, 24)}` : ''),
      );
      if (pending) warns.push(`${spec.productId}: expressao pendente`);
    }
  } finally {
    await browser.close();
  }
  console.log(`\n${ok}/${SOLLOS_TEMPLATE_PRODUCTS.length} PDFs em ${outDir}`);
  if (warns.length) warns.forEach((w) => console.log('  ⚠', w));
}

main()
  .catch((error) => {
    console.error('FALHOU:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => process.exit());
