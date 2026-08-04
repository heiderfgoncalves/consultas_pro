import type { ReportTemplate } from '../../lib/template-engine/template';
import type { ConsultasProBrandReference } from './consultas-pro-report-builder.service';

/**
 * Compositor do padrao 1079 em HTML de fluxo.
 *
 * A versao anterior posicionava cada campo com coordenadas e tamanho fixos,
 * herdados do editor do 1079. Isso corta rotulos longos e amontoa valores
 * grandes: o conteudo dos 30 produtos varia, mas as caixas nao. Aqui o layout
 * e HTML com grid e flexbox — o texto quebra, os cartoes refluem e a pagina e
 * paginada pelo motor de PDF, sem corte.
 *
 * A linguagem visual continua sendo a do 1079: mesma paleta, cabecalho com
 * divisor de marca, cartoes com barra lateral colorida, cabecalho de secao com
 * icone em caixa e medidor de score em arco. A marca (logo, cor, titulo) e lida
 * da matriz — nunca reescrita. O produto 1079 so e consultado, jamais regravado.
 */

const A4_W = 794;
const A4_H = 1123;

/**
 * Corpo da limpeza pos-render, definido uma vez e usado em dois lugares: como
 * `<script>` embutido (para o preview no app) e via `page.evaluate` no
 * exportador de PDF (onde a execucao precisa ser garantida). Normaliza listas
 * com pipe, oculta cartoes e colunas vazios e trata tabelas sem linhas.
 * Expoe a funcao `__cproClean` no escopo do IIFE que o encapsula.
 */
export const PRUNE_BODY = `
  function __cproBlank(t){
    if(!t||t==='-'||t==='Não informado'||t==='R$'||t==='R$ ') return true;
    if(/^\\[\\s*("?\\s*"?[,\\s]*)*\\]$/.test(t)||t==='{}'||t==='null'||t==='undefined') return true;
    return false;
  }
  function __cproClean(){
    document.querySelectorAll('.val, td').forEach(function(v){
      if(v.textContent.indexOf('|')>-1 && v.textContent.length>20)
        v.textContent=v.textContent.split('|').map(function(s){return s.trim();}).filter(Boolean).join(' · ');
    });
    document.querySelectorAll('.card').forEach(function(c){
      var v=c.querySelector('.val'); if(__cproBlank(v?v.textContent.trim():'')) c.style.display='none';
    });
    document.querySelectorAll('.tbl-wrap table').forEach(function(tb){
      var body=tb.querySelector('tbody');
      var rows=body?Array.prototype.slice.call(body.querySelectorAll('tr')):[];
      if(!rows.length){
        var cols=body?(body.getAttribute('data-cols')||1):1;
        var msg=body?(body.getAttribute('data-empty')||'Sem ocorrências.'):'';
        if(body) body.innerHTML='<tr><td colspan="'+cols+'" style="text-align:center;color:#94a3b8;padding:16px">'+msg+'</td></tr>';
        return;
      }
      var heads=tb.querySelectorAll('thead th');
      for(var i=heads.length-1;i>=0;i--){
        var allBlank=rows.every(function(r){var c=r.children[i];return __cproBlank(c?c.textContent.trim():'')});
        if(allBlank){ heads[i].remove(); rows.forEach(function(r){if(r.children[i])r.children[i].remove();}); }
      }
    });
    document.querySelectorAll('.sec').forEach(function(s){
      var g=s.querySelector('.grid');
      if(g){var vis=Array.prototype.filter.call(g.children,function(k){return k.style.display!=='none';});
        if(!vis.length) s.style.display='none';}
    });
  }
`;

export type ComposerField = {
  label: string;
  /** Expressao pronta, com `{{ }}`. */
  value: string;
  hint?: string;
};

export type ComposerTable = {
  title: string;
  icon: string;
  arrayPath: string;
  columns: Array<{ label: string; path: string; format?: string; width?: string }>;
  emptyMessage: string;
};

export type ComposerSection =
  | { kind: 'kpis'; title: string; icon: string; items: ComposerField[] }
  | { kind: 'fields'; title: string; icon: string; items: ComposerField[] }
  | { kind: 'table'; table: ComposerTable }
  | { kind: 'score-block'; scoreExpression: string; emptyState?: boolean };

export type ComposerInput = {
  templateId: string;
  productName: string;
  reportKind: string;
  identity: { nameExpression: string; documentExpression: string };
  sections: ComposerSection[];
  brandReference: ConsultasProBrandReference;
  metadata?: Record<string, unknown>;
};

type Brand = { logo: string; accent: string; title: string };

