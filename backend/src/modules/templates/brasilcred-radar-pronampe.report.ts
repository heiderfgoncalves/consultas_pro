import type { ReportTemplate } from '../../lib/template-engine/template';
import type { ConsultasProBrandReference } from './consultas-pro-report-builder.service';

/**
 * Relatorio dedicado do Radar PRONAMPE, escrito em HTML.
 *
 * O construtor por elementos posicionados nao alcanca o acabamento necessario:
 * `ElementStyle` so aceita cor solida e borda — sem sombra, gradiente ou SVG.
 * O motor, porem, aceita `frame.customHtml` com interpolacao, entao cada pagina
 * e escrita como HTML/CSS e ganha profundidade, medidor em arco e tabelas
 * densas.
 *
 * A gramatica visual (tokens, raios, sombras, cabecalho com icone em caixa e
 * divisor tracejado) foi estudada no relatorio oficial do provedor. A marca,
 * porem, e integralmente nossa: logo, cor primaria e titulo vem da matriz
 * protegida 1079.
 */

const A4_W = 794;
const A4_H = 1123;

type Brand = { logo: string; primary: string; title: string };

/** Tokens do padrao Consultas PRO, com a cor de acento vinda da matriz 1079. */
function css(brand: Brand): string {
  return `
:root{
  --primary:#0f172a; --secondary:#334155; --accent:${brand.primary};
  --danger:#dc2626; --success:#16a34a; --warn:#b45309;
  --border:#e2e8f0; --subtle:#f8fafc; --ink:#1e293b; --muted:#64748b;
  --r-sm:6px; --r-md:8px; --r-lg:10px; --r-xl:14px;
  --sh-card:0 1px 3px rgba(15,23,42,.07), 0 1px 2px rgba(15,23,42,.04);
  --sh-lift:0 8px 20px rgba(15,23,42,.08);
  --sh-accent:0 8px 18px ${brand.primary}2e;
}
*{box-sizing:border-box;margin:0;padding:0}
.page{width:${A4_W}px;height:${A4_H}px;padding:26px 30px 44px;background:#fff;
  font-family:'Inter',system-ui,-apple-system,'Segoe UI',sans-serif;color:var(--ink);
  position:relative;display:flex;flex-direction:column}
.hdr{display:flex;align-items:center;justify-content:space-between;
  border-bottom:2px solid var(--accent);padding-bottom:10px;margin-bottom:16px}
.hdr img{height:44px;object-fit:contain}
.hdr-r{text-align:right}
.hdr-t{font-size:15px;font-weight:700;color:var(--accent);letter-spacing:-.02em}
.hdr-m{font-size:9px;color:var(--muted);margin-top:3px;letter-spacing:.02em}
.foot{position:absolute;left:30px;right:30px;bottom:16px;border-top:1px solid var(--border);
  padding-top:7px;font-size:8px;color:var(--muted);display:flex;justify-content:space-between}
.sec{margin-bottom:14px}
.sec-h{display:flex;align-items:center;gap:9px;margin-bottom:9px}
.sec-i{width:28px;height:28px;min-width:28px;border-radius:var(--r-md);background:var(--subtle);
  border:1px solid var(--border);display:flex;align-items:center;justify-content:center;
  color:var(--accent);font-size:13px}
.sec-t{font-size:12px;font-weight:700;text-transform:uppercase;color:var(--secondary);letter-spacing:.03em}
.sec-d{flex:1;height:0;border-bottom:2px dashed var(--border)}
.sec-b{background:var(--subtle);color:var(--muted);font-size:9px;padding:3px 10px;
  border-radius:9999px;border:1px solid var(--border);white-space:nowrap}
.card{background:#fff;border:1px solid var(--border);border-radius:var(--r-xl);
  box-shadow:var(--sh-card);padding:14px 16px}
.hero{background:linear-gradient(135deg,#fff 0%,var(--subtle) 100%);
  border:1px solid var(--border);border-radius:var(--r-xl);box-shadow:var(--sh-lift);
  padding:16px 18px;display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px}
.hero-n{font-size:17px;font-weight:700;color:var(--primary);letter-spacing:-.01em}
.hero-s{font-size:10px;color:var(--muted);margin-top:5px}
.pill{display:inline-block;font-size:9px;font-weight:600;padding:4px 11px;border-radius:9999px;
  border:1px solid transparent;white-space:nowrap}
.pill-ok{background:#f0fdf4;color:#15803d;border-color:#bbf7d0}
.pill-bad{background:#fef2f2;color:var(--danger);border-color:#fecaca}
.pill-warn{background:#fffbeb;color:var(--warn);border-color:#fde68a}
.pill-acc{background:#eff6ff;color:var(--accent);border-color:#bfdbfe}
.row{display:flex;gap:12px}
.kpi{flex:1;background:#fff;border:1px solid var(--border);border-radius:var(--r-lg);
  box-shadow:var(--sh-card);padding:12px 14px}
.kpi-l{font-size:8px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.05em}
.kpi-v{font-size:19px;font-weight:700;color:var(--primary);margin-top:5px;letter-spacing:-.02em}
.kpi-h{font-size:8px;color:var(--muted);margin-top:3px}
.kpi-accent{background:linear-gradient(135deg,#eff6ff 0%,#dbeafe 100%);border-color:#bfdbfe}
.kpi-ok{background:linear-gradient(135deg,#f0fdf4 0%,#dcfce7 100%);border-color:#bbf7d0}
.score-wrap{display:flex;gap:22px;align-items:center}
.gauge{width:190px;flex-shrink:0;text-align:center}
.gauge svg{width:190px;height:104px;display:block}
.gauge-n{font-size:30px;font-weight:700;color:var(--primary);margin-top:-26px;letter-spacing:-.03em}
.gauge-s{font-size:9px;color:var(--muted);margin-top:2px}
.callout{border-radius:var(--r-lg);padding:13px 15px;border:1px solid}
.callout-acc{background:linear-gradient(135deg,#eff6ff 0%,#dbeafe 100%);border-color:#93c5fd}
.callout-l{font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--accent)}
.callout-v{font-size:11px;color:var(--ink);margin-top:5px;line-height:1.5}
table{width:100%;border-collapse:collapse;font-size:9.5px}
thead th{background:var(--subtle);color:var(--muted);font-size:8px;font-weight:700;
  text-transform:uppercase;letter-spacing:.05em;padding:8px 10px;text-align:left;
  border-bottom:1px solid var(--border)}
tbody td{padding:8px 10px;border-bottom:1px solid #f1f5f9;color:var(--ink)}
tbody tr:last-child td{border-bottom:none}
.empty{padding:18px;text-align:center;font-size:10px;color:var(--muted);
  background:var(--subtle);border-radius:var(--r-md);border:1px dashed var(--border)}
.empty-ok{color:#15803d;background:#f0fdf4;border-color:#bbf7d0}
.grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:11px}
.grid2{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}
.note{font-size:8.5px;color:var(--muted);margin-top:7px;line-height:1.5}
.prose{font-size:10px;line-height:1.65;color:var(--ink)}
.prose p{margin-bottom:7px}
`;
}

