import type { ProviderConsultation } from '@/types/integrations';
import type { ExpressionContext } from '@/lib/expressionEngine';

export type TemplateFieldTag = 'label' | 'value' | 'icon' | 'image' | 'divider' | 'container' | 'table' | 'text' | 'speedometer';

export type TemplateField = {
  id: string;
  label: string;
  expression: string;
  icon?: string;
  tag?: TemplateFieldTag;
  className?: string;
  fontSize?: number;
  spacing?: number;
  color?: string;
  backgroundColor?: string;
};

export type TemplateSection = {
  id: string;
  title: string;
  fields: TemplateField[];
  kind?: 'header' | 'data' | 'kpi-row' | 'score' | 'debt-table' | 'container' | 'free-text' | 'custom';
  icon?: string;
  locked?: boolean;
  source?: 'system' | 'consultation-type' | 'custom';
  xml?: string;
};

let _nextId = 1;
function uid() {
  return `f_${Date.now()}_${_nextId++}`;
}

export const DEFAULT_SECTIONS: TemplateSection[] = [
  {
    id: 'header',
    title: 'Header',
    kind: 'header',
    source: 'system',
    fields: [
      { id: uid(), label: 'Empresa', expression: '{$template.company}', tag: 'label' },
      { id: uid(), label: 'Título do relatório', expression: 'Relatório Analítico de Crédito', tag: 'text', fontSize: 14 },
      { id: uid(), label: 'Data', expression: '{$template.date}', tag: 'value' },
      { id: uid(), label: 'Protocolo', expression: '{$template.protocol}', tag: 'value' },
    ],
  },
  {
    id: 'client-info',
    title: 'Dados Pessoais',
    kind: 'data',
    source: 'system',
    fields: [
      { id: uid(), label: 'Cliente Analisado', expression: '{$cliente.nome}', icon: 'User', tag: 'value' },
      { id: uid(), label: 'Documento', expression: '{$cliente.documento}', icon: 'Hash', tag: 'value' },
      { id: uid(), label: 'Tipo de Relatório', expression: 'Padrão', icon: 'Tag', tag: 'value' },
    ],
  },
  {
    id: 'financial-summary',
    title: 'Resumo Financeiro',
    kind: 'kpi-row',
    source: 'system',
    fields: [
      { id: uid(), label: 'Total Apontado', expression: '{$RESUMO_FINANCEIRO.totalApontado}', tag: 'value' },
      { id: uid(), label: 'Total Deduzido', expression: '{$RESUMO_FINANCEIRO.totalDeduzido}', tag: 'value' },
      { id: uid(), label: 'Risco Bacen (Vencido)', expression: '{$RESUMO_FINANCEIRO.riscoBacenVencido}', tag: 'value' },
    ],
  },
  {
    id: 'score',
    title: 'Score de Crédito',
    kind: 'score',
    icon: 'Gauge',
    source: 'system',
    fields: [
      { id: uid(), label: 'Título', expression: 'Como o mercado enxerga seu CPF hoje (e o que está travando seu crédito)', tag: 'text', fontSize: 14 },
      { id: uid(), label: 'Subtítulo', expression: 'Seu Score é uma estimativa de chance de pagar em dia nos próximos 6 meses. Quanto maior a pontuação, maior tende a ser a facilidade para conseguir crédito e melhores condições.', tag: 'text', fontSize: 10, color: 'hsl(var(--muted-foreground))' },
      { id: uid(), label: 'Velocímetro', expression: '{$SCORE.valor}', icon: 'Gauge', tag: 'speedometer' },
      { id: uid(), label: 'Score', expression: '{$SCORE.valor}', icon: 'Gauge', tag: 'value' },
      { id: uid(), label: 'Faixa', expression: '{$SCORE.faixa}', icon: 'Gauge', tag: 'value', color: '#ca8a04' },
      { id: uid(), label: 'Chance de pagar (6 meses)', expression: '{$SCORE.chancePagar}%', icon: 'CheckCircle', tag: 'value' },
      { id: uid(), label: 'Probabilidade de inadimplência', expression: '{$SCORE.probabilidadeInadimplencia}%', icon: 'AlertTriangle', tag: 'value' },
      { id: uid(), label: 'Legenda', expression: 'Péssimo 0-200 | Ruim 201-400 | Regular 401-600 | Bom 601-800 | Ótimo 801-1000', tag: 'text', backgroundColor: 'hsl(var(--muted) / 0.5)' },
      { id: uid(), label: 'Interpretação', expression: 'Hoje seu Score está em Regular (401 a 600) — isso geralmente indica que o mercado enxerga risco moderado. O objetivo aqui é identificar o que mais pesa na sua pontuação e montar o caminho mais rápido para destravar aprovações.', tag: 'text', color: 'hsl(var(--foreground))', backgroundColor: 'hsl(var(--muted) / 0.3)' },
      { id: uid(), label: 'Influência - título', expression: 'O que mais influencia sua pontuação', tag: 'text', fontSize: 11 },
      { id: uid(), label: 'Influência - texto', expression: 'O Serasa Score é calculado por pilares. Os que mais pesam são hábitos de pagamento e experiência/relacionamento com o mercado — e dívidas negativadas também têm impacto alto, considerando inclusive o tempo desde a quitação.', tag: 'text', fontSize: 10 },
      { id: uid(), label: 'Bullet 1', expression: 'Pagamentos em dia (cartão, parcelas e contas) têm peso alto na pontuação.', tag: 'text' },
      { id: uid(), label: 'Bullet 2', expression: 'Dívidas negativadas costumam derrubar o Score e demoram a perder impacto sem regularização.', tag: 'text' },
      { id: uid(), label: 'Bullet 3', expression: 'Muitas consultas/simulações de crédito em pouco tempo podem pesar negativamente (busca por crédito).', tag: 'text' },
      { id: uid(), label: 'Ajuda - título', expression: 'Nós te ajudamos com tudo isso!', icon: 'CheckCircle', tag: 'text', color: 'hsl(var(--success))' },
      { id: uid(), label: 'Ajuda - texto', expression: 'O que trava crédito quase sempre é simples: pendência/negativação + histórico recente. A boa notícia é que, com estratégia, dá pra acelerar sua reabilitação e voltar a ser aprovado com mais facilidade.', tag: 'text' },
      { id: uid(), label: 'Plano de ação - título', expression: 'Plano de Ação — Seu Próximo Passo', tag: 'text', color: 'hsl(var(--primary))' },
      { id: uid(), label: 'Atenção', expression: 'Score e faixas são indicadores estatísticos e não garantem aprovação de crédito. A decisão final é do credor. O objetivo deste relatório é analisar os motivos de negativa e identificar o que está impactando no seu crédito.', icon: 'AlertTriangle', tag: 'text' },
    ],
  },
  {
    id: 'debt-table',
    title: 'Tabela de Dívidas',
    kind: 'debt-table',
    source: 'system',
    locked: true,
    fields: [
      { id: uid(), label: 'Tipo', expression: '{$consulta.tipo}', tag: 'label' },
      { id: uid(), label: 'Credor', expression: '{$divida.credor}', tag: 'value' },
      { id: uid(), label: 'Contrato', expression: '{$divida.contrato}', tag: 'value' },
      { id: uid(), label: 'Valor', expression: '{$divida.valor}', tag: 'value', color: '#dc2626' },
    ],
  },
];

