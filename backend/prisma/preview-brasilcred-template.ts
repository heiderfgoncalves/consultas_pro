import 'dotenv/config';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { renderTemplateToHtml } from '../src/lib/template-engine/renderTemplateToHtml';
import type { ReportTemplate } from '../src/lib/template-engine/template';
import { buildRadarPronampeMappedData } from '../src/modules/templates/brasilcred-radar-pronampe.mapper';

/**
 * Renderiza o relatorio Radar PRONAMPE com uma amostra real e grava um HTML
 * paginado em A4, para conferencia visual antes da revisao manual.
 *
 *   npx tsx prisma/preview-brasilcred-template.ts [CNPJ] [saida.html]
 */
const prisma = new PrismaClient();

const TEMPLATE_ID = 'brasilcred-template-radar-pronampe-pj';
const SAMPLES_PATH = path.join(__dirname, 'brasilcred-radar-pronampe-samples.json');

async function main() {
  const [documentArg, outputArg] = process.argv.slice(2);

  const template = await prisma.template.findUnique({ where: { id: TEMPLATE_ID } });
  if (!template?.layout) {
    throw new Error(
      `Template ${TEMPLATE_ID} nao encontrado. Rode generate-brasilcred-templates.ts --apply antes.`,
    );
  }
  const layout = template.layout as unknown as ReportTemplate;

  const { samples } = JSON.parse(fs.readFileSync(SAMPLES_PATH, 'utf-8')) as {
    samples: { document: string; status: string; response: Record<string, unknown> }[];
  };
  const sample =
    samples.find((item) => item.document.replace(/\D/g, '') === (documentArg ?? '').replace(/\D/g, '')) ??
    samples[0];

  const data = buildRadarPronampeMappedData(sample.response);
  const pages = layout.frames.map((frame) => renderTemplateToHtml(layout, frame.id, data).html);

  const pending = pages.join('').match(/\{\{[^}]+\}\}/g);
  if (pending) throw new Error(`Expressao nao resolvida: ${pending[0]}`);

  const html = `<!doctype html>
<meta charset="utf-8">
<title>${template.name} — Consultas PRO</title>
<style>
  body { margin: 0; background: #f1f5f9; font-family: system-ui, -apple-system, sans-serif; }
  .sheet { width: 794px; height: 1123px; margin: 0 auto 28px; background: #fff;
           box-shadow: 0 4px 24px rgba(15,23,42,.14); position: relative; overflow: hidden; }
  .caption { width: 794px; margin: 24px auto 8px; font: 600 12px system-ui; color: #64748b; }
</style>
${layout.frames
  .map(
    (frame, index) =>
      `<div class="caption">Página ${index + 1} de ${pages.length} — ${frame.name}</div>\n<div class="sheet">${pages[index]}</div>`,
  )
  .join('\n')}
`;

  const output = outputArg ?? path.join(__dirname, 'radar-pronampe-preview.html');
  fs.writeFileSync(output, html);

  console.log(`Amostra   : ${sample.document} (status ${sample.status})`);
  console.log(`Paginas   : ${pages.length}`);
  console.log(`Elementos : ${layout.elements.length}`);
  console.log(`Gravado   : ${output}`);
}

main()
  .catch((error) => {
    console.error('FALHOU:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