const C = {
  ink: '#0f172a',
  strong: '#334155',
  muted: '#64748b',
  faint: '#94a3b8',
  line: '#e2e8f0',
  subtle: '#f8fafc',
  danger: '#dc2626',
  success: '#16a34a',
  amber: '#ca8a04',
} as const;

/** Acentos das barras laterais, na ordem em que o 1079 os usa. */
const KPI_ACCENTS = [C.danger, C.success, C.amber] as const;

function readBrand(reference: ConsultasProBrandReference): Brand {
  const logo = reference.layout.elements.find(
    (element) =>
      element.type === 'image' &&
      typeof element.data?.src === 'string' &&
      element.data.src.startsWith('data:image/'),
  );
  if (!logo || typeof logo.data?.src !== 'string') {
    throw new Error('A matriz 1079 nao possui a logo oficial incorporada.');
  }
  const rule = reference.layout.elements.find(
    (element) =>
      element.type === 'divider' &&
      typeof element.style.background === 'string' &&
      element.style.background.toUpperCase() !== C.line.toUpperCase() &&
      element.width > 500,
  );
  const title = reference.layout.elements.find(
    (element) =>
      element.type === 'text' &&
      typeof element.data?.text === 'string' &&
      /RELAT[OÓ]RIO ANAL[IÍ]TICO/i.test(element.data.text),
  );
  return {
    logo: logo.data.src,
    accent:
      typeof rule?.style.background === 'string' ? rule.style.background : '#6366f1',
    title:
      typeof title?.data?.text === 'string'
        ? title.data.text
        : 'Relatório Analítico de Crédito',
  };
}

function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** CSS do documento, com os tokens do 1079. Fluxo, nao posicionamento. */
function styleSheet(brand: Brand): string {
  return `
  :root{
    --ink:${C.ink}; --strong:${C.strong}; --muted:${C.muted}; --faint:${C.faint};
    --line:${C.line}; --subtle:${C.subtle}; --accent:${brand.accent};
  }
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Geist','Inter',system-ui,-apple-system,'Segoe UI',sans-serif;
    color:var(--ink);background:#fff;font-size:11px;line-height:1.4}
  .doc{width:${A4_W}px;margin:0 auto;padding:0 30px}
  .band{border-bottom:2px solid var(--accent);padding:10px 0 12px;margin-bottom:6px;
    display:flex;align-items:center;justify-content:space-between}
  .band img{height:44px;object-fit:contain}
  .band .t{font-size:15px;font-weight:700;color:var(--accent);text-align:right}
  .band .m{font-size:9px;color:var(--muted);text-align:right;margin-top:2px}
  .sec{margin:14px 0;break-inside:avoid}
  .sec-h{display:flex;align-items:center;gap:9px;margin-bottom:9px}
  .sec-i{width:28px;height:28px;flex:0 0 28px;border-radius:8px;background:var(--subtle);
    border:1px solid var(--line);color:var(--accent);display:flex;align-items:center;
    justify-content:center}
  .sec-i svg{width:15px;height:15px}
  .sec-t{font-size:12px;font-weight:700;text-transform:uppercase;color:var(--strong);
    letter-spacing:.02em;white-space:normal;overflow-wrap:anywhere}
  .sec-r{flex:1;height:0;border-bottom:2px dashed var(--line);min-width:20px;align-self:center}
  .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
  .card{border:1px solid var(--line);border-radius:10px;background:#fff;padding:11px 13px;
    break-inside:avoid;min-height:52px}
  .card.kpi{position:relative;overflow:hidden;padding-left:16px}
  .card.kpi::before{content:'';position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--bar)}
  .lbl{font-size:8px;font-weight:700;color:var(--muted);text-transform:uppercase;
    letter-spacing:.04em;margin-bottom:4px}
  .val{font-size:13px;font-weight:700;color:var(--ink);overflow-wrap:anywhere;line-height:1.3}
  .val.big{font-size:16px}
  .hint{font-size:8px;color:var(--faint);margin-top:3px}
  .id{border:1px solid var(--line);border-radius:12px;background:var(--subtle);
    padding:14px 16px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:6px}
  table{width:100%;border-collapse:collapse;table-layout:fixed}
  th{background:var(--subtle);color:var(--muted);font-size:8px;font-weight:700;
    text-transform:uppercase;letter-spacing:.03em;text-align:left;padding:7px 9px;
    border-bottom:1px solid var(--line)}
  td{padding:7px 9px;border-bottom:1px solid #f1f5f9;font-size:10px;color:var(--ink);
    overflow-wrap:anywhere;vertical-align:top}
  tr{break-inside:avoid}
  .tbl-wrap{border:1px solid var(--line);border-radius:10px;overflow:hidden}
  .empty{padding:16px;text-align:center;color:var(--faint);font-size:10px;background:var(--subtle)}
  .score{display:flex;gap:22px;align-items:center;border:1px solid var(--line);
    border-radius:12px;padding:16px 18px;break-inside:avoid}
  .gauge{flex:0 0 190px;text-align:center}
  .gauge svg{width:190px;height:104px}
  .gauge .n{font-size:30px;font-weight:800;margin-top:-24px;letter-spacing:-.02em}
  .gauge .s{font-size:9px;color:var(--muted)}
  .score .side{flex:1}
  .score .side .lbl{font-size:9px}
  .score .side .rk{font-size:20px;font-weight:700;margin:4px 0 10px}
  .legend{display:flex;gap:14px;flex-wrap:wrap;font-size:9px;color:var(--strong)}
  .legend span.d{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:4px}
  `;
}

