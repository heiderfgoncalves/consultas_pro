import type {
  ReportTemplate,
  TemplateElement,
} from '../../lib/template-engine/template';
import type { ConsultasProBrandReference } from './consultas-pro-report-builder.service';

/**
 * Compositor do padrao 1079.
 *
 * O produto 1079 e a matriz visual da casa. Este modulo extrai dele a
 * biblioteca de componentes — cartao, cabecalho de secao, bloco de identidade,
 * indicador com barra lateral, tabela — e recompoe as paginas conforme o que
 * cada produto tem a mostrar.
 *
 * A diferenca em relacao a clonar o 1079: nao produz trinta copias do mesmo
 * relatorio. O acabamento e identico; as secoes variam com o contrato de dados
 * do produto. Um produto sem score nao ganha um cartao de score vazio; um com
 * quatro bases de divida ganha quatro tabelas, todas com o mesmo desenho.
 *
 * Nada aqui inventa estilo: cada medida e cor foi lida do 1079.
 */

// ── Medidas da matriz ────────────────────────────────────────────────────────
const PAGE_W = 794;
const PAGE_H = 1123;
const PAGE_GAP = 20;
const MARGIN = 30;
const CONTENT_W = 734;

const HEADER_LOGO = { x: 20, y: 20, w: 150, h: 50 };
const HEADER_TITLE = { x: 450, y: 20, w: 310, h: 25 };
const HEADER_META = { x: 450, y: 45, w: 310, h: 35 };
const HEADER_RULE_Y = 85;
const IDENTITY_Y = 100;
const IDENTITY_H = 70;
const BODY_TOP = 185;
const BODY_BOTTOM = 1060;

// ── Tokens da matriz ─────────────────────────────────────────────────────────
const C = {
  ink: '#0f172a',
  strong: '#334155',
  muted: '#64748b',
  faint: '#94a3b8',
  line: '#e2e8f0',
  subtle: '#f8fafc',
  white: '#ffffff',
  danger: '#dc2626',
  success: '#16a34a',
  amber: '#ca8a04',
} as const;

const CARD_STYLE: TemplateElement['style'] = {
  background: C.white,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: C.line,
};
const SECTION_ICON_STYLE: TemplateElement['style'] = {
  background: 'transparent',
  color: C.strong,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: C.line,
};
const IDENTITY_ICON_STYLE: TemplateElement['style'] = {
  background: C.subtle,
  color: C.muted,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: C.line,
};
const LABEL_STYLE: TemplateElement['style'] = {
  color: C.muted,
  fontSize: 9,
  fontWeight: 600,
};
const VALUE_STYLE: TemplateElement['style'] = {
  color: C.ink,
  fontSize: 13,
  fontWeight: 700,
};
const HINT_STYLE: TemplateElement['style'] = {
  color: C.faint,
  fontSize: 9,
};
const SECTION_TITLE_STYLE: TemplateElement['style'] = {
  color: C.strong,
  fontSize: 13,
  fontWeight: 700,
};

/** Acentos dos indicadores, na ordem em que o 1079 os usa. */
const KPI_ACCENTS = [C.danger, C.success, C.amber] as const;

export type ComposerField = {
  label: string;
  /** Expressao ja pronta, com `{{ }}`. */
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
  /**
   * Clona a secao de score da matriz — medidor em arco, pontuacao colorida,
   * legenda de faixas e textos de apoio — trocando apenas a expressao que
   * alimenta o score. Nenhum estilo e reescrito.
   */
  | {
      kind: 'score-block';
      /** Expressao do score no produto, ex.: `$PRONAMPE_SCORE_CREDITO.pontuacao`. */
      scoreExpression: string;
      /** Exibe a secao em estado vazio quando o produto nao apura score. */
      emptyState?: boolean;
    };

/** Expressao de score usada pela matriz 1079 em todos os seus blocos. */
const MATRIX_SCORE_EXPRESSION = '$SCORE_CREDITO[0].score';

/**
 * Faixa vertical da pagina 1 da matriz ocupada pela secao de score.
 * Vai do cabecalho "SCORE DE CRÉDITO" ao fim do aviso legal.
 */
const MATRIX_SCORE_BAND = { from: 320, to: 1000 };

export type ComposerInput = {
  templateId: string;
  productName: string;
  /** Rotulo do terceiro campo do bloco de identidade. */
  reportKind: string;
  identity: { nameExpression: string; documentExpression: string };
  sections: ComposerSection[];
  brandReference: ConsultasProBrandReference;
  metadata?: Record<string, unknown>;
};

type Brand = { logo: string; accent: string; title: string; titleStyle: TemplateElement['style'] };

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
    titleStyle: title?.style ?? {
      color: '#4f46e5',
      fontSize: 16,
      fontWeight: 700,
      textAlign: 'right',
    },
  };
}