function header(brand: Brand): string {
  return `<div class="hdr">
  <img src="${brand.logo}" alt=""/>
  <div class="hdr-r">
    <div class="hdr-t">${brand.title}</div>
    <div class="hdr-m">{{safeText template.date}} · PROT {{safeText template.protocol}}</div>
  </div>
</div>`;
}

function footer(page: number, total: number): string {
  return `<div class="foot">
  <span>Consultas PRO · Radar PRONAMPE</span>
  <span>Página ${page} de ${total}</span>
</div>`;
}

function section(icon: string, title: string, badge = ''): string {
  return `<div class="sec-h">
  <div class="sec-i">${icon}</div>
  <div class="sec-t">${title}</div>
  <div class="sec-d"></div>
  ${badge ? `<div class="sec-b">${badge}</div>` : ''}
</div>`;
}

/**
 * Medidor em arco 0–1000. O tracejado do arco colorido e fixo em 4 faixas; o
 * valor numerico ancora a leitura. O motor nao calcula geometria, entao o arco
 * comunica a escala e a cor comunica a faixa — sem prometer precisao de agulha.
 */
function gauge(): string {
  const seg = (start: number, color: string) =>
    `<path d="M 20 92 A 75 75 0 0 1 170 92" fill="none" stroke="${color}" stroke-width="13"
      stroke-linecap="round" stroke-dasharray="58 178" stroke-dashoffset="${-start}"/>`;
  return `<div class="gauge">
  <svg viewBox="0 0 190 104">
    <path d="M 20 92 A 75 75 0 0 1 170 92" fill="none" stroke="#eef2f7" stroke-width="13" stroke-linecap="round"/>
    ${seg(0, '#dc2626')}${seg(59, '#f59e0b')}${seg(118, '#eab308')}${seg(177, '#16a34a')}
  </svg>
  <div class="gauge-n">{{safeText $PRONAMPE_SCORE_CREDITO.pontuacao}}</div>
  <div class="gauge-s">de {{safeText $PRONAMPE_SCORE_CREDITO.escala_maxima}} pontos</div>
</div>`;
}

