import type {
  ReportTemplate,
  TemplateElement,
} from '../../lib/template-engine/template';

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

export type SollosBrandReference = {
  templateId: string;
  layout: ReportTemplate;
};

type SollosTemplateBuildInput = {
  productId: string;
  productName: string;
  personType: 'PF' | 'PJ' | 'PF_PJ';
  fieldTypes: SollosReportFieldType[];
  mappedData: Record<string, unknown>;
  samplingEvidence: SollosSamplingEvidence;
  brandReference: SollosBrandReference;
  /**
   * Prefixo de identidade do provedor nos ids de frame/template.
   * Omitido = 'sollos', preservando byte a byte os 30 templates ja gerados.
   */
  providerSlug?: string;
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
  presentation: 'client' | 'audit';
  bindingKind: 'text' | 'table' | 'audit';
  presentationReason: string;
};

export type SollosTemplateAudit = {
  valid: boolean;
  errors: string[];
  warnings: string[];
  typeCount: number;
  fieldCount: number;
  frameCount: number;
};

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

type BindingScope = 'object' | 'collection-root' | 'collection-item';

type PresentedFieldType = {
  fieldType: SollosReportFieldType;
  category: ReportCategory;
  isCollection: boolean;
  fields: SollosReportField[];
  presentation: 'summary' | 'table' | 'cards' | 'audit';
  presentationReason: string;
};

type ReportSection = {
  category: ReportCategory;
  typeKey: string;
  title: string;
  fields: SollosReportField[];
  isCollection: boolean;
  part: number;
  totalParts: number;
  estimatedHeight: number;
};

type BrandTokens = {
  logoSource: string;
  primaryColor: string;
  title: string;
  titleStyle: TemplateElement['style'];
};

const PAGE_X = 10;
const PAGE_Y = 10;
const PAGE_WIDTH = 794;
const PAGE_HEIGHT = 1123;
const PAGE_GAP = 20;
const DETAIL_TOP = 110;
const DETAIL_BOTTOM = 1045;
const DETAIL_HEIGHT = DETAIL_BOTTOM - DETAIL_TOP;
const MAX_TABLE_COLUMNS = 5;
const CLIENT_FIELD_LIMIT = 8;
const TABLE_SECTION_HEIGHT = 190;

const PRIMARY_SUMMARY_TYPES = new Set(['DADOS_PESSOAIS', 'SCORE_CREDITO']);

const RAW_CLIENT_FEATURE_PATTERN =
  /(ACOES_CIVEIS|RELATORIO_SCR|VEICULOS_POR_DOCUMENTO|QUADRO_SOCIETARIO|PARTICIPACAO_EM_EMPRESAS|HIST_CONSULTAS|EVENTOS_PESSOA_JURIDICA|CREDITO_OBTIDO|COMPROMISSOS|PAGAMENTO_PONTUAL|PAGAMENTO_ATRASADO|COMPROMETIMENTO_FUTURO|PERIODO_RELACIONAMENTO|CONTUMACIA|RECHEQUE|PROTESTOS|CADIN)/;

const TECHNICAL_FIELD_PATTERN =
  /(BASE64|HTML|JSON|RAW|HASH|TOKEN|ENDPOINT|WEBHOOK|PDF|TEMPO_RESPOSTA|REQUISICAO|STATUS_RETORNO|CODIGO_RETORNO|CHAVE_CONSULTA|VERSAO|PROTOCOLO)/;

const FIELD_PRIORITY_PATTERNS = [
  /NOME|RAZAO_SOCIAL/,
  /DOCUMENTO|CPF|CNPJ/,
  /SCORE|RATING|FAIXA_RISCO|PROBABILIDADE/,
  /VALOR|TOTAL|LIMITE|RENDA|FATURAMENTO|CREDITO/,
  /CREDOR|ORIGEM|CARTORIO/,
  /CONTRATO|INSCRICAO|PROCESSO/,
  /DATA|VENCIMENTO|INCLUSAO|ABERTURA/,
  /SITUACAO|STATUS|MOTIVO|TIPO/,
  /ENDERECO|CIDADE|UF/,
  /TELEFONE|EMAIL/,
];

const CATEGORY_COLORS: Record<ReportCategory, string> = {
  cadastral: '#4f46e5',
  score: '#ca8a04',
  restricoes: '#dc2626',
  bacen: '#b45309',
  complementares: '#0f766e',
  tecnico: '#64748b',
};

const CATEGORY_ICONS: Record<ReportCategory, string> = {
  cadastral: 'UserRound',
  score: 'Activity',
  restricoes: 'Database',
  bacen: 'Landmark',
  complementares: 'FileText',
  tecnico: 'Settings',
};

function fieldExpression(
  field: SollosReportField,
  typeKey: string,
  scope: BindingScope,
): string {
  const key =
    scope === 'collection-item'
      ? field.key
      : `$${typeKey}${scope === 'collection-root' ? '[0]' : ''}.${field.key}`;
  const type = field.dataType.toLowerCase();
  if (type === 'currency' || type === 'money') return `toCurrency ${key}`;
  if (type === 'document' || type === 'cpf' || type === 'cnpj') {
    return `formatCpfCnpj ${key}`;
  }
  return `safeText ${key}`;
}