/** Altura que a secao ocupa, para o empacotador decidir a quebra de pagina. */
function sectionHeight(section: ComposerSection): number {
  if (section.kind === 'table') return 60 + 34 + 26 * 6;
  if (section.kind === 'kpis') return 40 + 75 + 20;
  if (section.kind === 'score-block') {
    return MATRIX_SCORE_BAND.to - MATRIX_SCORE_BAND.from + 20;
  }
  const rows = Math.ceil(section.items.length / 3);
  return 40 + rows * 62 + 12;
}

/**
 * Recorta da matriz os elementos da secao de score, preservando estilo,
 * dimensao e posicao relativa. Retorna coordenadas relativas ao topo da faixa.
 */
function cutScoreBand(
  reference: ConsultasProBrandReference,
): Array<TemplateElement & { relX: number; relY: number }> {
  const page = reference.layout.frames[0];
  if (!page) return [];
  return reference.layout.elements
    .filter((element) => {
      if (element.frameId && element.frameId !== page.id) return false;
      const relY = element.y - page.y;
      return relY >= MATRIX_SCORE_BAND.from && relY < MATRIX_SCORE_BAND.to;
    })
    .map((element) => ({
      ...element,
      relX: element.x - page.x,
      relY: element.y - page.y - MATRIX_SCORE_BAND.from,
    }))
    .sort((a, b) => a.zIndex - b.zIndex);
}

/**
 * Ajustes minimos de texto no bloco clonado.
 *
 * A matriz 1079 e um produto PF de um bureau especifico, e o texto cita "Serasa
 * Score" e "seu CPF". Copiado sem ajuste para um produto PJ ou de outro bureau,
 * o relatorio afirma algo falso. Trocamos apenas essas frases — estilo,
 * estrutura e formulas permanecem intactos.
 */
const TEXT_ADJUSTMENTS: ReadonlyArray<readonly [string, string]> = [
  ['O Serasa Score é calculado', 'O Score de crédito é calculado'],
  ['Serasa Score', 'Score de crédito'],
  ['seu CPF hoje', 'este documento hoje'],
  ['do seu CPF', 'do documento consultado'],
  ['seu CPF', 'o documento consultado'],
  ['analisar os motivos de negativa e identificar o que está impactando no seu crédito',
   'analisar os fatores que impactam a avaliação de crédito'],
];

function adjustText(value: string): string {
  let output = value;
  for (const [from, to] of TEXT_ADJUSTMENTS) {
    if (output.includes(from)) output = output.split(from).join(to);
  }
  return output;
}

/**
 * Reaponta a fonte do score sem tocar em mais nada do bloco.
 * Cobre `$SCORE_CREDITO[0].score` e a forma sem indice.
 */
function retargetScore(value: string, scoreExpression: string): string {
  // Sem score, a interpolacao inteira sai: `{{$SCORE...}}` vira travessao, em
  // vez de deixar chaves visiveis no relatorio.
  if (scoreExpression === '—') {
    return adjustText(
      value.replace(/\{\{\s*\$SCORE_CREDITO(?:\[0\])?\.score\s*\}\}/g, '—'),
    );
  }
  const swapped = value
    .split(MATRIX_SCORE_EXPRESSION)
    .join(scoreExpression)
    .split('$SCORE_CREDITO.score')
    .join(scoreExpression);
  // Expressao sem helper nao resolve quando o caminho falta; `safeText`
  // devolve vazio em vez de deixar a chave crua na pagina.
  const guarded = swapped.replace(
    new RegExp(
      `\\{\\{\\s*(${scoreExpression.replace(/[.$[\]]/g, '\\$&')})\\s*\\}\\}`,
      'g',
    ),
    '{{safeText $1}}',
  );
  return adjustText(guarded);
}