function page1(brand: Brand): string {
  return `<style>${css(brand)}</style>
<div class="page">
${header(brand)}

<div class="hero">
  <div>
    <div class="hero-n">{{safeText $PRONAMPE_IDENTIFICACAO_EMPRESA.razao_social}}</div>
    <div class="hero-s">CNPJ {{formatCpfCnpj $PRONAMPE_IDENTIFICACAO_EMPRESA.documento}} · {{safeText $PRONAMPE_IDENTIFICACAO_EMPRESA.cidade}}/{{safeText $PRONAMPE_IDENTIFICACAO_EMPRESA.uf}}</div>
    <div class="hero-s">CNAE {{safeText $PRONAMPE_CADASTRO_RECEITA.cnae_principal}} · Abertura {{safeText $PRONAMPE_CADASTRO_RECEITA.data_abertura}}</div>
  </div>
  <div style="text-align:right">
    <span class="pill pill-acc">{{safeText $PRONAMPE_CADASTRO_RECEITA.porte}}</span>
    <div style="margin-top:7px"><span class="pill pill-ok">Situação {{safeText $PRONAMPE_CADASTRO_RECEITA.situacao_cadastral}}</span></div>
  </div>
</div>

<div class="sec">
  ${section('◎', 'Resumo executivo', 'Análise de crédito PJ')}
  <div class="card">
    <div class="score-wrap">
      ${gauge()}
      <div style="flex:1">
        <div class="kpi-l">Faixa de risco</div>
        <div style="font-size:20px;font-weight:700;color:var(--primary);margin:5px 0 12px">
          {{safeText $PRONAMPE_SCORE_CREDITO.faixa_risco}}
        </div>
        <div class="row">
          <div class="kpi kpi-ok">
            <div class="kpi-l">Limite recomendado</div>
            <div class="kpi-v" style="color:#15803d">{{toCurrency $PRONAMPE_RECOMENDACAO_RISCO_CREDITO.limite_recomendado}}</div>
          </div>
          <div class="kpi kpi-accent">
            <div class="kpi-l">Rating bancário</div>
            <div class="kpi-v" style="color:var(--accent)">{{safeText $PRONAMPE_RATING_BANCARIO_RISCO.nota}} · {{safeText $PRONAMPE_RATING_BANCARIO_RISCO.classificacao}}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<div class="sec">
  <div class="callout callout-acc">
    <div class="callout-l">Orientação de venda</div>
    <div class="callout-v">{{safeText $PRONAMPE_RECOMENDACAO_RISCO_CREDITO.orientacao_venda}}</div>
  </div>
</div>

<div class="sec">
  ${section('₪', 'Capacidade financeira')}
  <div class="grid3">
    <div class="kpi">
      <div class="kpi-l">Capacidade mensal</div>
      <div class="kpi-v">{{toCurrency $PRONAMPE_CAPACIDADE_PAGAMENTO.capacidade_mensal}}</div>
      <div class="kpi-h">Pagamento suportado por mês</div>
    </div>
    <div class="kpi">
      <div class="kpi-l">Gasto estimado</div>
      <div class="kpi-v">{{toCurrency $PRONAMPE_CAPACIDADE_PAGAMENTO.gasto_estimado}}</div>
      <div class="kpi-h">Volume estimado de despesas</div>
    </div>
    <div class="kpi">
      <div class="kpi-l">Faturamento estimado</div>
      <div class="kpi-v">{{toCurrency $PRONAMPE_FATURAMENTO_CAPACIDADE.faturamento_estimado}}</div>
      <div class="kpi-h">{{safeText $PRONAMPE_FATURAMENTO_CAPACIDADE.faixa}}</div>
    </div>
  </div>
</div>

<div class="sec">
  ${section('✎', 'Parecer executivo')}
  <div class="card prose">{{safeText $PRONAMPE_RATING_BANCARIO_RISCO.parecer}}</div>
</div>

${footer(1, 4)}
</div>`;
}

