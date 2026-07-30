import type { ReportTemplate } from '../../lib/template-engine/template';

export type SollosReportField = {
  id: string;
  key: string;
  label: string;
  sortOrder: number;
  dataType: string;
  conditionalRules?: unknown[];
  [key: string]: unknown;
};

export type SollosReportFieldConfig = {
  version: number;
  title?: string;
  fields: SollosReportField[];
  [key: string]: unknown;
};

export type SollosReportFieldType = {
  id: string;
  key: string;
  label: string;
  description?: string | null;
  color?: string | null;
  icon?: string | null;
  reportFieldConfig?: SollosReportFieldConfig | null;
  isCollection?: boolean;
};

export type SollosSamplingEvidence = {
  validSamples: number;
  totalSamples: number;
  coveredLeafPathCount: number;
  totalLeafPathCount: number;
  draftUpdatedAt: string;
};

type SollosTemplateBuildInput = {
  productId: string;
  productName: string;
  personType: 'PF' | 'PJ' | 'PF_PJ';
  fieldTypes: SollosReportFieldType[];
  mappedData: Record<string, unknown>;
  samplingEvidence: SollosSamplingEvidence;
};

type ReportCategory =
  | 'cadastral'
  | 'score'
  | 'restricoes'
  | 'bacen'
  | 'complementares'
  | 'tecnico';

type FieldInventoryItem = {
  typeKey: string;
  typeLabel: string;
  fieldId: string;
  fieldKey: string;
  fieldLabel: string;
  dataType: string;
  category: ReportCategory;
  expression: string;
};

export type SollosTemplateAudit = {
  valid: boolean;
  errors: string[];
  warnings: string[];
  typeCount: number;
  fieldCount: number;
  frameCount: number;
};

const PAGE_WIDTH = 794;
const PAGE_HEIGHT = 1123;
const PAGE_GAP = 72;
const MAX_TABLE_COLUMNS = 6;

const CATEGORY_ORDER: ReportCategory[] = [
  'cadastral',
  'score',
  'restricoes',
  'bacen',
  'complementares',
  'tecnico',
];

const CATEGORY_LABELS: Record<ReportCategory, string> = {
  cadastral: 'Identificação e cadastro',
  score: 'Score, risco e capacidade',
  restricoes: 'Restrições e ocorrências',
  bacen: 'Banco Central e SCR',
  complementares: 'Informações complementares',
  tecnico: 'Controle técnico e rastreabilidade',
};

function normalizeConfig(value: unknown): SollosReportFieldConfig {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { version: 1, fields: [] };
  }
  const parsed = value as Record<string, unknown>;
  return {
    ...parsed,
    version:
      typeof parsed.version === 'number' && Number.isFinite(parsed.version)
        ? parsed.version
        : 1,
    fields: Array.isArray(parsed.fields)
      ? (parsed.fields.filter(
          (field): field is SollosReportField =>
            Boolean(field) &&
            typeof field === 'object' &&
            !Array.isArray(field) &&
            typeof (field as SollosReportField).id === 'string' &&
            typeof (field as SollosReportField).key === 'string',
        ) as SollosReportField[])
      : [],
  };
}

/**
 * Une evidencias de produtos Sollos diferentes sem rebatizar nem apagar um
 * campo que ja foi aprovado. Campos novos sao anexados ao contrato existente.
 */