function fieldValueMarkup(
  field: SollosReportField,
  typeKey: string,
  scope: BindingScope,
): string {
  const expression = fieldExpression(field, typeKey, scope);
  return `{{${expression}}}`;
}

function chunk<T>(items: T[], size: number): T[][] {
  if (items.length === 0) return [];
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
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

function hasCanonicalType(keys: Set<string>, pattern: RegExp): boolean {
  return [...keys].some((key) => pattern.test(key));
}

function isClientFacingType(
  fieldType: SollosReportFieldType,
  canonicalKeys: Set<string>,
): { visible: boolean; reason: string } {
  const normalized = normalizeForMatch(fieldType.key);
  if (classifyType(fieldType) === 'tecnico') {
    return { visible: false, reason: 'metadado técnico preservado na auditoria' };
  }
  if (!normalized.startsWith('NOVO_')) {
    return { visible: true, reason: 'tipo canônico do relatório' };
  }
  if (
    /(DADOS_RECEITA_FEDERAL|IDENTIFICACAO_PESSOA|INFORMACOES_DA_EMPRESA)/.test(
      normalized,
    ) &&
    hasCanonicalType(canonicalKeys, /DADOS_PESSOAIS/)
  ) {
    return { visible: false, reason: 'estrutura bruta já consolidada em dados cadastrais' };
  }
  if (
    /(PEND_FINANCEIRAS|PEND_REFIN|PEND_VENCIDAS)/.test(normalized) &&
    hasCanonicalType(canonicalKeys, /DIVIDAS_/)
  ) {
    return { visible: false, reason: 'estrutura bruta já consolidada por base de dívida' };
  }
  if (
    /PROTEST/.test(normalized) &&
    hasCanonicalType(canonicalKeys, /PROTESTO_CARTORIO/)
  ) {
    return { visible: false, reason: 'estrutura bruta já consolidada em protestos' };
  }
  if (/SCORES/.test(normalized) && hasCanonicalType(canonicalKeys, /SCORE_CREDITO/)) {
    return { visible: false, reason: 'estrutura bruta já consolidada no score' };
  }
  if (
    /PASSAGENS_COMERCIAIS/.test(normalized) &&
    hasCanonicalType(canonicalKeys, /PASSAGENS_COMERCIAIS/)
  ) {
    return { visible: false, reason: 'estrutura bruta já consolidada em passagens comerciais' };
  }
  if (RAW_CLIENT_FEATURE_PATTERN.test(normalized)) {
    return { visible: true, reason: 'diferencial de negócio específico do produto' };
  }
  return { visible: false, reason: 'dado complementar mantido na auditoria técnica' };
}

function fieldPriority(field: SollosReportField): number {
  const normalized = normalizeForMatch(
    `${field.key} ${field.label} ${field.dataType}`,
  );
  if (TECHNICAL_FIELD_PATTERN.test(normalized)) return -1000;
  const patternIndex = FIELD_PRIORITY_PATTERNS.findIndex((pattern) =>
    pattern.test(normalized),
  );
  const typeBonus = /(CURRENCY|MONEY|DOCUMENT|CPF|CNPJ)/.test(
    normalizeForMatch(field.dataType),
  )
    ? 50
    : 0;
  return typeBonus + (patternIndex >= 0 ? 100 - patternIndex * 5 : 10);
}

function selectClientFields(
  fieldType: SollosReportFieldType,
  isCollection: boolean,
): SollosReportField[] {
  const fields = [...(fieldType.reportFieldConfig?.fields ?? [])]
    .filter((field) => fieldPriority(field) > -1000)
    .sort((left, right) => {
      const priorityDelta = fieldPriority(right) - fieldPriority(left);
      return priorityDelta || left.sortOrder - right.sortOrder;
    });
  const normalizedType = normalizeForMatch(fieldType.key);
  const limit = normalizedType === 'DADOS_PESSOAIS'
    ? 2
    : isCollection
      ? MAX_TABLE_COLUMNS
      : normalizedType === 'SCORE_CREDITO'
        ? 6
        : CLIENT_FIELD_LIMIT;
  return fields.slice(0, limit).sort((left, right) => left.sortOrder - right.sortOrder);
}

function buildPresentation(
  input: SollosTemplateBuildInput,
): PresentedFieldType[] {
  const canonicalKeys = new Set(
    input.fieldTypes
      .map((fieldType) => normalizeForMatch(fieldType.key))
      .filter((key) => !key.startsWith('NOVO_')),
  );
  const usedRawConcepts = new Set<string>();

  return input.fieldTypes.map((fieldType) => {
    const category = classifyType(fieldType);
    const isCollection = isCollectionType(fieldType, input.mappedData);
    const decision = isClientFacingType(fieldType, canonicalKeys);
    const concept = normalizeForMatch(fieldType.key)
      .replace(/^NOVO_/, '')
      .replace(/^CREDCADASTRAL_/, '')
      .replace(/^VEICULAR_/, '');
    const isRepeatedRawConcept =
      normalizeForMatch(fieldType.key).startsWith('NOVO_') &&
      usedRawConcepts.has(concept);
    if (decision.visible && normalizeForMatch(fieldType.key).startsWith('NOVO_')) {
      usedRawConcepts.add(concept);
    }
    const fields =
      decision.visible && !isRepeatedRawConcept
        ? selectClientFields(fieldType, isCollection)
        : [];
    const presentation = fields.length === 0
      ? 'audit'
      : PRIMARY_SUMMARY_TYPES.has(normalizeForMatch(fieldType.key))
        ? 'summary'
        : isCollection
          ? 'table'
          : 'cards';
    return {
      fieldType,
      category,
      isCollection,
      fields,
      presentation,
      presentationReason: isRepeatedRawConcept
        ? 'estrutura equivalente já apresentada em outra seção'
        : decision.reason,
    };
  });
}

function extractBrandTokens(reference: SollosBrandReference): BrandTokens {
  const logo = reference.layout.elements.find(
    (element) =>
      element.type === 'image' &&
      typeof element.data?.src === 'string' &&
      element.data.src.startsWith('data:image/'),
  );
  if (!logo || typeof logo.data?.src !== 'string') {
    throw new Error('O template 1079 não possui a logo oficial incorporada.');
  }
  const title = reference.layout.elements.find(
    (element) =>
      element.type === 'text' &&
      typeof element.data?.text === 'string' &&
      normalizeForMatch(element.data.text).includes('RELATORIO ANALITICO DE CREDITO'),
  );
  const divider = reference.layout.elements.find(
    (element) =>
      element.type === 'divider' &&
      typeof element.style.background === 'string' &&
      normalizeForMatch(element.style.background) !== '#E2E8F0',
  );
  return {
    logoSource: logo.data.src,
    primaryColor:
      typeof divider?.style.background === 'string'
        ? divider.style.background
        : '#6366f1',
    title:
      typeof title?.data?.text === 'string'
        ? title.data.text
        : 'Relatório Analítico de Crédito',
    titleStyle: title?.style ?? {
      color: '#4f46e5',
      fontSize: 16,
      textAlign: 'right',
      fontWeight: 700,
    },
  };
}

function createFrame(
  index: number,
  name: string,
  slug = 'sollos',
): ReportTemplate['frames'][number] {
  return {
    id: `${slug}-page-${index + 1}`,
    name,
    preset: 'a4-p',
    x: PAGE_X,
    y: PAGE_Y + index * (PAGE_HEIGHT + PAGE_GAP),
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    background: '#ffffff',
  };
}

function pushElement(
  elements: TemplateElement[],
  frame: ReportTemplate['frames'][number],
  input: Omit<TemplateElement, 'id' | 'frameId' | 'zIndex' | 'x' | 'y'> & {
    id: string;
    x: number;
    y: number;
  },
): void {
  elements.push({
    ...input,
    id: `${frame.id}-${input.id}`,
    frameId: frame.id,
    x: frame.x + input.x,
    y: frame.y + input.y,
    zIndex: elements.length + 1,
  });
}

function addHeader(
  elements: TemplateElement[],
  frame: ReportTemplate['frames'][number],
  brand: BrandTokens,
  pageNumber: number,
): void {
  pushElement(elements, frame, {
    id: 'logo',
    type: 'image',
    x: 20,
    y: 20,
    width: 150,
    height: 50,
    style: {},
    data: { src: brand.logoSource, fit: 'contain' },
  });
  pushElement(elements, frame, {
    id: 'title',
    type: 'text',
    x: 450,
    y: 20,
    width: 310,
    height: 25,
    style: { ...brand.titleStyle },
    data: { text: brand.title },
  });
  pushElement(elements, frame, {
    id: 'meta',
    type: 'text',
    x: 450,
    y: 45,
    width: 310,
    height: 35,
    style: { color: '#64748b', fontSize: 10, textAlign: 'right' },
    data: { text: '{{safeText template.date}}\nPROT: {{safeText template.protocol}}' },
  });
  pushElement(elements, frame, {
    id: 'brand-divider',
    type: 'divider',
    x: 30,
    y: 85,
    width: 734,
    height: 3,
    style: { background: brand.primaryColor },
    data: {},
  });
  pushElement(elements, frame, {
    id: 'footer',
    type: 'text',
    x: 30,
    y: 1060,
    width: 734,
    height: 30,
    style: { color: '#94a3b8', fontSize: 8, textAlign: 'center' },
    data: { text: `Consultas PRO — Relatório de Crédito • Página ${pageNumber}` },
  });
}

function addSectionHeader(
  elements: TemplateElement[],
  frame: ReportTemplate['frames'][number],
  localY: number,
  title: string,
  category: ReportCategory,
  badge?: string,
): void {
  pushElement(elements, frame, {
    id: `section-icon-${localY}`,
    type: 'icon',
    x: 30,
    y: localY,
    width: 24,
    height: 24,
    style: {
      color: '#334155',
      background: '#f8fafc',
      borderColor: '#e2e8f0',
      borderWidth: 1,
      borderRadius: 6,
    },
    data: { name: CATEGORY_ICONS[category], strokeWidth: 1.5 },
  });
  pushElement(elements, frame, {
    id: `section-title-${localY}`,
    type: 'text',
    x: 60,
    y: localY,
    width: badge ? 470 : 650,
    height: 22,
    style: { color: '#334155', fontSize: 13, fontWeight: 700 },
    data: { text: title },
  });
  pushElement(elements, frame, {
    id: `section-divider-${localY}`,
    type: 'divider',
    x: badge ? 540 : 250,
    y: localY + 10,
    width: badge ? 120 : 514,
    height: 2,
    style: { background: '#e2e8f0' },
    data: {},
  });
  if (badge) {
    pushElement(elements, frame, {
      id: `section-badge-${localY}`,
      type: 'text',
      x: 670,
      y: localY,
      width: 92,
      height: 22,
      style: {
        color: '#64748b',
        padding: 4,
        fontSize: 9,
        textAlign: 'center',
        background: '#f8fafc',
        fontWeight: 600,
        borderColor: '#e2e8f0',
        borderWidth: 1,
        borderRadius: 999,
      },
      data: { text: badge },
    });
  }
}

function fieldFormat(field: SollosReportField): string | undefined {
  const type = normalizeForMatch(field.dataType);
  if (/(CURRENCY|MONEY)/.test(type)) return 'currency';
  if (/CPF/.test(type)) return 'cpf';
  if (/CNPJ/.test(type)) return 'cnpj';
  if (/DATE/.test(type)) return 'date';
  return undefined;
}

function addFieldCards(
  elements: TemplateElement[],
  frame: ReportTemplate['frames'][number],
  localY: number,
  fields: Array<{ label: string; value: string }>,
): number {
  fields.forEach((field, index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const x = 30 + column * 367;
    const y = localY + row * 58;
    pushElement(elements, frame, {
      id: `field-bg-${localY}-${index}`,
      type: 'container',
      x,
      y,
      width: 355,
      height: 50,
      style: {
        background: '#ffffff',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        borderRadius: 8,
      },
      data: {},
    });
    pushElement(elements, frame, {
      id: `field-label-${localY}-${index}`,
      type: 'text',
      x: x + 12,
      y: y + 7,
      width: 331,
      height: 13,
      style: { color: '#64748b', fontSize: 8, fontWeight: 600 },
      data: { text: field.label.toUpperCase() },
    });
    pushElement(elements, frame, {
      id: `field-value-${localY}-${index}`,
      type: 'text',
      x: x + 12,
      y: y + 22,
      width: 331,
      height: 22,
      style: { color: '#0f172a', fontSize: 11, fontWeight: 700 },
      binding: { mode: 'expression', fallback: '-' },
      data: { text: field.value },
    });
  });
  return Math.ceil(fields.length / 2) * 58;
}

function addIdentity(
  elements: TemplateElement[],
  frame: ReportTemplate['frames'][number],
  input: SollosTemplateBuildInput,
  presentation: PresentedFieldType[],
): void {
  const NAME_PATTERN = /NOME|RAZAO_SOCIAL/;
  const DOCUMENT_PATTERN = /DOCUMENTO|CPF|CNPJ/;

  /**
   * Localiza nome e documento para o cabecalho. `DADOS_PESSOAIS` tem
   * prioridade — e o tipo canonico da Sollos, e mantem os 30 relatorios
   * existentes byte a byte. Sem ele, varre os demais tipos de identificacao,
   * o que permite a produtos PJ de outros provedores preencher o cabecalho.
   */
  function locate(pattern: RegExp) {
    const preferred = presentation.find(
      (item) => normalizeForMatch(item.fieldType.key) === 'DADOS_PESSOAIS',
    );
    const preferredField = preferred?.fields.find((field) =>
      pattern.test(normalizeForMatch(`${field.key} ${field.label}`)),
    );
    if (preferred && preferredField) {
      return { owner: preferred, field: preferredField };
    }
    for (const item of presentation) {
      if (!/IDENTIFICA|CADASTR|EMPRESA/.test(normalizeForMatch(item.fieldType.key))) {
        continue;
      }
      const field = item.fields.find((candidate) =>
        pattern.test(normalizeForMatch(`${candidate.key} ${candidate.label}`)),
      );
      if (field) return { owner: item, field };
    }
    return null;
  }

  const nameHit = locate(NAME_PATTERN);
  const documentHit = locate(DOCUMENT_PATTERN);
  const scopeOf = (owner: PresentedFieldType): BindingScope =>
    owner.isCollection ? 'collection-root' : 'object';

  const nameValue = nameHit
    ? fieldValueMarkup(nameHit.field, nameHit.owner.fieldType.key, scopeOf(nameHit.owner))
    : '{{safeText cliente.nome}}';
  const documentValue = documentHit
    ? fieldValueMarkup(
        documentHit.field,
        documentHit.owner.fieldType.key,
        scopeOf(documentHit.owner),
      )
    : '{{formatCpfCnpj cliente.documento}}';

  pushElement(elements, frame, {
    id: 'identity-bg',
    type: 'container',
    x: 30,
    y: 100,
    width: 734,
    height: 70,
    style: {
      background: '#ffffff',
      borderColor: '#e2e8f0',
      borderWidth: 1,
      borderRadius: 12,
    },
    data: {},
  });
  const identityItems = [
    { icon: 'User', label: 'CLIENTE ANALISADO', value: nameValue },
    { icon: 'CreditCard', label: 'DOCUMENTO', value: documentValue },
    { icon: 'FileText', label: 'TIPO DE RELATÓRIO', value: input.productName },
  ];
  identityItems.forEach((item, index) => {
    const x = 45 + index * 245;
    pushElement(elements, frame, {
      id: `identity-icon-${index}`,
      type: 'icon',
      x,
      y: 117,
      width: 36,
      height: 36,
      style: {
        color: '#64748b',
        background: '#f8fafc',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        borderRadius: 8,
      },
      data: { name: item.icon, strokeWidth: 1.5 },
    });
    pushElement(elements, frame, {
      id: `identity-label-${index}`,
      type: 'text',
      x: x + 47,
      y: 114,
      width: 180,
      height: 15,
      style: { color: '#64748b', fontSize: 9, fontWeight: 600 },
      data: { text: item.label },
    });
    pushElement(elements, frame, {
      id: `identity-value-${index}`,
      type: 'text',
      x: x + 47,
      y: 130,
      width: 180,
      height: 28,
      style: {
        color: '#0f172a',
        fontSize: index === 2 ? 10 : 13,
        fontWeight: 700,
      },
      binding: { mode: 'expression', fallback: '-' },
      data: { text: item.value },
    });
  });
}

function summaryCandidates(
  presentation: PresentedFieldType[],
): Array<{ label: string; value: string; category: ReportCategory }> {
  return presentation
    .filter((item) => item.presentation !== 'audit')
    .filter((item) => normalizeForMatch(item.fieldType.key) !== 'DADOS_PESSOAIS')
    .flatMap((item) => {
      const field = item.fields[0];
      if (!field) return [];
      const scope: BindingScope = item.isCollection
        ? 'collection-root'
        : 'object';
      const value = item.isCollection
        ? `{{count($${item.fieldType.key}.${field.key})}}`
        : fieldValueMarkup(field, item.fieldType.key, scope);
      return [{
        label: item.fieldType.label,
        value,
        category: item.category,
      }];
    });
}

function addSummary(
  elements: TemplateElement[],
  frame: ReportTemplate['frames'][number],
  presentation: PresentedFieldType[],
): void {
  addSectionHeader(elements, frame, 185, 'RESUMO DO RELATÓRIO', 'score');
  const candidates = summaryCandidates(presentation).slice(0, 3);
  while (candidates.length < 3) {
    candidates.push({
      label: 'Cobertura do produto',
      value: `${presentation.filter((item) => item.presentation !== 'audit').length} seções`,
      category: 'complementares',
    });
  }
  candidates.forEach((candidate, index) => {
    const x = 30 + index * 252;
    const color = CATEGORY_COLORS[candidate.category];
    pushElement(elements, frame, {
      id: `kpi-bg-${index}`,
      type: 'container',
      x,
      y: 225,
      width: 230,
      height: 75,
      style: {
        background: '#ffffff',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        borderRadius: 12,
      },
      data: {},
    });
    pushElement(elements, frame, {
      id: `kpi-strip-${index}`,
      type: 'divider',
      x,
      y: 225,
      width: 4,
      height: 75,
      style: { background: color },
      data: {},
    });
    pushElement(elements, frame, {
      id: `kpi-label-${index}`,
      type: 'text',
      x: x + 14,
      y: 232,
      width: 205,
      height: 15,
      style: { color: '#64748b', fontSize: 9, fontWeight: 600 },
      data: { text: candidate.label.toUpperCase() },
    });
    pushElement(elements, frame, {
      id: `kpi-value-${index}`,
      type: 'text',
      x: x + 14,
      y: 250,
      width: 205,
      height: 24,
      style: { color, fontSize: 15, fontWeight: 700 },
      binding: { mode: 'expression', fallback: '-' },
      data: { text: candidate.value },
    });
    pushElement(elements, frame, {
      id: `kpi-subtitle-${index}`,
      type: 'text',
      x: x + 14,
      y: 278,
      width: 205,
      height: 14,
      style: { color: '#94a3b8', fontSize: 8 },
      data: { text: 'Dado atualizado na consulta' },
    });
  });
}

function addExecutivePanel(
  elements: TemplateElement[],
  frame: ReportTemplate['frames'][number],
  input: SollosTemplateBuildInput,
  presentation: PresentedFieldType[],
): void {
  const score = presentation.find(
    (item) => normalizeForMatch(item.fieldType.key) === 'SCORE_CREDITO',
  );
  addSectionHeader(
    elements,
    frame,
    320,
    score ? 'SCORE DE CRÉDITO' : 'VISÃO EXECUTIVA',
    score ? 'score' : 'complementares',
  );
  pushElement(elements, frame, {
    id: 'executive-bg',
    type: 'container',
    x: 30,
    y: 360,
    width: 734,
    height: 680,
    style: {
      background: '#ffffff',
      borderColor: '#e2e8f0',
      borderWidth: 1,
      borderRadius: 12,
    },
    data: {},
  });
  pushElement(elements, frame, {
    id: 'executive-title',
    type: 'text',
    x: 50,
    y: 380,
    width: 694,
    height: 24,
    style: { color: '#0f172a', fontSize: 15, fontWeight: 700 },
    data: {
      text: score
        ? 'Como o mercado enxerga este documento hoje'
        : input.productName,
    },
  });
  pushElement(elements, frame, {
    id: 'executive-subtitle',
    type: 'text',
    x: 50,
    y: 408,
    width: 694,
    height: 38,
    style: { color: '#64748b', fontSize: 10, lineHeight: 1.4 },
    data: {
      text: score
        ? 'A pontuação apoia a análise de risco e deve ser interpretada em conjunto com as demais informações do relatório.'
        : 'As informações abaixo destacam os principais pontos deste produto, organizados no padrão Consultas PRO.',
    },
  });

  const panelFields = score
    ? score.fields.map((field) => ({
        label: field.label,
        value: fieldValueMarkup(
          field,
          score.fieldType.key,
          score.isCollection ? 'collection-root' : 'object',
        ),
      }))
    : summaryCandidates(presentation)
        .slice(0, 8)
        .map((item) => ({ label: item.label, value: item.value }));
  addFieldCards(elements, frame, 465, panelFields);
  pushElement(elements, frame, {
    id: 'executive-note-bg',
    type: 'container',
    x: 50,
    y: 935,
    width: 694,
    height: 62,
    style: {
      background: '#fdfded',
      borderColor: '#eab3087a',
      borderWidth: 1,
      borderRadius: 8,
    },
    data: {},
  });
  pushElement(elements, frame, {
    id: 'executive-note-icon',
    type: 'icon',
    x: 68,
    y: 954,
    width: 22,
    height: 22,
    style: { color: '#c27d05' },
    data: { name: 'CircleAlert', strokeWidth: 1.5 },
  });
  pushElement(elements, frame, {
    id: 'executive-note-text',
    type: 'text',
    x: 98,
    y: 946,
    width: 630,
    height: 44,
    style: { color: '#a16207', fontSize: 10, lineHeight: 1.4 },
    data: {
      text:
        'Indicadores e faixas apoiam a decisão, mas não garantem aprovação. Analise o conjunto de informações e a política de crédito aplicável.',
    },
  });
}

function sectionTitle(
  fieldType: SollosReportFieldType,
  part: number,
  totalParts: number,
): string {
  const known: Record<string, string> = {
    DIVIDAS_SERASA: 'Serasa — Base I',
    DIVIDAS_SPC: 'SPC Brasil — Base II',
    DIVIDAS_BOA_VISTA: 'Boa Vista / SCPC — Base III',
    DIVIDAS_QUOD: 'Quod — Base IV',
    PROTESTO_CARTORIO: 'Protestos em Cartório',
  };
  const base = known[fieldType.key] ?? fieldType.label.replace(/^Novo\s*[·-]\s*/i, '');
  return totalParts > 1 ? `${base} (${part}/${totalParts})` : base;
}

function buildSections(presentation: PresentedFieldType[]): ReportSection[] {
  const sections: ReportSection[] = [];
  for (const item of presentation) {
    if (item.presentation === 'audit' || item.presentation === 'summary') continue;
    const fieldChunks = item.presentation === 'table'
      ? chunk(item.fields, MAX_TABLE_COLUMNS)
      : [item.fields];
    fieldChunks.forEach((fields, index) => {
      sections.push({
        category: item.category,
        typeKey: item.fieldType.key,
        title: sectionTitle(item.fieldType, index + 1, fieldChunks.length),
        fields,
        isCollection: item.isCollection,
        part: index + 1,
        totalParts: fieldChunks.length,
        estimatedHeight: item.presentation === 'table'
          ? TABLE_SECTION_HEIGHT
          : 42 + Math.ceil(fields.length / 2) * 58,
      });
    });
  }
  return sections.sort((left, right) => {
    const categoryDelta =
      CATEGORY_ORDER.indexOf(left.category) - CATEGORY_ORDER.indexOf(right.category);
    return categoryDelta || left.title.localeCompare(right.title, 'pt-BR');
  });
}

function packSections(sections: ReportSection[]): ReportSection[][] {
  const pages: ReportSection[][] = [];
  let current: ReportSection[] = [];
  let usedHeight = 0;
  let currentCategory: ReportCategory | undefined;

  const flush = () => {
    if (current.length === 0) return;
    pages.push(current);
    current = [];
    usedHeight = 0;
    currentCategory = undefined;
  };

  for (const section of sections) {
    const categoryChanged = currentCategory && currentCategory !== section.category;
    const shouldBreakForCategory = categoryChanged && usedHeight > DETAIL_HEIGHT * 0.55;
    const shouldBreakForHeight =
      current.length > 0 && usedHeight + section.estimatedHeight > DETAIL_HEIGHT;
    if (shouldBreakForCategory || shouldBreakForHeight) flush();
    current.push(section);
    usedHeight += section.estimatedHeight;
    currentCategory = section.category;
  }
  flush();
  return pages;
}

function addDetailSection(
  elements: TemplateElement[],
  frame: ReportTemplate['frames'][number],
  section: ReportSection,
  localY: number,
): void {
  const badge = section.isCollection
    ? `{{count($${section.typeKey}.${section.fields[0]?.key ?? ''})}} registros`
    : undefined;
  addSectionHeader(
    elements,
    frame,
    localY,
    section.title,
    section.category,
    badge,
  );
  if (section.isCollection) {
    pushElement(elements, frame, {
      id: `table-${localY}-${section.part}`,
      type: 'table',
      x: 30,
      y: localY + 36,
      width: 734,
      height: 125,
      style: {
        background: '#ffffff',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        borderRadius: 12,
      },
      data: {
        arrayPath: `$${section.typeKey}`,
        autoHeight: true,
        headerBg: '#f8fafc',
        headerColor: '#475569',
        headerSize: 9,
        rowSize: 9,
        columns: section.fields.map((field) => ({
          path: field.key,
          label: field.label,
          format: fieldFormat(field),
        })),
      },
    });
    return;
  }
  addFieldCards(
    elements,
    frame,
    localY + 36,
    section.fields.map((field) => ({
      label: field.label,
      value: fieldValueMarkup(field, section.typeKey, 'object'),
    })),
  );
}

function buildInventory(
  presentation: PresentedFieldType[],
): FieldInventoryItem[] {
  return presentation.flatMap((item) => {
    const visibleFieldIds = new Set(item.fields.map((field) => field.id));
    return (item.fieldType.reportFieldConfig?.fields ?? []).map((field) => {
      const isVisible = visibleFieldIds.has(field.id);
      const bindingKind = !isVisible
        ? 'audit'
        : item.presentation === 'table'
          ? 'table'
          : 'text';
      const scope: BindingScope =
        item.presentation === 'table'
          ? 'collection-item'
          : item.isCollection
            ? 'collection-root'
            : 'object';
      return {
        typeKey: item.fieldType.key,
        typeLabel: item.fieldType.label,
        fieldId: field.id,
        fieldKey: field.key,
        fieldLabel: field.label,
        dataType: field.dataType,
        category: item.category,
        expression: fieldExpression(field, item.fieldType.key, scope),
        presentation: isVisible ? 'client' : 'audit',
        bindingKind,
        presentationReason: isVisible
          ? item.presentationReason
          : 'campo preservado no inventário técnico e fora do PDF do cliente',
      } satisfies FieldInventoryItem;
    });
  });
}

export function buildSollosReportTemplate(
  input: SollosTemplateBuildInput,
): ReportTemplate {
  const brand = extractBrandTokens(input.brandReference);
  const slug = input.providerSlug ?? 'sollos';
  const presentation = buildPresentation(input);
  const inventory = buildInventory(presentation);
  const frames: ReportTemplate['frames'] = [];
  const elements: TemplateElement[] = [];

  const summaryFrame = createFrame(
    0,
    presentation.some(
      (item) => normalizeForMatch(item.fieldType.key) === 'SCORE_CREDITO',
    )
      ? 'Página 1 (Resumo & Score)'
      : 'Página 1 (Resumo Executivo)',
    slug,
  );
  frames.push(summaryFrame);
  addHeader(elements, summaryFrame, brand, 1);
  addIdentity(elements, summaryFrame, input, presentation);
  addSummary(elements, summaryFrame, presentation);
  addExecutivePanel(elements, summaryFrame, input, presentation);

  const sectionPages = packSections(buildSections(presentation));
  sectionPages.forEach((sections, pageIndex) => {
    const categories = [...new Set(sections.map((section) => section.category))];
    const categoryName = categories
      .map((category) => CATEGORY_LABELS[category])
      .join(' + ');
    const frame = createFrame(
      pageIndex + 1,
      `Página ${pageIndex + 2} (${categoryName})`,
      slug,
    );
    frames.push(frame);
    addHeader(elements, frame, brand, pageIndex + 2);
    let localY = DETAIL_TOP;
    sections.forEach((section) => {
      addDetailSection(elements, frame, section, localY);
      localY += section.estimatedHeight;
    });
  });

  return {
    id: `${slug}-template-${input.productId}`,
    name: input.productName,
    version: 2,
    canvas: { background: '#f1f5f9', grid: 10 },
    frames,
    elements,
    metadata: {
      sollosTemplate: {
        generator: 'consultas-pro-sollos-report-builder',
        generatorVersion: 2,
        visualStandard: 'CONSULTAS_PRO_1079',
        brandReferenceTemplateId: input.brandReference.templateId,
        pageStrategy: 'business-grouped',
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
          presentation:
            presentation.find((item) => item.fieldType.key === fieldType.key)
              ?.presentation ?? 'audit',
        })),
        fieldInventory: inventory,
        clientFieldCount: inventory.filter((item) => item.presentation === 'client')
          .length,
        auditOnlyFieldCount: inventory.filter((item) => item.presentation === 'audit')
          .length,
        pageCount: frames.length,
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
  brandReference: SollosBrandReference,
): SollosTemplateAudit {
  const errors: string[] = [];
  const warnings: string[] = [];
  const brand = extractBrandTokens(brandReference);
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

  if (layout.frames.length === 0) errors.push('O relatório não possui páginas.');
  if (layout.elements.length === 0) {
    errors.push('O relatório não possui os componentes visuais do padrão 1079.');
  }
  if (layout.frames.some((frame) => Boolean(frame.customHtml?.trim()))) {
    errors.push('Há páginas HTML fora da matriz visual do produto 1079.');
  }
  if (layout.frames.length > 8) {
    warnings.push(
      `O relatório possui ${layout.frames.length} páginas; revise a experiência antes da aprovação.`,
    );
  }
  if (layout.frames.length > 12) {
    errors.push('O relatório excede o limite seguro de 12 páginas consolidadas.');
  }
  if (new Set(layout.frames.map((frame) => frame.id)).size !== layout.frames.length) {
    errors.push('Há páginas com identificadores duplicados.');
  }
  for (const frame of layout.frames) {
    const frameElements = layout.elements.filter(
      (element) => element.frameId === frame.id,
    );
    const hasOfficialLogo = frameElements.some(
      (element) =>
        element.type === 'image' && element.data?.src === brand.logoSource,
    );
    const hasOfficialTitle = frameElements.some(
      (element) =>
        element.type === 'text' &&
        element.data?.text === brand.title &&
        element.style.color === brand.titleStyle.color,
    );
    const hasBrandDivider = frameElements.some(
      (element) =>
        element.type === 'divider' &&
        element.style.background === brand.primaryColor,
    );
    if (!hasOfficialLogo) {
      errors.push(`A página ${frame.name} não possui a logo oficial do 1079.`);
    }
    if (!hasOfficialTitle || !hasBrandDivider) {
      errors.push(`A página ${frame.name} diverge do cabeçalho padrão do 1079.`);
    }
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
    if (item.presentation === 'audit') continue;
    const hasTextBinding = layout.elements.some(
      (element) =>
        element.type === 'text' &&
        typeof element.data?.text === 'string' &&
        element.data.text.includes(`{{${item.expression}}}`),
    );
    const hasTableBinding = layout.elements.some((element) => {
      if (element.type !== 'table') return false;
      const arrayPath = String(element.data?.arrayPath ?? '').replace(/^\$/, '');
      const columns = Array.isArray(element.data?.columns)
        ? (element.data.columns as Array<{ path?: string }>)
        : [];
      return (
        arrayPath === typeKey &&
        columns.some((column) => column.path === field.key)
      );
    });
    if (!hasTextBinding && !hasTableBinding) {
      errors.push(
        `O campo de cliente ${typeKey}.${field.key} não foi ligado a nenhuma página.`,
      );
    }
  }

  const sollosMetadata = layout.metadata?.sollosTemplate as
    | {
        publicationStatus?: string;
        visualStandard?: string;
        brandReferenceTemplateId?: string;
      }
    | undefined;
  const status = sollosMetadata?.publicationStatus;
  if (status !== 'READY_FOR_MANUAL_REVIEW') {
    errors.push('O template não está marcado para revisão manual.');
  }
  if (
    sollosMetadata?.visualStandard !== 'CONSULTAS_PRO_1079' ||
    sollosMetadata.brandReferenceTemplateId !== brandReference.templateId
  ) {
    errors.push('O template não registra o 1079 como sua matriz visual.');
  }
  const foreignEmbeddedImage = layout.elements.some(
    (element) =>
      element.type === 'image' &&
      typeof element.data?.src === 'string' &&
      element.data.src.startsWith('data:image/') &&
      element.data.src !== brand.logoSource,
  );
  if (foreignEmbeddedImage) {
    errors.push('O template contém imagem incorporada fora da identidade oficial.');
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