function page2(brand: Brand): string {
  return `<style>${css(brand)}</style>
<div class="page">
${header(brand)}

<div class="sec">
  ${section('★', 'Rating bancário', 'Nota A–F explicável')}
  <div class="row">
    <div class="card" style="width:210px;text-align:center">
      <div class="kpi-l">Nota atribuída</div>
      <div style="font-size:56px;font-weight:800;color:var(--accent);line-height:1.1;margin:6px 0;letter-spacing:-.04em">
        {{safeText $PRONAMPE_RATING_BANCARIO_RISCO.nota}}
      </div>
      <div style="font-size:15px;font-weight:700;color:var(--primary)">{{safeText $PRONAMPE_RATING_BANCARIO_RISCO.classificacao}}</div>
      <div style="margin-top:9px"><span class="pill pill-acc">{{safeText $PRONAMPE_RATING_BANCARIO_RISCO.faixa_risco}}</span></div>
      <div class="kpi-h" style="margin-top:9px">{{safeText $PRONAMPE_RATING_BANCARIO_RISCO.pontuacao}} de 200 pontos</div>
    </div>
    <div class="card" style="flex:1;padding:0;overflow:hidden">
      <table>
        <thead><tr><th style="width:44%">Fator</th><th style="width:34%">Apurado</th><th style="width:22%">Impacto</th></tr></thead>
        <tbody>{{#each $PRONAMPE_FATORES_RATING_RISCO}}<tr>
          <td style="font-weight:600">{{safeText fator}}</td>
          <td>{{safeText valor}}</td>
          <td>{{safeText impacto}}</td>
        </tr>{{/each}}</tbody>
      </table>
    </div>
  </div>
</div>

<div class="sec">
  ${section('▣', 'Carteira de crédito · SCR Bacen')}
  <div class="grid2" style="margin-bottom:11px">
    <div class="kpi">
      <div class="kpi-l">Valor total da carteira</div>
      <div class="kpi-v">{{toCurrency $PRONAMPE_CARTEIRA_SCR_BACEN.valor_total}}</div>
      <div class="kpi-h">{{safeText $PRONAMPE_CARTEIRA_SCR_BACEN.contratos_ativos}} contrato(s) ativo(s)</div>
    </div>
    <div class="kpi">
      <div class="kpi-l">Classificação de risco</div>
      <div class="kpi-v">{{safeText $PRONAMPE_CARTEIRA_SCR_BACEN.faixa_risco_carteira}}</div>
      <div class="kpi-h">Métrica distinta do score da empresa</div>
    </div>
  </div>
  <div class="grid2">
    <div class="kpi">
      <div class="kpi-l">Valor vencido</div>
      <div class="kpi-v">{{toCurrency $PRONAMPE_CARTEIRA_SCR_BACEN.valor_vencido}}</div>
    </div>
    <div class="kpi">
      <div class="kpi-l">Prejuízo registrado</div>
      <div class="kpi-v">{{toCurrency $PRONAMPE_CARTEIRA_SCR_PREJUIZO.prejuizo}}</div>
    </div>
  </div>
</div>

<div class="sec">
  ${section('⚠', 'Restrições e anotações')}
  <div class="grid2" style="margin-bottom:11px">
    <div class="kpi">
      <div class="kpi-l">Ocorrências</div>
      <div class="kpi-v">{{safeText $PRONAMPE_RESTRICOES_RESUMO.quantidade}}</div>
    </div>
    <div class="kpi">
      <div class="kpi-l">Valor total</div>
      <div class="kpi-v">{{toCurrency $PRONAMPE_RESTRICOES_RESUMO.valor_total}}</div>
    </div>
  </div>
  <div class="empty empty-ok">Nenhuma restrição ativa localizada nesta consulta.</div>
</div>

${footer(2, 4)}
</div>`;
}