function sectionHeader(icon: string, title: string): string {
  return `<div class="sec-h"><div class="sec-i">${iconSvg(icon)}</div>` +
    `<div class="sec-t">${esc(title)}</div><div class="sec-r"></div></div>`;
}

/** Icones inline (SVG), para nao depender de CDN na geracao do PDF. */
function iconSvg(name: string): string {
  const p: Record<string, string> = {
    FileText: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>',
    Wallet: '<path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/>',
    Gauge: '<path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/>',
    Target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
    Award: '<circle cx="12" cy="8" r="6"/><path d="M15.5 13.5 17 22l-5-3-5 3 1.5-8.5"/>',
    ShieldCheck: '<path d="M20 13c0 5-3.5 7.5-8 9-4.5-1.5-8-4-8-9V5l8-3 8 3z"/><path d="m9 12 2 2 4-4"/>',
    Building2: '<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M9 8h1M9 12h1M14 8h1M14 12h1"/>',
    Users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/>',
    AlertTriangle: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4M12 17h.01"/>',
    Landmark: '<line x1="3" y1="22" x2="21" y2="22"/><line x1="6" y1="18" x2="6" y2="11"/><line x1="10" y1="18" x2="10" y2="11"/><line x1="14" y1="18" x2="14" y2="11"/><line x1="18" y1="18" x2="18" y2="11"/><polygon points="12 2 20 7 4 7"/>',
    ListChecks: '<path d="m3 17 2 2 4-4"/><path d="m3 7 2 2 4-4"/><path d="M13 6h8M13 12h8M13 18h8"/>',
    ClipboardCheck: '<rect width="8" height="4" x="8" y="2" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/>',
  };
  const body = p[name] ?? p.FileText;
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
}

function cardsGrid(items: ComposerField[], kpi = false): string {
  const cells = items
    .map((item, index) => {
      const bar = kpi
        ? ` style="--bar:${KPI_ACCENTS[index % KPI_ACCENTS.length]}"`
        : '';
      const cls = kpi ? 'card kpi' : 'card';
      const valCls = kpi ? 'val big' : 'val';
      const valColor = kpi
        ? ` style="color:${KPI_ACCENTS[index % KPI_ACCENTS.length]}"`
        : '';
      const hint = item.hint ? `<div class="hint">${esc(item.hint)}</div>` : '';
      return `<div class="${cls}"${bar}><div class="lbl">${esc(item.label.toUpperCase())}</div>` +
        `<div class="${valCls}"${valColor}>${item.value}</div>${hint}</div>`;
    })
    .join('');
  return `<div class="grid">${cells}</div>`;
}

function tableBlock(table: ComposerTable): string {
  const head = table.columns
    .map(
      (col) =>
        `<th${col.width ? ` style="width:${col.width}"` : ''}>${esc(col.label)}</th>`,
    )
    .join('');
  const cols = table.columns.length;
  const cells = table.columns
    .map((col) => {
      const helper = col.format === 'currency' ? 'toCurrency' : col.format === 'date' ? 'safeText' : 'safeText';
      return `<td>{{${helper} ${col.path}}}</td>`;
    })
    .join('');
  const body =
    `{{#each ${table.arrayPath}}}<tr>${cells}</tr>{{/each}}`;
  return (
    `<div class="tbl-wrap"><table><thead><tr>${head}</tr></thead>` +
    `<tbody data-empty="${esc(table.emptyMessage)}" data-cols="${cols}">${body}</tbody></table></div>`
  );
}