export function mergeReportFieldConfigs(
  existingValue: unknown,
  incomingValue: unknown,
): SollosReportFieldConfig {
  const existing = normalizeConfig(existingValue);
  const incoming = normalizeConfig(incomingValue);
  const known = new Set<string>();
  const fields: SollosReportField[] = [];

  for (const field of [...existing.fields, ...incoming.fields]) {
    const identity = field.id.trim() || field.key.trim();
    if (!identity || known.has(identity)) continue;
    known.add(identity);
    fields.push({ ...field });
  }

  return {
    ...incoming,
    ...existing,
    version: Math.max(existing.version, incoming.version, 1),
    fields: fields.map((field, sortOrder) => ({ ...field, sortOrder })),
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function normalizeForMatch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toUpperCase();
}

function classifyType(fieldType: SollosReportFieldType): ReportCategory {
  const value = normalizeForMatch(
    `${fieldType.key} ${fieldType.label} ${fieldType.description ?? ''}`,
  );

  if (
    /(HEADER|CONTROLE|PROTOCOLO|REQUISICAO|DADOS_RETORNADOS|INFORMACOES_RETORNO|TEMPO_RESPOSTA)/.test(
      value,
    )
  ) {
    return 'tecnico';
  }
  if (/(BACEN|SCR|SISTEMA DE INFORMACOES DE CREDITO|RELATORIO_SCR)/.test(value)) {
    return 'bacen';
  }
  if (
    /(DADOS|PESSOA|EMPRESA|ENDERECO|TELEFONE|EMAIL|QUADRO|PARTICIPACAO|RECEITA|CADASTR|IDENTIFICA)/.test(
      value,
    )
  ) {
    return 'cadastral';
  }
  if (
    /(DIVIDA|PEND_|PENDENCIA|REFIN|VENCIDA|PROTEST|CCF|CHEQUE|ACAO|CADIN|CONTUMACIA|RECHEQUE|RESTRI)/.test(
      value,
    )
  ) {
    return 'restricoes';
  }
  if (/(SCORE|RATING|CAPACIDADE|RISCO|PROBABILIDADE)/.test(value)) {
    return 'score';
  }
  return 'complementares';
}

function fieldExpression(
  field: SollosReportField,
  typeKey?: string,
  scopedToCollectionItem = false,
): string {
  const key =
    typeKey && !scopedToCollectionItem ? `${typeKey}.${field.key}` : field.key;
  const type = field.dataType.toLowerCase();
  if (type === 'currency' || type === 'money') return `toCurrency ${key}`;
  if (type === 'document' || type === 'cpf' || type === 'cnpj') {
    return `formatCpfCnpj ${key}`;
  }
  return `safeText ${key}`;
}

function fieldValueMarkup(
  field: SollosReportField,
  typeKey?: string,
  scopedToCollectionItem = false,
): string {
  const expression = fieldExpression(field, typeKey, scopedToCollectionItem);
  return `{{${expression}}}`;
}

function chunk<T>(items: T[], size: number): T[][] {
  if (items.length === 0) return [[]];
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function pageShell(params: {
  productId: string;
  productName: string;
  category: ReportCategory;
  typeLabel: string;
  typeKey: string;
  content: string;
  part: number;
  totalParts: number;
}): string {
  const categoryLabel = CATEGORY_LABELS[params.category];
  const partLabel =
    params.totalParts > 1 ? ` · parte ${params.part} de ${params.totalParts}` : '';
  return `<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin: 0; background: #f8fafc; color: #10201f; font-family: Geist, Inter, Arial, sans-serif; }
  .sheet { width: 794px; min-height: 1123px; padding: 42px 46px 38px; background: #f8fafc; }
  .eyebrow { color: #0f8f83; font-size: 11px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
  h1 { margin: 8px 0 4px; font-size: 24px; line-height: 1.18; color: #0f2624; }
  .subtitle { color: #5f706e; font-size: 12px; }
  .type-card { margin-top: 24px; border: 1px solid #d9e5e3; border-radius: 16px; overflow: hidden; background: #fff; box-shadow: 0 8px 28px rgba(15,38,36,.06); }
  .type-head { padding: 17px 20px; background: linear-gradient(135deg,#e8f7f4,#f5fbfa); border-bottom: 1px solid #d9e5e3; }
  .type-title { font-size: 17px; font-weight: 800; color: #143b37; }
  .type-key { margin-top: 4px; color: #71817f; font: 10px/1.3 "JetBrains Mono", monospace; }
  .cards { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 12px; padding: 18px 20px 22px; }
  .field { min-height: 68px; padding: 12px 14px; border: 1px solid #e2ebe9; border-radius: 12px; background: #fbfdfd; }
  .field-label { color: #6b7b79; font-size: 10px; font-weight: 750; letter-spacing: .04em; text-transform: uppercase; }
  .field-value { margin-top: 7px; color: #10201f; font-size: 13px; font-weight: 650; overflow-wrap: anywhere; white-space: pre-wrap; }
  .table-wrap { padding: 18px 20px 22px; overflow: hidden; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 10px; }
  th { padding: 9px 8px; background: #eff7f5; color: #46615e; text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: .03em; border-bottom: 1px solid #cfe0dd; }
  td { padding: 9px 8px; color: #243735; border-bottom: 1px solid #e6eeed; vertical-align: top; overflow-wrap: anywhere; }
  tr:nth-child(even) td { background: #fbfdfd; }
  .empty { margin: 18px 20px 22px; padding: 18px; border: 1px dashed #b9cfcb; border-radius: 12px; color: #607472; text-align: center; font-size: 12px; }
  .footer { margin-top: 24px; display: flex; justify-content: space-between; color: #82908f; font-size: 9px; }
</style>
<main class="sheet">
  <div class="eyebrow">${escapeHtml(categoryLabel)}</div>
  <h1>${escapeHtml(params.productName)}</h1>
  <div class="subtitle">Produto Sollos ${escapeHtml(params.productId)}${partLabel}</div>
  <section class="type-card">
    <div class="type-head">
      <div class="type-title">${escapeHtml(params.typeLabel)}</div>
      <div class="type-key">${escapeHtml(params.typeKey)}</div>
    </div>
    ${params.content}
  </section>
  <footer class="footer">
    <span>Consultas PRO · relatório de homologação</span>
    <span>${escapeHtml(params.productId)} · ${escapeHtml(params.typeKey)}</span>
  </footer>
</main>`;
}

function buildObjectContent(
  typeKey: string,
  fields: SollosReportField[],
): string {
  const cards = fields
    .map(
      (field) => `{{#if ${typeKey}.${field.key}}}<article class="field">
        <div class="field-label">${escapeHtml(field.label)}</div>
        <div class="field-value">${fieldValueMarkup(field, typeKey)}</div>
      </article>{{/if}}`,
    )
    .join('');
  return `<div class="cards">${cards}</div>`;
}

function buildTableContent(typeKey: string, fields: SollosReportField[]): string {
  const header = fields
    .map((field) => `<th>${escapeHtml(field.label)}</th>`)
    .join('');
  const cells = fields
    .map((field) => `<td>${fieldValueMarkup(field, typeKey, true)}</td>`)
    .join('');
  return `{{#if ${typeKey}}}
  <div class="table-wrap">
    <table>
      <thead><tr>${header}</tr></thead>
      <tbody>{{#each ${typeKey}}}<tr>${cells}</tr>{{/each}}</tbody>
    </table>
  </div>
  {{else}}<div class="empty">Nenhuma ocorrência encontrada nesta seção.</div>{{/if}}`;
}

function buildSummaryPage(input: SollosTemplateBuildInput): string {
  const categories = CATEGORY_ORDER.map((category) => ({
    category,
    count: input.fieldTypes.filter((fieldType) => classifyType(fieldType) === category)
      .length,
  })).filter((item) => item.count > 0);
  const totalFields = input.fieldTypes.reduce(
    (sum, fieldType) => sum + (fieldType.reportFieldConfig?.fields.length ?? 0),
    0,
  );
  const categoryCards = categories
    .map(
      ({ category, count }) => `<article class="topic">
      <strong>${escapeHtml(CATEGORY_LABELS[category])}</strong>
      <span>${count} ${count === 1 ? 'seção' : 'seções'}</span>
    </article>`,
    )
    .join('');

  return `<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin: 0; background: #f8fafc; color: #10201f; font-family: Geist, Inter, Arial, sans-serif; }
  .cover { width: 794px; min-height: 1123px; padding: 52px 50px 42px; background: radial-gradient(circle at 86% 4%,#c9f3ec 0,transparent 27%),#f8fafc; }
  .brand { display: inline-flex; padding: 7px 10px; border-radius: 999px; background: #dff6f2; color: #087a70; font-size: 10px; font-weight: 850; letter-spacing: .11em; text-transform: uppercase; }
  h1 { max-width: 620px; margin: 34px 0 12px; color: #0d2825; font-size: 38px; line-height: 1.08; }
  .product { color: #0f8f83; font-size: 14px; font-weight: 800; }
  .intro { max-width: 610px; margin-top: 16px; color: #526764; font-size: 14px; line-height: 1.55; }
  .identity { display: grid; grid-template-columns: 1.4fr 1fr; gap: 14px; margin-top: 34px; }
  .info { padding: 16px 18px; border: 1px solid #d9e5e3; border-radius: 14px; background: rgba(255,255,255,.82); }
  .info-label { color: #71817f; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: .08em; }
  .info-value { margin-top: 7px; color: #112725; font-size: 14px; font-weight: 750; overflow-wrap: anywhere; }
  .topics { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 12px; margin-top: 34px; }
  .topic { display: flex; min-height: 76px; padding: 14px 16px; flex-direction: column; justify-content: space-between; border: 1px solid #dbe7e5; border-radius: 14px; background: #fff; }
  .topic strong { color: #173d39; font-size: 12px; }
  .topic span { color: #71817f; font-size: 10px; }
  .evidence { margin-top: 30px; padding: 16px 18px; border-left: 4px solid #18a999; border-radius: 0 12px 12px 0; background: #edf9f7; color: #49625f; font-size: 11px; line-height: 1.6; }
  .footer { margin-top: 44px; display: flex; justify-content: space-between; color: #82908f; font-size: 9px; }
</style>
<main class="cover">
  <div class="brand">Consultas PRO · Sollos</div>
  <h1>${escapeHtml(input.productName)}</h1>
  <div class="product">Produto ${escapeHtml(input.productId)} · ${escapeHtml(input.personType)}</div>
  <p class="intro">Relatório organizado para leitura objetiva do cliente final, preservando a rastreabilidade de todos os dados recebidos na homologação.</p>
  <section class="identity">
    <article class="info"><div class="info-label">Consultado</div><div class="info-value">{{safeText cliente.nome}}</div></article>
    <article class="info"><div class="info-label">CPF ou CNPJ</div><div class="info-value">{{formatCpfCnpj cliente.documento}}</div></article>
    <article class="info"><div class="info-label">Protocolo</div><div class="info-value">{{safeText template.protocol}}</div></article>
    <article class="info"><div class="info-label">Data da consulta</div><div class="info-value">{{safeText template.date}}</div></article>
  </section>
  <section class="topics">${categoryCards}</section>
  <div class="evidence">
    <strong>Cobertura homologada:</strong> ${input.samplingEvidence.validSamples}/${input.samplingEvidence.totalSamples} amostras válidas ·
    ${input.samplingEvidence.coveredLeafPathCount}/${input.samplingEvidence.totalLeafPathCount} caminhos cobertos ·
    ${input.fieldTypes.length} tipos e ${totalFields} campos organizados.
  </div>
  <footer class="footer"><span>Uso interno até aprovação manual</span><span>Modelo de revisão · ${escapeHtml(input.productId)}</span></footer>
</main>`;
}

function isCollectionType(
  fieldType: SollosReportFieldType,
  mappedData: Record<string, unknown>,
): boolean {
  if (fieldType.isCollection !== undefined) return fieldType.isCollection;
  const value = mappedData[fieldType.key];
  if (Array.isArray(value)) return true;
  const normalized = normalizeForMatch(`${fieldType.key} ${fieldType.label}`);
  return /(DIVIDA|PENDENCIA|PROTEST|CHEQUE|ACOES|SOCIO|PARTICIPACAO|ENDERECO|TELEFONE|EMAIL|OCORRENCIA)/.test(
    normalized,
  );
}

export function buildSollosReportTemplate(
  input: SollosTemplateBuildInput,
): ReportTemplate {
  const frames: ReportTemplate['frames'] = [];
  const inventory: FieldInventoryItem[] = [];
  let pageIndex = 0;

  const pushFrame = (name: string, customHtml: string) => {
    frames.push({
      id: `sollos-${input.productId}-page-${pageIndex + 1}`,
      name,
      preset: 'a4-p',
      x: pageIndex * (PAGE_WIDTH + PAGE_GAP),
      y: 0,
      width: PAGE_WIDTH,
      height: PAGE_HEIGHT,
      background: '#f8fafc',
      customHtml,
    });
    pageIndex += 1;
  };

  pushFrame('Resumo executivo', buildSummaryPage(input));

  const orderedTypes = [...input.fieldTypes].sort((left, right) => {
    const categoryDelta =
      CATEGORY_ORDER.indexOf(classifyType(left)) -
      CATEGORY_ORDER.indexOf(classifyType(right));
    if (categoryDelta !== 0) return categoryDelta;
    return left.label.localeCompare(right.label, 'pt-BR');
  });

  for (const fieldType of orderedTypes) {
    const category = classifyType(fieldType);
    const fields = [...(fieldType.reportFieldConfig?.fields ?? [])].sort(
      (left, right) => left.sortOrder - right.sortOrder,
    );
    const isCollection = isCollectionType(fieldType, input.mappedData);
    const fieldChunks = isCollection
      ? chunk(fields, MAX_TABLE_COLUMNS)
      : [fields];

    for (const field of fields) {
      inventory.push({
        typeKey: fieldType.key,
        typeLabel: fieldType.label,
        fieldId: field.id,
        fieldKey: field.key,
        fieldLabel: field.label,
        dataType: field.dataType,
        category,
        expression: fieldExpression(field, fieldType.key, isCollection),
      });
    }

    fieldChunks.forEach((fieldsInPage, chunkIndex) => {
      const content = isCollection
        ? buildTableContent(fieldType.key, fieldsInPage)
        : buildObjectContent(fieldType.key, fieldsInPage);
      const suffix =
        fieldChunks.length > 1 ? ` (${chunkIndex + 1}/${fieldChunks.length})` : '';
      pushFrame(
        `${CATEGORY_LABELS[category]} · ${fieldType.label}${suffix}`,
        pageShell({
          productId: input.productId,
          productName: input.productName,
          category,
          typeLabel: fieldType.label,
          typeKey: fieldType.key,
          content,
          part: chunkIndex + 1,
          totalParts: fieldChunks.length,
        }),
      );
    });
  }

  return {
    id: `sollos-template-${input.productId}`,
    name: input.productName,
    version: 1,
    canvas: { background: '#e7efed', grid: 8 },
    frames,
    elements: [],
    metadata: {
      sollosTemplate: {
        generator: 'consultas-pro-sollos-report-builder',
        generatorVersion: 1,
        publicationStatus: 'READY_FOR_MANUAL_REVIEW',
        productId: input.productId,
        productName: input.productName,
        personType: input.personType,
        generatedAt: new Date().toISOString(),
        samplingEvidence: input.samplingEvidence,
        typeInventory: input.fieldTypes.map((fieldType) => ({
          key: fieldType.key,
          label: fieldType.label,
          category: classifyType(fieldType),
          fieldCount: fieldType.reportFieldConfig?.fields.length ?? 0,
          collection: isCollectionType(fieldType, input.mappedData),
        })),
        fieldInventory: inventory,
      },
    },
  };
}

function readSollosMetadata(layout: ReportTemplate): {
  typeInventory?: Array<{ key: string }>;
  fieldInventory?: FieldInventoryItem[];
} {
  const metadata = layout.metadata?.sollosTemplate;
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return {};
  return metadata as {
    typeInventory?: Array<{ key: string }>;
    fieldInventory?: FieldInventoryItem[];
  };
}

export function validateSollosReportTemplate(
  layout: ReportTemplate,
  fieldTypes: SollosReportFieldType[],
): SollosTemplateAudit {
  const errors: string[] = [];
  const warnings: string[] = [];
  const metadata = readSollosMetadata(layout);
  const expectedTypes = new Set(fieldTypes.map((fieldType) => fieldType.key));
  const expectedFields = fieldTypes.flatMap((fieldType) =>
    (fieldType.reportFieldConfig?.fields ?? []).map((field) => ({
      typeKey: fieldType.key,
      field,
    })),
  );
  const actualTypes = new Set((metadata.typeInventory ?? []).map((item) => item.key));
  const actualFields = metadata.fieldInventory ?? [];
  const html = layout.frames.map((frame) => frame.customHtml ?? '').join('\n');

  if (layout.frames.length === 0) errors.push('O relatório não possui páginas.');
  if (layout.elements.length > 0) {
    warnings.push('O gerador Sollos espera páginas HTML sem elementos absolutos.');
  }
  if (new Set(layout.frames.map((frame) => frame.id)).size !== layout.frames.length) {
    errors.push('Há páginas com identificadores duplicados.');
  }

  for (const typeKey of expectedTypes) {
    if (!actualTypes.has(typeKey)) {
      errors.push(`O tipo ${typeKey} não consta no inventário do relatório.`);
    }
  }
  for (const { typeKey, field } of expectedFields) {
    const item = actualFields.find(
      (candidate) =>
        candidate.typeKey === typeKey &&
        candidate.fieldId === field.id &&
        candidate.fieldKey === field.key,
    );
    if (!item) {
      errors.push(`O campo ${typeKey}.${field.key} não consta no inventário.`);
      continue;
    }
    if (!html.includes(`{{${item.expression}}}`)) {
      errors.push(`O campo ${typeKey}.${field.key} não foi ligado a nenhuma página.`);
    }
  }

  const status = (
    layout.metadata?.sollosTemplate as { publicationStatus?: string } | undefined
  )?.publicationStatus;
  if (status !== 'READY_FOR_MANUAL_REVIEW') {
    errors.push('O template não está marcado para revisão manual.');
  }
  if (/data:image\//i.test(JSON.stringify(layout))) {
    errors.push('O template contém imagem embutida em base64.');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    typeCount: actualTypes.size,
    fieldCount: actualFields.length,
    frameCount: layout.frames.length,
  };
}