function page3(brand: Brand): string {
  return `<style>${css(brand)}</style>
<div class="page">
${header(brand)}

<div class="sec">
  ${section('⚖', 'Situação fiscal')}
  <div class="grid2">
    <div class="card">
      <div class="kpi-l">Dívida ativa da União (PGFN)</div>
      <div class="kpi-v" style="font-size:24px">{{safeText $PRONAMPE_DIVIDA_ATIVA_UNIAO.possui_divida}}</div>
      <div class="kpi-h">{{safeText $PRONAMPE_DIVIDA_ATIVA_UNIAO.quantidade}} inscrição(ões) registrada(s)</div>
    </div>
    <div class="card">
      <div class="kpi-l">Certidão de regularidade</div>
      <div class="kpi-v" style="font-size:24px">{{safeText $PRONAMPE_CERTIDAO_REGULARIDADE.situacao}}</div>
      <div class="kpi-h">Certidão negativa de débitos (CND)</div>
    </div>
  </div>
</div>

<div class="sec">
  ${section('▤', 'Cadastro na Receita Federal')}
  <div class="card" style="padding:0;overflow:hidden">
    <table>
      <tbody>
        <tr><td style="width:34%;color:var(--muted);font-weight:600">Porte</td><td style="font-weight:600">{{safeText $PRONAMPE_CADASTRO_RECEITA.porte}}</td></tr>
        <tr><td style="color:var(--muted);font-weight:600">Situação cadastral</td><td style="font-weight:600">{{safeText $PRONAMPE_CADASTRO_RECEITA.situacao_cadastral}}</td></tr>
        <tr><td style="color:var(--muted);font-weight:600">Data de abertura</td><td style="font-weight:600">{{safeText $PRONAMPE_CADASTRO_RECEITA.data_abertura}}</td></tr>
        <tr><td style="color:var(--muted);font-weight:600">Capital social</td><td style="font-weight:600">{{toCurrency $PRONAMPE_CADASTRO_RECEITA.capital_social}}</td></tr>
        <tr><td style="color:var(--muted);font-weight:600">CNAE principal</td><td style="font-weight:600">{{safeText $PRONAMPE_CADASTRO_RECEITA.cnae_principal}}</td></tr>
        <tr><td style="color:var(--muted);font-weight:600">Optante pelo Simples</td><td style="font-weight:600">{{safeText $PRONAMPE_CADASTRO_RECEITA.optante_simples}}</td></tr>
        <tr><td style="color:var(--muted);font-weight:600">Optante pelo MEI</td><td style="font-weight:600">{{safeText $PRONAMPE_CADASTRO_RECEITA.optante_mei}}</td></tr>
        <tr><td style="color:var(--muted);font-weight:600">Consultas anteriores</td><td style="font-weight:600">{{safeText $PRONAMPE_CONSULTAS_ANTERIORES.total}}</td></tr>
      </tbody>
    </table>
  </div>
</div>

<div class="sec">
  ${section('☰', 'Quadro societário')}
  <div class="card" style="padding:0;overflow:hidden">
    <table>
      <thead><tr><th style="width:58%">Documento</th><th>Possui restrições</th></tr></thead>
      <tbody>{{#each $PRONAMPE_QUADRO_SOCIETARIO}}<tr>
        <td style="font-family:monospace;font-weight:600">{{safeText documento_mascarado}}</td>
        <td>{{safeText possui_restricoes}}</td>
      </tr>{{/each}}</tbody>
    </table>
  </div>
  <div class="note">Documentos de sócios exibidos com máscara, conforme a LGPD. Dados de terceiros não são detalhados neste relatório.</div>
</div>

${footer(3, 4)}
</div>`;
}