/** Gauge de score em arco 0–1000, com cor por faixa. SVG auto-contido. */
function scoreBlock(scoreExpr: string, empty?: boolean): string {
  const value = empty ? '—' : `{{safeText ${scoreExpr}}}`;
  const color = empty
    ? C.muted
    : `{{VAR s = ${scoreExpr} VAR c = case when s <= 300 then "${C.danger}" when s <= 500 then "#f59e0b" when s <= 700 then "#eab308" else "${C.success}" end RETURN c}}`;
  const arc = (offset: number, col: string) =>
    `<path d="M 20 92 A 75 75 0 0 1 170 92" fill="none" stroke="${col}" stroke-width="13" stroke-linecap="round" stroke-dasharray="55 180" stroke-dashoffset="${-offset}"/>`;
  return (
    `<div class="score"><div class="gauge"><svg viewBox="0 0 190 104">` +
    `<path d="M 20 92 A 75 75 0 0 1 170 92" fill="none" stroke="#eef2f7" stroke-width="13" stroke-linecap="round"/>` +
    arc(0, C.danger) + arc(57, '#f59e0b') + arc(114, '#eab308') + arc(171, C.success) +
    `</svg><div class="n" style="color:${color}">${value}</div>` +
    `<div class="s">de ${empty ? '1000' : '1000'} pontos</div></div>` +
    `<div class="side"><div class="lbl">FAIXA DE RISCO</div>` +
    `<div class="rk">${empty ? 'Score não apurado nesta consulta' : `{{safeText ${scoreExpr.replace(/\.[^.]+$/, '.faixa_risco')}}}`}</div>` +
    `<div class="legend">` +
    `<div><span class="d" style="background:${C.danger}"></span>0–300 Muito alto</div>` +
    `<div><span class="d" style="background:#f59e0b"></span>301–500 Alto</div>` +
    `<div><span class="d" style="background:#eab308"></span>501–700 Médio</div>` +
    `<div><span class="d" style="background:${C.success}"></span>701–1000 Baixo</div>` +
    `</div></div></div>`
  );
}

/**
 * Monta o documento inteiro em fluxo. Retorna um `ReportTemplate` com um unico
 * frame cujo `customHtml` e o corpo — sem cabecalho/rodape, que sao repetidos
 * pelo motor de PDF em cada pagina. `metadata.flowing = true` sinaliza ao
 * exportador para paginar por fluxo.
 */
export function composeReport(input: ComposerInput): ReportTemplate {
  const brand = readBrand(input.brandReference);

  const identity =
    `<div class="id">` +
    `<div><div class="lbl">CLIENTE ANALISADO</div><div class="val">${input.identity.nameExpression}</div></div>` +
    `<div><div class="lbl">DOCUMENTO</div><div class="val">${input.identity.documentExpression}</div></div>` +
    `<div><div class="lbl">TIPO DE RELATÓRIO</div><div class="val">${esc(input.reportKind)}</div></div>` +
    `</div>`;

  const body = input.sections
    .map((section) => {
      if (section.kind === 'score-block') {
        return `<div class="sec">${sectionHeader('Gauge', 'Score de crédito')}${scoreBlock(section.scoreExpression, section.emptyState)}</div>`;
      }
      if (section.kind === 'table') {
        return `<div class="sec">${sectionHeader(section.table.icon, section.table.title)}${tableBlock(section.table)}</div>`;
      }
      const grid = cardsGrid(section.items, section.kind === 'kpis');
      return `<div class="sec">${sectionHeader(section.icon, section.title)}${grid}</div>`;
    })
    .join('\n');

  // Oculta cartoes cujo valor resolveu vazio e secoes que ficaram sem conteudo.
  // Campo em branco nao e informacao — e ruido; um relatorio profissional nao
  // mostra "NOME: [vazio]". Roda tanto no PDF (puppeteer) quanto no preview.
  const prune = `<script>(function(){${PRUNE_BODY}
    if(document.readyState!=='loading') __cproClean(); else document.addEventListener('DOMContentLoaded',__cproClean);
  })();</script>`;

  const customHtml =
    `<style>${styleSheet(brand)}</style><div class="doc">${identity}${body}</div>${prune}`;

  return {
    id: input.templateId,
    name: input.productName,
    version: 6,
    canvas: { background: '#f1f5f9', grid: 10 },
    frames: [
      {
        id: `${input.templateId}-doc`,
        name: input.productName,
        preset: 'a4-p',
        x: 10,
        y: 10,
        width: A4_W,
        height: A4_H,
        background: '#ffffff',
        customHtml,
      },
    ],
    elements: [],
    metadata: {
      consultasProTemplate: {
        generator: 'consultas-pro-1079-composer',
        generatorVersion: 6,
        visualStandard: 'CONSULTAS_PRO_1079',
        brandReferenceTemplateId: input.brandReference.templateId,
        publicationStatus: 'READY_FOR_MANUAL_REVIEW',
        flowing: true,
        brandLogo: brand.logo,
        brandTitle: brand.title,
        brandAccent: brand.accent,
        ...(input.metadata ?? {}),
      },
    },
  };
}