function retargetDeep(value: unknown, scoreExpression: string): unknown {
  if (typeof value === 'string') return retargetScore(value, scoreExpression);
  if (Array.isArray(value)) {
    return value.map((item) => retargetDeep(item, scoreExpression));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        retargetDeep(item, scoreExpression),
      ]),
    );
  }
  return value;
}

export function composeReport(input: ComposerInput): ReportTemplate {
  const brand = readBrand(input.brandReference);
  const frames: ReportTemplate['frames'] = [];
  const elements: TemplateElement[] = [];
  let frameIndex = 0;
  let cursor = 0;
  let seq = 0;

  const id = (name: string) => `${input.templateId}-${name}-${(seq += 1)}`;

  function push(
    frame: ReportTemplate['frames'][number],
    element: Omit<TemplateElement, 'id' | 'frameId' | 'zIndex'> & { id: string },
  ): void {
    elements.push({
      ...element,
      frameId: frame.id,
      x: frame.x + element.x,
      y: frame.y + element.y,
      zIndex: elements.length + 1,
    });
  }

  function newFrame(name: string): ReportTemplate['frames'][number] {
    const frame = {
      id: `${input.templateId}-page-${frameIndex + 1}`,
      name,
      preset: 'a4-p' as const,
      x: 10,
      y: 10 + frameIndex * (PAGE_H + PAGE_GAP),
      width: PAGE_W,
      height: PAGE_H,
      background: C.white,
    };
    frames.push(frame);
    frameIndex += 1;

    // Cabecalho, identico ao da matriz.
    push(frame, {
      id: id('logo'),
      type: 'image',
      ...{ x: HEADER_LOGO.x, y: HEADER_LOGO.y, width: HEADER_LOGO.w, height: HEADER_LOGO.h },
      style: {},
      data: { src: brand.logo, fit: 'contain' },
    });
    push(frame, {
      id: id('title'),
      type: 'text',
      x: HEADER_TITLE.x,
      y: HEADER_TITLE.y,
      width: HEADER_TITLE.w,
      height: HEADER_TITLE.h,
      style: { ...brand.titleStyle },
      data: { text: brand.title },
    });
    push(frame, {
      id: id('meta'),
      type: 'text',
      x: HEADER_META.x,
      y: HEADER_META.y,
      width: HEADER_META.w,
      height: HEADER_META.h,
      style: { color: C.muted, fontSize: 10, textAlign: 'right' },
      data: { text: '{{safeText template.date}}\nPROT: {{safeText template.protocol}}' },
    });
    push(frame, {
      id: id('rule'),
      type: 'divider',
      x: MARGIN,
      y: HEADER_RULE_Y,
      width: CONTENT_W,
      height: 3,
      style: { background: brand.accent },
      data: {},
    });
    push(frame, {
      id: id('foot'),
      type: 'text',
      x: MARGIN,
      y: BODY_BOTTOM,
      width: CONTENT_W,
      height: 30,
      style: { color: C.faint, fontSize: 8, textAlign: 'center' },
      data: {
        text: `Consultas PRO — Relatório de Crédito • Página ${frameIndex}`,
      },
    });
    return frame;
  }

  /** Bloco de identidade da matriz: tres colunas com icone, rotulo e valor. */
  function addIdentity(frame: ReportTemplate['frames'][number]): void {
    push(frame, {
      id: id('id-bg'),
      type: 'container',
      x: MARGIN,
      y: IDENTITY_Y,
      width: CONTENT_W,
      height: IDENTITY_H,
      style: { ...CARD_STYLE },
      data: {},
    });
    const columns: Array<[string, string, string]> = [
      ['CLIENTE ANALISADO', input.identity.nameExpression, 'User'],
      ['DOCUMENTO', input.identity.documentExpression, 'CreditCard'],
      ['TIPO DE RELATÓRIO', input.reportKind, 'FileText'],
    ];
    const originX = [45, 290, 535];
    const labelX = [92, 337, 582];
    columns.forEach(([label, value, icon], index) => {
      push(frame, {
        id: id('id-icon'),
        type: 'icon',
        x: originX[index],
        y: IDENTITY_Y + 17,
        width: 36,
        height: 36,
        style: { ...IDENTITY_ICON_STYLE },
        data: { name: icon, strokeWidth: 1.5 },
      });
      push(frame, {
        id: id('id-label'),
        type: 'text',
        x: labelX[index],
        y: IDENTITY_Y + 14,
        width: 170,
        height: 15,
        style: { ...LABEL_STYLE },
        data: { text: label },
      });
      push(frame, {
        id: id('id-value'),
        type: 'text',
        x: labelX[index],
        y: IDENTITY_Y + 30,
        width: 170,
        height: 20,
        style: { ...VALUE_STYLE },
        data: { text: value },
      });
    });
  }

  /** Cabecalho de secao da matriz: icone em caixa, titulo e regua. */
  function addSectionHeader(
    frame: ReportTemplate['frames'][number],
    y: number,
    icon: string,
    title: string,
  ): number {
    push(frame, {
      id: id('sec-icon'),
      type: 'icon',
      x: MARGIN,
      y,
      width: 28,
      height: 28,
      style: { ...SECTION_ICON_STYLE },
      data: { name: icon, strokeWidth: 2 },
    });
    push(frame, {
      id: id('sec-title'),
      type: 'text',
      x: 68,
      y: y + 6,
      width: 150,
      height: 20,
      style: { ...SECTION_TITLE_STYLE },
      data: { text: title },
    });
    push(frame, {
      id: id('sec-rule'),
      type: 'divider',
      x: 222,
      y: y + 14,
      width: 542,
      height: 2,
      style: { background: C.line },
      data: {},
    });
    return y + 40;
  }

  /** Indicadores com barra lateral colorida, como o RESUMO FINANCEIRO da matriz. */
  function addKpis(
    frame: ReportTemplate['frames'][number],
    y: number,
    items: ComposerField[],
  ): number {
    const width = 230;
    const step = 252;
    items.slice(0, 3).forEach((item, index) => {
      const x = MARGIN + index * step;
      push(frame, {
        id: id('kpi-bg'),
        type: 'container',
        x,
        y,
        width,
        height: 75,
        style: { ...CARD_STYLE },
        data: {},
      });
      push(frame, {
        id: id('kpi-accent'),
        type: 'divider',
        x,
        y,
        width: 4,
        height: 75,
        style: { background: KPI_ACCENTS[index % KPI_ACCENTS.length] },
        data: {},
      });
      push(frame, {
        id: id('kpi-label'),
        type: 'text',
        x: x + 14,
        y: y + 7,
        width: 210,
        height: 15,
        style: { ...LABEL_STYLE },
        data: { text: item.label.toUpperCase() },
      });
      push(frame, {
        id: id('kpi-value'),
        type: 'text',
        x: x + 14,
        y: y + 23,
        width: 210,
        height: 25,
        style: {
          color: KPI_ACCENTS[index % KPI_ACCENTS.length],
          fontSize: 16,
          fontWeight: 700,
        },
        data: { text: item.value },
      });
      if (item.hint) {
        push(frame, {
          id: id('kpi-hint'),
          type: 'text',
          x: x + 14,
          y: y + 51,
          width: 210,
          height: 15,
          style: { ...HINT_STYLE },
          data: { text: item.hint },
        });
      }
    });
    return y + 95;
  }

  /** Grade de campos em tres colunas, no mesmo par rotulo/valor da matriz. */
  function addFields(
    frame: ReportTemplate['frames'][number],
    y: number,
    items: ComposerField[],
  ): number {
    const width = 230;
    const step = 252;
    items.forEach((item, index) => {
      const column = index % 3;
      const row = Math.floor(index / 3);
      const x = MARGIN + column * step;
      const fy = y + row * 62;
      push(frame, {
        id: id('fld-bg'),
        type: 'container',
        x,
        y: fy,
        width,
        height: 54,
        style: { ...CARD_STYLE },
        data: {},
      });
      push(frame, {
        id: id('fld-label'),
        type: 'text',
        x: x + 14,
        y: fy + 8,
        width: 202,
        height: 14,
        style: { ...LABEL_STYLE },
        data: { text: item.label.toUpperCase() },
      });
      push(frame, {
        id: id('fld-value'),
        type: 'text',
        x: x + 14,
        y: fy + 24,
        width: 202,
        height: 20,
        style: { ...VALUE_STYLE },
        data: { text: item.value },
      });
    });
    return y + Math.ceil(items.length / 3) * 62 + 12;
  }

  /** Tabela com o mesmo desenho das quatro tabelas de divida da matriz. */
  function addTable(
    frame: ReportTemplate['frames'][number],
    y: number,
    table: ComposerTable,
  ): number {
    const top = addSectionHeader(frame, y, table.icon, table.title);
    push(frame, {
      id: id('tbl'),
      type: 'table',
      x: MARGIN,
      y: top,
      width: CONTENT_W,
      height: 26 * 6,
      style: { fontSize: 10 },
      data: {
        arrayPath: table.arrayPath,
        headerBg: C.subtle,
        headerColor: C.muted,
        headerSize: 9,
        rowColor: C.ink,
        rowSize: 10,
        emptyStateHtml: `<div style="padding:16px;text-align:center;color:${C.faint};font-size:10px">${table.emptyMessage}</div>`,
        columns: table.columns,
      },
    });
    return top + 26 * 6 + 20;
  }

  // ── Montagem ───────────────────────────────────────────────────────────────
  let frame = newFrame(`Página 1 (${input.productName})`);
  addIdentity(frame);
  cursor = BODY_TOP;

  for (const section of input.sections) {
    const needed = sectionHeight(section);
    if (cursor + needed > BODY_BOTTOM - 20) {
      frame = newFrame(`Página ${frameIndex + 1} (${input.productName})`);
      cursor = IDENTITY_Y;
    }
    if (section.kind === 'score-block') {
      const band = cutScoreBand(input.brandReference);
      // Sem score apurado, a expressao da matriz nao resolveria e deixaria
      // `{{...}}` visivel no relatorio. Substituimos por travessao.
      const target = section.emptyState ? '—' : section.scoreExpression;
      for (const element of band) {
        const { relX, relY, id: _ignored, frameId: _f, zIndex: _z, ...rest } = element;
        push(frame, {
          ...(retargetDeep(rest, target) as Omit<
            TemplateElement,
            'id' | 'frameId' | 'zIndex'
          >),
          id: id('score'),
          x: relX,
          y: cursor + relY,
        });
      }
      if (section.emptyState) {
        push(frame, {
          id: id('score-empty'),
          type: 'text',
          x: MARGIN,
          y: cursor + 8,
          width: CONTENT_W,
          height: 18,
          style: { color: C.faint, fontSize: 9, textAlign: 'right' },
          data: { text: 'Score não apurado nesta consulta.' },
        });
      }
      cursor += MATRIX_SCORE_BAND.to - MATRIX_SCORE_BAND.from + 20;
    } else if (section.kind === 'table') {
      cursor = addTable(frame, cursor, section.table);
    } else {
      const top = addSectionHeader(frame, cursor, section.icon, section.title);
      cursor =
        section.kind === 'kpis'
          ? addKpis(frame, top, section.items)
          : addFields(frame, top, section.items);
    }
  }

  return {
    id: input.templateId,
    name: input.productName,
    version: 5,
    canvas: { background: '#f1f5f9', grid: 10 },
    frames,
    elements,
    metadata: {
      consultasProTemplate: {
        generator: 'consultas-pro-1079-composer',
        generatorVersion: 5,
        visualStandard: 'CONSULTAS_PRO_1079',
        brandReferenceTemplateId: input.brandReference.templateId,
        publicationStatus: 'READY_FOR_MANUAL_REVIEW',
        ...(input.metadata ?? {}),
      },
    },
  };
}