function page4(brand: Brand): string {
  return `<style>${css(brand)}</style>
<div class="page">
${header(brand)}

<div class="sec">
  ${section('◈', 'Identificação da consulta')}
  <div class="card" style="padding:0;overflow:hidden">
    <table>
      <tbody>
        <tr><td style="width:34%;color:var(--muted);font-weight:600">Protocolo</td><td style="font-family:monospace">{{safeText $PRONAMPE_IDENTIFICACAO.protocolo}}</td></tr>
        <tr><td style="color:var(--muted);font-weight:600">Documento consultado</td><td style="font-weight:600">{{formatCpfCnpj $PRONAMPE_IDENTIFICACAO.documento}}</td></tr>
        <tr><td style="color:var(--muted);font-weight:600">Data da consulta</td><td>{{safeText $PRONAMPE_IDENTIFICACAO.data_consulta}}</td></tr>
        <tr><td style="color:var(--muted);font-weight:600">Produto</td><td>{{safeText $PRONAMPE_IDENTIFICACAO.produto}}</td></tr>
        <tr><td style="color:var(--muted);font-weight:600">Situação da apuração</td><td>{{safeText $PRONAMPE_IDENTIFICACAO.situacao_apuracao}}</td></tr>
      </tbody>
    </table>
  </div>
</div>

<div class="sec">
  ${section('?', 'Como ler este relatório')}
  <div class="card prose">
    <p><strong>Score de crédito</strong> mede o risco da empresa numa escala de 0 a 1000. Quanto maior a pontuação, menor a probabilidade de inadimplência.</p>
    <p><strong>Risco da carteira</strong>, na seção SCR Bacen, avalia o endividamento bancário registrado no Banco Central. É uma métrica <em>distinta</em> do score: uma empresa pode ter score alto e carteira classificada como de risco elevado.</p>
    <p><strong>Rating bancário</strong> resume as duas leituras numa nota de A a F, acompanhada dos fatores que a sustentam e do impacto de cada um.</p>
    <p><strong>Limite recomendado</strong> é uma sugestão de exposição de crédito, não uma aprovação. A decisão final permanece com a instituição concedente.</p>
    <p>Seções sem dado na consulta exibem aviso próprio. Este relatório nunca apresenta campos em branco sem explicação.</p>
  </div>
</div>

<div class="sec">
  <div class="callout callout-acc">
    <div class="callout-l">Sobre esta consulta</div>
    <div class="callout-v">Relatório emitido pela Consultas PRO a partir de consulta a birôs de crédito. Os dados refletem a situação no momento da apuração e podem sofrer alteração.</div>
  </div>
</div>

${footer(4, 4)}
</div>`;
}

export function buildRadarPronampeReport(
  brandReference: ConsultasProBrandReference,
): ReportTemplate {
  const logoElement = brandReference.layout.elements.find(
    (element) =>
      element.type === 'image' &&
      typeof element.data?.src === 'string' &&
      element.data.src.startsWith('data:image/'),
  );
  if (!logoElement || typeof logoElement.data?.src !== 'string') {
    throw new Error('A matriz visual 1079 nao possui a logo oficial incorporada.');
  }
  const dividerElement = brandReference.layout.elements.find(
    (element) =>
      element.type === 'divider' &&
      typeof element.style.background === 'string' &&
      element.style.background.toUpperCase() !== '#E2E8F0',
  );
  const titleElement = brandReference.layout.elements.find(
    (element) =>
      element.type === 'text' &&
      typeof element.data?.text === 'string' &&
      /RELAT[OÓ]RIO ANAL[IÍ]TICO/i.test(element.data.text),
  );

  const brand: Brand = {
    logo: logoElement.data.src,
    primary:
      typeof dividerElement?.style.background === 'string'
        ? dividerElement.style.background
        : '#2563eb',
    title:
      typeof titleElement?.data?.text === 'string'
        ? titleElement.data.text
        : 'Relatório Analítico de Crédito',
  };

  const pages = [
    { name: 'Página 1 — Resumo executivo', html: page1(brand) },
    { name: 'Página 2 — Rating, SCR e restrições', html: page2(brand) },
    { name: 'Página 3 — Situação fiscal e cadastro', html: page3(brand) },
    { name: 'Página 4 — Auditoria da consulta', html: page4(brand) },
  ];

  return {
    id: 'brasilcred-template-radar-pronampe-composta',
    name: 'Radar PRONAMPE — Análise Completa',
    version: 4,
    canvas: { background: '#f1f5f9', grid: 10 },
    frames: pages.map((page, index) => ({
      id: `bc-radar-page-${index + 1}`,
      name: page.name,
      preset: 'a4-p' as const,
      x: 10,
      y: 10 + index * (A4_H + 20),
      width: A4_W,
      height: A4_H,
      background: '#ffffff',
      customHtml: page.html,
    })),
    elements: [],
    metadata: {
      consultasProTemplate: {
        generator: 'brasilcred-radar-pronampe-report',
        generatorVersion: 4,
        visualStandard: 'CONSULTAS_PRO_1079',
        brandReferenceTemplateId: brandReference.templateId,
        provider: 'brasil-cred',
        product: 'radar-pronampe',
        layout: 'custom-html',
        publicationStatus: 'READY_FOR_MANUAL_REVIEW',
      },
    },
  };
}