function attr(name: string, value: string | number | boolean | undefined | null) {
  if (value === undefined || value === null || value === '') return '';
  return ` ${name}="${String(value).replace(/"/g, '&quot;')}"`;
}

function parseAttrs(raw: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const attrRegex = /([\w:-]+)="([^"]*)"/g;
  let match: RegExpExecArray | null;
  while ((match = attrRegex.exec(raw)) !== null) attrs[match[1]!] = match[2]!.replace(/&quot;/g, '"');
  return attrs;
}

function sectionIdFromTitle(title: string) {
  return title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || `section-${Date.now()}`;
}

function normalizeTag(value: string | undefined): TemplateFieldTag {
  const allowed: TemplateFieldTag[] = ['label', 'value', 'icon', 'image', 'divider', 'container', 'table', 'text', 'speedometer'];
  return allowed.includes(value as TemplateFieldTag) ? value as TemplateFieldTag : 'value';
}

export function sectionToXml(section: TemplateSection): string {
  const fieldsXml = section.fields
    .map((f) => `  <field${attr('label', f.label)}${attr('icon', f.icon)}${attr('tag', f.tag ?? 'value')}${attr('class', f.className)}${attr('font-size', f.fontSize)}${attr('spacing', f.spacing)}${attr('color', f.color)}${attr('background', f.backgroundColor)}>${f.expression}</field>`)
    .join('\n');
  return `<section${attr('name', section.title)}${attr('kind', section.kind ?? 'custom')}${attr('icon', section.icon)}>${fieldsXml ? `\n${fieldsXml}\n` : '\n'}</section>`;
}

export function parseSectionXml(xml: string): TemplateSection | null {
  const sectionMatch = xml.match(/<section([^>]*)>([\s\S]*?)<\/section>/i);
  if (!sectionMatch) return null;
  const sectionAttrs = parseAttrs(sectionMatch[1] ?? '');
  const body = sectionMatch[2] ?? '';
  const title = sectionAttrs.name || 'Seção';
  return {
    id: sectionIdFromTitle(title),
    title,
    kind: (sectionAttrs.kind || 'custom') as TemplateSection['kind'],
    icon: sectionAttrs.icon || undefined,
    fields: xmlToFields(body),
  };
}

export function xmlToSection(xml: string, fallbackSection: TemplateSection): TemplateSection {
  const parsed = parseSectionXml(xml);
  if (!parsed) return { ...fallbackSection, xml };
  return {
    ...fallbackSection,
    ...parsed,
    id: fallbackSection.id,
    locked: fallbackSection.locked,
    source: fallbackSection.source,
  };
}

export function xmlToFields(xml: string): TemplateField[] {
  const fields: TemplateField[] = [];
  const fieldRegex = /<field([^>]*)>([\s\S]*?)<\/field>/g;
  let match: RegExpExecArray | null;
  while ((match = fieldRegex.exec(xml)) !== null) {
    const attrs = parseAttrs(match[1] ?? '');
    fields.push({
      id: uid(),
      label: attrs.label ?? '',
      icon: attrs.icon || undefined,
      tag: normalizeTag(attrs.tag),
      className: attrs.class || undefined,
      fontSize: attrs['font-size'] ? Number(attrs['font-size']) : undefined,
      spacing: attrs.spacing ? Number(attrs.spacing) : undefined,
      color: attrs.color || undefined,
      backgroundColor: attrs.background || undefined,
      expression: (match[2] ?? '').trim(),
    });
  }
  return fields;
}

export function formatTemplateXml(xml: string): string {
  const compact = xml
    .replace(/>\s+</g, '><')
    .replace(/(<\/section>|<\/container>|<\/card>|<\/table>)/g, '$1\n')
    .replace(/(<section[^>]*>|<container[^>]*>|<card[^>]*>|<table[^>]*>|<field[^>]*>.*?<\/field>|<[^/!][^>]*\/>)/g, '\n$1')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  let depth = 0;
  return compact.map((line) => {
    if (/^<\//.test(line)) depth = Math.max(0, depth - 1);
    const out = `${'  '.repeat(depth)}${line}`;
    if (/^<(section|container|card|table)\b/i.test(line) && !/<\/(section|container|card|table)>$/i.test(line)) depth += 1;
    return out;
  }).join('\n');
}

export function createSection(title: string, fields?: TemplateField[], options?: Partial<Omit<TemplateSection, 'id' | 'title' | 'fields'>>): TemplateSection {
  return {
    id: `section_${Date.now()}_${_nextId++}`,
    title,
    fields: fields ?? [],
    ...options,
  };
}

export function createField(label: string, expression: string, icon?: string): TemplateField {
  return { id: uid(), label, expression, icon, tag: 'value' };
}

function parseJsonObject(raw: string | undefined): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asNumber(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function buildExpressionContextFromConsultation(product: ProviderConsultation | null): ExpressionContext {
  const raw = parseJsonObject(product?.sampleResponse);
  const dados = asRecord(raw.dados_pessoais ?? raw.cliente ?? raw.DADOS_PESSOAIS);
  const score = asRecord(raw.score ?? raw.SCORE ?? asRecord(raw.serasa).score ?? asRecord(asRecord(raw.resultado).pontuacao));
  const spc = asRecord(raw.spc ?? raw.DIVIDAS_SPC ?? asRecord(raw.resultado).restricoes_spc);
  const serasa = asRecord(raw.serasa ?? raw.DIVIDAS_SERASA ?? asRecord(raw.resultado).restricoes_serasa);

  const totalSpc = asNumber(spc.valor_total ?? asRecord(spc.totaisCalculados).total);
  const totalSerasa = asNumber(serasa.valor_total ?? asRecord(serasa.totaisCalculados).total);
  const resumo = asRecord(raw.RESUMO_FINANCEIRO ?? raw.resumo_financeiro);
  const totalApontado = asNumber(resumo.totalApontado ?? resumo.total_apontado ?? totalSpc + totalSerasa);
  const totalDeduzido = asNumber(resumo.totalDeduzido ?? resumo.total_deduzido ?? totalApontado);
  const riscoBacenVencido = asNumber(resumo.riscoBacenVencido ?? resumo.risco_bacen_vencido);
  const firstDebt = Array.isArray(raw.dividas) ? (raw.dividas[0] as Record<string, unknown> | undefined) : undefined;

  return {
    $json: {
      ...raw,
      cliente: {
        nome: dados.nome ?? dados.nome_completo ?? 'JULIANO CAMPOS PEREIRA',
        documento: dados.cpf ?? dados.documento ?? '403.406.588-51',
        ...dados,
      },
      consulta: {
        tipo: product?.name ?? 'Consulta',
        id: product?.id ?? '',
      },
      divida: {
        credor: firstDebt?.credor ?? firstDebt?.origem ?? '',
        contrato: firstDebt?.contrato ?? '',
        valor: firstDebt?.valor ?? '',
      },
      SCORE: {
        valor: score.valor ?? score.score ?? score.pontuacao ?? '',
        faixa: score.faixa ?? score.classificacao ?? '',
        chancePagar: score.chancePagar ?? score.chance_pagar ?? '',
        probabilidadeInadimplencia: score.probabilidadeInadimplencia ?? score.probabilidade_inadimplencia ?? '',
        ...score,
      },
      RESUMO_FINANCEIRO: {
        totalApontado,
        totalDeduzido,
        riscoBacenVencido,
      },
    },
    $template: {
      protocol: 'CP-20848865',
      date: new Date().toLocaleDateString('pt-BR'),
      company: 'Consultas PRO',
    },
    $block: {
      id: product?.id ?? '',
      name: product?.name ?? 'Consulta',
      type: product?.externalId ?? product?.endpoint ?? '',
    },
  };
}
