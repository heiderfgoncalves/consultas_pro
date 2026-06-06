import {
  useState,
  useRef,
  useCallback,
  useMemo,
  useEffect,
  useLayoutEffect,
  type CSSProperties,
  type ReactNode,
} from 'react';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Tag, GripVertical, Pencil, Check, X, Copy,
  Move, Code2, Eye, Trash2, User, AlertTriangle, Gauge, FileWarning,
  Building2, FileX, Users, DollarSign, TrendingUp, Award, Hash,
  Settings2, Plus, Search, ChevronLeft, ChevronRight, Sliders,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import type { ConsultationFieldType, FieldMapping, TypeItemFilterConfig } from '@/types/integrations';
import {
  buildByTypeWithGlobalDedupRemoved,
  computeGlobalDuplicateRowIndicesByType,
  formatDeepFilteredValueAtPath,
  getValueAtJsonPath,
} from '@/lib/providerResponseMapping';
import {
  cloneTypeItemFilterConfig,
  countActiveTypeItemRules,
  emptyTypeItemFilterConfig,
  getActiveTypeItemFilterGroups,
  normalizeTypeItemFilterConfig,
} from '@/lib/typeItemFilters';
import TypeCriteriaDialog from '@/components/integrations/TypeCriteriaDialog';
import { MappedJsonPreviewCanvas } from '@/components/integrations/MappedJsonPreviewCanvas';
import { computeJsonLineGutterMeta, type LineGutterMeta } from '@/lib/jsonLineGutterMeta';
import { cn } from '@/lib/utils';
import { dedupeReportFieldKeys, slugifyReportFieldKey } from '@/lib/reportFieldKeys';
import { formatMappedPreviewValue } from '@/lib/reportFieldPreviewFormat';
import {
  buildComputedPreviewRows,
  collectValuesAtPath,
  normalizeMappedFieldValue,
  parsePreviewPartText,
  zipAlignedMappedPreviewRows,
} from '@/lib/consultationMappedPreview';
import { isMappedPreviewZipWrapper, wrapMappedPreviewZippedRows } from '@/lib/mappedPreviewZipWrapper';
import { toast } from 'sonner';
import { findTextMatches, toAbsoluteMatchRanges, type TextMatch } from '@/lib/jsonSearchHighlight';

interface JsonSection {
  path: string;
  startLine: number;
  endLine: number;
  depth: number;
  isObject: boolean;
  isArray: boolean;
}

interface MappedRegion {
  regionId: string;
  fieldTypeKey: string;
  startLine: number;
  endLine: number;
  path: string;
}

type PreviewPartRow = {
  regionId: string;
  path: string;
  text: string;
  hasData: boolean;
  textUndeduplicated?: string;
};

type PreviewDisplayRow = {
  fieldTypeKey: string;
  ft: ConsultationFieldType;
  parts: PreviewPartRow[];
  filters: TypeItemFilterConfig;
  /** `filtered`: critérios ativos sem itens no retorno (sempre listado). `unmapped`: tipo selecionado sem trecho mapeado. */
  emptyPreviewReason?: 'unmapped' | 'filtered';
};

interface JsonFieldMapperProps {
  json: string;
  onJsonChange: (json: string) => void;
  fieldTypes: ConsultationFieldType[];
  mappings: FieldMapping[];
  onMappingsChange: (mappings: FieldMapping[]) => void;
  typeFilters?: Record<string, TypeItemFilterConfig>;
  onTypeFiltersChange?: (next: Record<string, TypeItemFilterConfig>) => void;
  /** Título da coluna esquerda (JSON de retorno do provedor) */
  jsonColumnTitle?: string;
}

function newRegionId(): string {
  return `r_${Math.random().toString(36).slice(2, 12)}`;
}

function mergeFieldTypeDisplayOrder(
  prev: string[],
  fieldTypes: ConsultationFieldType[],
): string[] {
  const all = fieldTypes.map((ft) => ft.key);
  const set = new Set(all);
  const next = prev.filter((k) => set.has(k));
  for (const k of all) {
    if (!next.includes(k)) next.push(k);
  }
  return next;
}

/** Reordena `mappings` para que tipos apareçam na ordem de `typeOrder` (preview / coluna Tipos). */
/** Preserva posições dos tipos não mapeados; só permuta os slots dos tipos presentes em `orderFromMappings`. */
function applyMappingDocOrderToPanelOrder(merged: string[], orderFromMappings: string[]): string[] {
  if (orderFromMappings.length === 0) return merged;
  const mappedSet = new Set(orderFromMappings);
  let fill = 0;
  return merged.map((k) => (mappedSet.has(k) ? orderFromMappings[fill++]! : k));
}

function reorderMappingsByTypeOrder(mappings: FieldMapping[], typeOrder: string[]): FieldMapping[] {
  const byType = new Map<string, FieldMapping[]>();
  for (const m of mappings) {
    const list = byType.get(m.fieldTypeKey) ?? [];
    list.push(m);
    byType.set(m.fieldTypeKey, list);
  }
  const out: FieldMapping[] = [];
  for (const k of typeOrder) {
    const list = byType.get(k);
    if (list) {
      out.push(...list);
      byType.delete(k);
    }
  }
  byType.forEach((list) => {
    out.push(...list);
  });
  return out;
}

function compareRegionsByPanelOrder(
  a: MappedRegion,
  b: MappedRegion,
  rank: Map<string, number>,
): number {
  const ra = rank.get(a.fieldTypeKey) ?? 99999;
  const rb = rank.get(b.fieldTypeKey) ?? 99999;
  if (ra !== rb) return ra - rb;
  return a.regionId.localeCompare(b.regionId);
}

function parseJsonSections(jsonStr: string): { lines: string[]; sections: JsonSection[] } {
  const lines = jsonStr.split('\n');
  const sections: JsonSection[] = [];
  const stack: { path: string; startLine: number; isArray: boolean; depth: number; pushedKey: boolean }[] = [];
  const pathStack: string[] = [];
  let lastKey = '';

  lines.forEach((line, i) => {
    const trimmed = line.trim();
    const keyMatch = trimmed.match(/^"([^"]+)"\s*:/);
    if (keyMatch) lastKey = keyMatch[1];

    if (trimmed.includes('{') && !trimmed.includes('}')) {
      const path = lastKey ? [...pathStack, lastKey].join('.') : pathStack.join('.') || 'root';
      const pushedKey = Boolean(lastKey);
      stack.push({ path, startLine: i, isArray: false, depth: stack.length, pushedKey });
      if (pushedKey) pathStack.push(lastKey);
      lastKey = '';
    } else if (trimmed.includes('[') && !trimmed.includes(']')) {
      const path = lastKey ? [...pathStack, lastKey].join('.') : pathStack.join('.') || 'root';
      const pushedKey = Boolean(lastKey);
      stack.push({ path, startLine: i, isArray: true, depth: stack.length, pushedKey });
      if (pushedKey) pathStack.push(lastKey);
      lastKey = '';
    }

    if ((trimmed.startsWith('}') || trimmed.startsWith(']')) && stack.length > 0) {
      const opened = stack.pop()!;
      if (opened.pushedKey) pathStack.pop();
      sections.push({
        path: opened.path || `section_${opened.startLine}`,
        startLine: opened.startLine,
        endLine: i,
        depth: opened.depth,
        isObject: !opened.isArray,
        isArray: opened.isArray,
      });
    }
  });

  return { lines, sections };
}

/** Vários trechos podem compartilhar o mesmo path (ex.: chave do array e cada `{...}` interno). Prefere a seção do array. */
function resolveSectionForJsonPath(sections: JsonSection[], jsonPath: string): JsonSection | undefined {
  const candidates = sections.filter(s => s.path === jsonPath);
  if (candidates.length === 0) return undefined;
  if (candidates.length === 1) return candidates[0];
  const arrays = candidates.filter(s => s.isArray);
  if (arrays.length === 1) return arrays[0];
  if (arrays.length > 1) {
    return arrays.reduce((a, b) =>
      (a.endLine - a.startLine) < (b.endLine - b.startLine) ? a : b,
    );
  }
  return candidates[0];
}

/**
 * Ancora em `jsonPath`: a seção atual no JSON é a fonte do intervalo de linhas.
 * Com `trustUiLines`, reaproveita resize manual só quando as linhas salvas ainda
 * caem dentro dessa seção. Sem isso (ex.: outro log / texto do JSON mudou),
 * usa sempre o bloco inteiro do path — evita sombra e “Lx–Ly” presos a retorno antigo.
 */
function resolveRegionBounds(
  sections: JsonSection[],
  mapping: Pick<FieldMapping, 'jsonPath' | 'uiStartLine' | 'uiEndLine'>,
  options: { trustUiLines: boolean },
): { startLine: number; endLine: number } | null {
  const section = resolveSectionForJsonPath(sections, mapping.jsonPath);
  if (!section) return null;
  if (options.trustUiLines) {
    const us = mapping.uiStartLine;
    const ue = mapping.uiEndLine;
    if (
      typeof us === 'number'
      && typeof ue === 'number'
      && ue >= us
      && us >= section.startLine
      && ue <= section.endLine
    ) {
      return { startLine: us, endLine: ue };
    }
  }
  return { startLine: section.startLine, endLine: section.endLine };
}

const colorMap: Record<string, {
  bg: string;
  border: string;
  text: string;
  highlightLayer: string;
  solid: string;
  /** Tonalidade leve em toda a sessão do tipo no preview (como o retorno, mais suave). */
  sessionWash: string;
}> = {
  primary: {
    bg: 'bg-primary/8', border: 'border-primary/30', text: 'text-primary',
    highlightLayer: 'bg-primary/[0.11]', solid: 'bg-primary',
    sessionWash: 'bg-primary/[0.05]',
  },
  destructive: {
    bg: 'bg-destructive/8', border: 'border-destructive/30', text: 'text-destructive',
    highlightLayer: 'bg-destructive/[0.11]', solid: 'bg-destructive',
    sessionWash: 'bg-destructive/[0.045]',
  },
  warning: {
    bg: 'bg-amber-500/8', border: 'border-amber-500/30', text: 'text-amber-500',
    highlightLayer: 'bg-amber-500/[0.11]', solid: 'bg-amber-500',
    sessionWash: 'bg-amber-500/[0.05]',
  },
  success: {
    bg: 'bg-emerald-500/8', border: 'border-emerald-500/30', text: 'text-emerald-500',
    highlightLayer: 'bg-emerald-500/[0.11]', solid: 'bg-emerald-500',
    sessionWash: 'bg-emerald-500/[0.05]',
  },
  info: {
    bg: 'bg-sky-500/8', border: 'border-sky-500/30', text: 'text-sky-500',
    highlightLayer: 'bg-sky-500/[0.11]', solid: 'bg-sky-500',
    sessionWash: 'bg-sky-500/[0.05]',
  },
};

function getColors(color: string) {
  return colorMap[color] || colorMap.primary;
}

function getMappedValuePreview(
  rootJson: string,
  jsonPath: string,
  filters: TypeItemFilterConfig | undefined,
  lineFallback: string,
): { text: string; hasData: boolean } {
  return formatDeepFilteredValueAtPath(rootJson, jsonPath, filters, lineFallback);
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  User, AlertTriangle, Gauge, FileWarning, Building2, FileX, Users,
  DollarSign, TrendingUp, Award, Tag, Hash,
};

function FieldIcon({ icon, className }: { icon: string; className?: string }) {
  const Icon = iconMap[icon] || Tag;
  return <Icon className={className} />;
}

// Extract all field keys from JSON for dedup
function extractJsonKeys(jsonStr: string): string[] {
  try {
    const obj = JSON.parse(jsonStr);
    const keys = new Set<string>();
    function walk(o: unknown, prefix: string) {
      if (o && typeof o === 'object' && !Array.isArray(o)) {
        for (const [k, v] of Object.entries(o as Record<string, unknown>)) {
          const path = prefix ? `${prefix}.${k}` : k;
          keys.add(path);
          walk(v, path);
        }
      } else if (Array.isArray(o) && o.length > 0) {
        walk(o[0], prefix + '[0]');
      }
    }
    walk(obj, '');
    return Array.from(keys);
  } catch {
    return [];
  }
}

const SEARCH_MARK_RETORNO =
  'box-decoration-clone rounded-[1px] bg-yellow-300/95 py-0 leading-[inherit] text-foreground dark:bg-yellow-500/45 dark:text-foreground';
const SEARCH_MARK_RETORNO_ACTIVE =
  'box-decoration-clone rounded-[1px] bg-amber-400/95 py-0 leading-[inherit] text-foreground ring-1 ring-amber-600 dark:bg-amber-500 dark:ring-amber-200';

/** Tipografia e fluxo idênticos ao `<textarea>` para o espelho de highlight. */
const JSON_EDITOR_SYNC_CLASS =
  'w-full min-h-full overflow-auto p-3 font-mono text-sm leading-6 [tab-size:4] [scrollbar-width:thin] whitespace-pre [word-break:normal] [overflow-wrap:normal]';

function scrollTextareasToMatchLine(
  ta: HTMLTextAreaElement | null,
  mirror: HTMLPreElement | null,
  lineIndex: number,
) {
  if (!ta) return;
  const cs = getComputedStyle(ta);
  const rawLh = cs.lineHeight;
  let lineHeightPx = 24;
  if (rawLh.endsWith('px')) lineHeightPx = parseFloat(rawLh) || 24;
  const padTop = parseFloat(cs.paddingTop) || 0;
  const targetY = padTop + lineIndex * lineHeightPx;
  const st = Math.round(Math.max(0, targetY - ta.clientHeight / 2 + lineHeightPx / 2));
  ta.scrollTop = st;
  if (mirror) {
    mirror.scrollTop = st;
    mirror.scrollLeft = ta.scrollLeft;
  }
}

function renderRetornoFlatTextWithMatches(
  text: string,
  absRanges: { start: number; end: number; globalIndex: number }[],
  activeGlobalIndex: number,
): ReactNode {
  if (absRanges.length === 0) return text;
  let pos = 0;
  const parts: ReactNode[] = [];
  for (const r of absRanges) {
    if (r.start < pos) continue;
    if (r.start > pos) parts.push(text.slice(pos, r.start));
    const cls = r.globalIndex === activeGlobalIndex ? SEARCH_MARK_RETORNO_ACTIVE : SEARCH_MARK_RETORNO;
    parts.push(
      <mark key={`m-${r.globalIndex}`} className={cls}>
        {text.slice(r.start, r.end)}
      </mark>,
    );
    pos = r.end;
  }
  if (pos < text.length) parts.push(text.slice(pos));
  return <>{parts}</>;
}

function renderRetornoLineWithMatches(
  line: string,
  lineIndex: number,
  matches: TextMatch[],
  activeGlobalIndex: number,
): ReactNode {
  const lineMatches = matches.filter((m) => m.line === lineIndex).sort((a, b) => a.startInLine - b.startInLine);
  if (lineMatches.length === 0) return line || ' ';
  const text = line || ' ';
  let pos = 0;
  const parts: ReactNode[] = [];
  let k = 0;
  for (const m of lineMatches) {
    if (m.startInLine > pos) parts.push(text.slice(pos, m.startInLine));
    const cls = m.globalIndex === activeGlobalIndex ? SEARCH_MARK_RETORNO_ACTIVE : SEARCH_MARK_RETORNO;
    parts.push(
      <mark key={`${m.globalIndex}-${k++}`} className={cls}>
        {text.slice(m.startInLine, m.endInLine)}
      </mark>,
    );
    pos = m.endInLine;
  }
  if (pos < text.length) parts.push(text.slice(pos));
  return <>{parts}</>;
}

const LINE_HEIGHT = 24; // px por linha (alinhado a text-sm / leading-6)
const PREVIEW_LINE_HEIGHT = 24; // min-h-[1.5rem] no canvas de preview
const REGION_DRAG_THRESHOLD_PX = 5; // evita confundir clique de seleção com arraste

/** Centraliza (ou ancora no topo) o intervalo de linhas no viewport do JSON de retorno — mede o DOM real. */
function scrollRetornoRangeIntoViewDom(root: HTMLDivElement, startLine: number, endLine: number) {
  const lo = Math.min(startLine, endLine);
  const hi = Math.max(startLine, endLine);
  const startEl = root.querySelector<HTMLElement>(`[data-json-mapper-line="${lo}"]`);
  if (!startEl) return;
  const endEl = root.querySelector<HTMLElement>(`[data-json-mapper-line="${hi}"]`) ?? startEl;
  const pad = 8;
  const rootRect = root.getBoundingClientRect();
  const top = startEl.getBoundingClientRect().top - rootRect.top + root.scrollTop;
  const bottom = endEl.getBoundingClientRect().bottom - rootRect.top + root.scrollTop;
  const viewH = root.clientHeight;
  const blockH = bottom - top;
  let nextTop: number;
  if (blockH > viewH - 2 * pad) {
    nextTop = top - pad;
  } else {
    const mid = (top + bottom) / 2;
    nextTop = Math.round(Math.max(0, Math.min(mid - viewH / 2, root.scrollHeight - viewH)));
  }
  root.scrollTop = nextTop;

  const rootRect2 = root.getBoundingClientRect();
  const rStart = startEl.getBoundingClientRect();
  const rEnd = endEl.getBoundingClientRect();
  const left = Math.min(rStart.left, rEnd.left) - rootRect2.left + root.scrollLeft;
  const right = Math.max(rStart.right, rEnd.right) - rootRect2.left + root.scrollLeft;
  const viewW = root.clientWidth;
  let sl = root.scrollLeft;
  if (left < sl + pad) sl = left - pad;
  else if (right > sl + viewW - pad) sl = right - viewW + pad;
  root.scrollLeft = Math.max(0, sl);
}

const SENTINEL_EMPTY = '__empty__';

function cellToSuggestionString(val: unknown): string {
  if (val == null) return '';
  if (typeof val === 'string') return val.trim();
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  try {
    return JSON.stringify(val);
  } catch {
    return String(val);
  }
}

/** Extrai `{...}` ou `[...]` balanceado a partir de `start` (respeitando strings JSON). */
function extractBalancedJsonFragment(s: string, start: number): string | null {
  const first = s[start];
  if (first !== '{' && first !== '[') return null;
  const stack: string[] = [first === '{' ? '}' : ']'];
  let inString = false;
  let esc = false;
  for (let i = start + 1; i < s.length; i++) {
    const c = s[i];
    if (inString) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') {
      inString = true;
      continue;
    }
    if (c === '{') stack.push('}');
    else if (c === '[') stack.push(']');
    else if (c === '}' || c === ']') {
      const top = stack[stack.length - 1];
      if (c !== top) return null;
      stack.pop();
      if (stack.length === 0) return s.slice(start, i + 1);
    }
  }
  return null;
}

/**
 * Interpreta o texto das linhas grifadas: documento completo, ou trecho `"CHAVE": valor`, ou só o valor a partir do primeiro `{`/`[`.
 */
function tryParseJsonValueFromSlice(slice: string): unknown | null {
  const t = slice.trim();
  if (!t) return null;
  try {
    return JSON.parse(t);
  } catch {
    /* continua */
  }
  let body = t;
  const keyPrefix = body.match(/^\s*"(?:[^"\\]|\\.)*"\s*:\s*/);
  if (keyPrefix) body = body.slice(keyPrefix[0].length).trimStart();
  const relStart = body.search(/[[{]/);
  if (relStart < 0) return null;
  const balanced = extractBalancedJsonFragment(body, relStart);
  if (!balanced) return null;
  try {
    return JSON.parse(balanced);
  } catch {
    return null;
  }
}

/** Separador interno trecho↔path relativo no valor do Select (RS, não ocorre em jsonPath). */
const JSON_FIELD_TRECHO_REL_SEP = '\x1e';

/** Coleta chaves e valores dos trechos mapeados: valor no `jsonPath` + JSON literal das linhas selecionadas. */
function collectFilterSuggestionsForMappedRegions(
  jsonStr: string,
  lines: string[],
  regions: { path: string; startLine: number; endLine: number }[],
): {
  fields: string[];
  valuesByField: Record<string, string[]>;
  allValues: string[];
  allPaths: string[];
  /** Grupos do select: cabeçalho = path do trecho (como no card); linhas = só path relativo. */
  jsonFieldSelectGroups: { header: string; items: { value: string; label: string }[] }[];
} {
  const fieldSet = new Set<string>();
  const valueMap = new Map<string, Set<string>>();
  const pathSet = new Set<string>();
  const pathsByTrecho = new Map<string, Set<string>>();

  let root: unknown;
  try {
    root = JSON.parse(jsonStr) as unknown;
  } catch {
    return { fields: [], valuesByField: {}, allValues: [], allPaths: [], jsonFieldSelectGroups: [] };
  }

  for (const r of regions) {
    const trechoPath = r.path;
    if (!pathsByTrecho.has(trechoPath)) pathsByTrecho.set(trechoPath, new Set());
    const registerRelativePath = (relPath: string) => {
      pathSet.add(relPath);
      pathsByTrecho.get(trechoPath)!.add(relPath);
    };

    const scanObject = (obj: Record<string, unknown>, prefix = '') => {
      for (const [k, val] of Object.entries(obj)) {
        fieldSet.add(k);
        const nextPath = prefix ? `${prefix}.${k}` : k;
        registerRelativePath(nextPath);
        if (!valueMap.has(k)) valueMap.set(k, new Set());
        const s = cellToSuggestionString(val);
        if (s) valueMap.get(k)!.add(s);
        deepCollect(val, nextPath);
      }
    };

    const scanArrayOfObjects = (arr: unknown[], prefix = '') => {
      for (const el of arr) {
        if (!el || typeof el !== 'object' || Array.isArray(el)) continue;
        scanObject(el as Record<string, unknown>, prefix);
      }
    };

    const deepCollect = (value: unknown, prefix = '') => {
      if (value == null) return;
      if (Array.isArray(value)) {
        scanArrayOfObjects(value, prefix);
        for (const el of value) deepCollect(el, prefix);
      } else if (typeof value === 'object') {
        scanObject(value as Record<string, unknown>, prefix);
      }
    };

    const slice = lines.slice(r.startLine, r.endLine + 1).join('\n');
    const fromSlice = tryParseJsonValueFromSlice(slice);
    if (fromSlice !== null) deepCollect(fromSlice);
    deepCollect(getValueAtJsonPath(root, r.path));
  }

  const valuesByField: Record<string, string[]> = {};
  for (const [k, s] of valueMap) {
    const uniq = [...s];
    const seen = new Set<string>();
    const deduped: string[] = [];
    for (const v of uniq) {
      if (seen.has(v)) continue;
      seen.add(v);
      deduped.push(v);
    }
    valuesByField[k] = deduped.sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }
  const all = new Set<string>();
  for (const arr of Object.values(valuesByField)) for (const v of arr) all.add(v);
  const allValues = [...all].sort((a, b) => a.localeCompare(b, 'pt-BR'));

  const relPathsSorted = [...pathSet].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const jsonFieldSelectGroups = [...pathsByTrecho.entries()]
    .sort(([a], [b]) => a.localeCompare(b, 'pt-BR'))
    .map(([header, set]) => ({
      header,
      items: [...set]
        .sort((x, y) => x.localeCompare(y, 'pt-BR'))
        .map((rel) => ({
          value: `${header}${JSON_FIELD_TRECHO_REL_SEP}${rel}`,
          label: rel,
        })),
    }));

  return {
    fields: [...fieldSet].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    valuesByField,
    allValues,
    allPaths: relPathsSorted,
    jsonFieldSelectGroups,
  };
}

function summarizeTypeItemCriteria(config: TypeItemFilterConfig): string {
  const groups = getActiveTypeItemFilterGroups(normalizeTypeItemFilterConfig(config));
  const bits: string[] = [];
  for (const g of groups) {
    for (const r of g.rules) {
      if (!r.field.trim()) continue;
      const opLabel =
        r.op === 'eq' ? '='
        : r.op === 'contains' ? 'contém'
        : r.op === 'startsWith' ? 'começa'
        : r.op === 'endsWith' ? 'termina'
        : r.op === 'regex' ? '~'
        : r.op;
      bits.push(`${r.field} ${opLabel} ${r.value}`.trim());
    }
  }
  return bits.join(' · ');
}

function SortableTypeCardShell({
  typeKey,
  children,
}: {
  typeKey: string;
  children: (shell: {
    setNodeRef: (el: HTMLDivElement | null) => void;
    style: CSSProperties;
    dragAttributes: Record<string, unknown>;
    dragListeners: Record<string, unknown> | undefined;
    isDragging: boolean;
  }) => ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: typeKey });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.72 : 1,
  };
  return (
    <>
      {children({
        setNodeRef,
        style,
        dragAttributes: attributes as unknown as Record<string, unknown>,
        dragListeners: listeners as unknown as Record<string, unknown> | undefined,
        isDragging,
      })}
    </>
  );
}

export default function JsonFieldMapper({
  json,
  onJsonChange,
  fieldTypes,
  mappings,
  onMappingsChange,
  typeFilters = {},
  onTypeFiltersChange = () => {},
  jsonColumnTitle = 'JSON de retorno',
}: JsonFieldMapperProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editBuffer, setEditBuffer] = useState(json);
  const [draggedType, setDraggedType] = useState<ConsultationFieldType | null>(null);
  const [hoveredSection, setHoveredSection] = useState<JsonSection | null>(null);
  const [mappedRegions, setMappedRegions] = useState<MappedRegion[]>(() => {
    const { sections } = parseJsonSections(json);
    return mappings
      .map((m, i) => {
        const bounds = resolveRegionBounds(sections, m, { trustUiLines: false });
        if (!bounds) return null;
        return {
          regionId: `${m.fieldTypeKey}::${m.jsonPath}::${i}`,
          fieldTypeKey: m.fieldTypeKey,
          startLine: bounds.startLine,
          endLine: bounds.endLine,
          path: m.jsonPath,
        };
      })
      .filter((r): r is MappedRegion => r !== null);
  });
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [openFilterTypeKey, setOpenFilterTypeKey] = useState<string | null>(null);
  const [draftTypeFilters, setDraftTypeFilters] = useState<Record<string, TypeItemFilterConfig>>({});
  const [retornoSearch, setRetornoSearch] = useState('');
  const [previewSearch, setPreviewSearch] = useState('');
  const [retornoActiveIdx, setRetornoActiveIdx] = useState(0);
  const [previewActiveIdx, setPreviewActiveIdx] = useState(0);
  const jsonContainerRef = useRef<HTMLDivElement>(null);
  const jsonViewScrollRef = useRef<HTMLDivElement>(null);
  const previewScrollRef = useRef<HTMLDivElement>(null);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);
  const editHighlightPreRef = useRef<HTMLPreElement>(null);
  const skipNextRegionLineClick = useRef(false);
  const prevMappingsSigRef = useRef<string | null>(null);
  /** Último JSON aplicado; quando muda (troca de log / colar retorno), não reutiliza uiStart/uiEnd. */
  const prevJsonTextRef = useRef<string | null>(null);
  const onMappingsChangeRef = useRef(onMappingsChange);
  onMappingsChangeRef.current = onMappingsChange;
  /** Atualizado em todo dragover; o drop usa isto para não perder a seção (state/React 18 ou dragleave). */
  const hoveredSectionRef = useRef<JsonSection | null>(null);
  const pendingRetornoRevealRef = useRef<{ startLine: number; endLine: number } | null>(null);
  const [retornoNavigateSeq, setRetornoNavigateSeq] = useState(0);
  const [fieldTypeDisplayOrder, setFieldTypeDisplayOrder] = useState<string[]>(() =>
    fieldTypes.map((ft) => ft.key),
  );
  /** Ordem de sobreposição no preview (horizontal no badge); independente da ordem no JSON/coluna. */
  const [previewTypeStackOrder, setPreviewTypeStackOrder] = useState<string[] | null>(null);

  const typeReorderSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const mappingTypeKeysSig = useMemo(
    () => mappings.map((m) => m.fieldTypeKey).join('\u0001'),
    [mappings],
  );

  useEffect(() => {
    setFieldTypeDisplayOrder((prev) => {
      const merged = mergeFieldTypeDisplayOrder(prev, fieldTypes);
      const orderFromMappings: string[] = [];
      const seen = new Set<string>();
      for (const m of mappings) {
        if (!seen.has(m.fieldTypeKey)) {
          seen.add(m.fieldTypeKey);
          orderFromMappings.push(m.fieldTypeKey);
        }
      }
      if (orderFromMappings.length === 0) return merged;
      return applyMappingDocOrderToPanelOrder(merged, orderFromMappings);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `mappings` alinhado a `mappingTypeKeysSig` (evita loop por referência)
  }, [fieldTypes, mappingTypeKeysSig]);

  useEffect(() => {
    setEditBuffer(json);
    const trimmed = json.trim();
    if (!trimmed) {
      setIsEditing(true);
      return;
    }
    try {
      JSON.parse(json);
      setIsEditing(false);
    } catch {
      setIsEditing(true);
    }
  }, [json]);

  const mappingsSig = useMemo(
    () => JSON.stringify(mappings.map(m => ({
      k: m.fieldTypeKey,
      p: m.jsonPath,
      s: m.uiStartLine ?? null,
      e: m.uiEndLine ?? null,
    }))),
    [mappings],
  );

  // Edge drag state
  const [edgeDrag, setEdgeDrag] = useState<{
    regionKey: string;
    edge: 'start' | 'end';
    initialY: number;
    initialLine: number;
  } | null>(null);

  // Region drag state (move entire region)
  const [regionDrag, setRegionDrag] = useState<{
    regionKey: string;
    initialY: number;
    initialStart: number;
    initialEnd: number;
  } | null>(null);

  const [regionDragPending, setRegionDragPending] = useState<{
    regionId: string;
    fieldTypeKey: string;
    startY: number;
    initialStart: number;
    initialEnd: number;
  } | null>(null);

  const toFieldMappings = useCallback(
    (regions: MappedRegion[]): FieldMapping[] =>
      regions.map(r => ({
        jsonPath: r.path,
        fieldTypeKey: r.fieldTypeKey,
        label: fieldTypes.find(ft => ft.key === r.fieldTypeKey)?.label || r.path,
        format: 'object',
        uiStartLine: r.startLine,
        uiEndLine: r.endLine,
      })),
    [fieldTypes],
  );

  const syncMappings = useCallback(
    (regions: MappedRegion[]) => {
      onMappingsChange(toFieldMappings(regions));
    },
    [onMappingsChange, toFieldMappings],
  );

  useEffect(() => {
    const jsonTextChanged = prevJsonTextRef.current !== json;
    prevJsonTextRef.current = json;
    const trustUiLines = !jsonTextChanged;

    const { sections: nextSections } = parseJsonSections(json);
    prevMappingsSigRef.current = mappingsSig;

    const nextRegions = mappings
      .map((m, i) => {
        const bounds = resolveRegionBounds(nextSections, m, { trustUiLines });
        if (!bounds) return null;
        return {
          regionId: `${m.fieldTypeKey}::${m.jsonPath}::${i}`,
          fieldTypeKey: m.fieldTypeKey,
          startLine: bounds.startLine,
          endLine: bounds.endLine,
          path: m.jsonPath,
        };
      })
      .filter((r): r is MappedRegion => r !== null);

    setMappedRegions(nextRegions);

    if (jsonTextChanged && mappings.length > 0) {
      const aligned = mappings.map((m) => {
        const bounds = resolveRegionBounds(nextSections, m, { trustUiLines: false });
        if (!bounds) return m;
        if (m.uiStartLine === bounds.startLine && m.uiEndLine === bounds.endLine) return m;
        return { ...m, uiStartLine: bounds.startLine, uiEndLine: bounds.endLine };
      });
      const touched = aligned.some((fm, i) => {
        const old = mappings[i];
        if (!old) return false;
        return fm.uiStartLine !== old.uiStartLine || fm.uiEndLine !== old.uiEndLine;
      });
      if (touched) {
        onMappingsChangeRef.current(aligned);
      }
    }
  }, [json, mappingsSig, mappings]);

  const activeJson = isEditing ? editBuffer : json;
  const { lines, sections } = useMemo(() => parseJsonSections(activeJson), [activeJson]);

  /** Em edição: recalcula trechos só por jsonPath (sem confiar em linhas UI). Em visualização: estado do arraste/resize. */
  const displayRegions = useMemo((): MappedRegion[] => {
    if (!isEditing) return mappedRegions;
    let buf = editBuffer.trim();
    if (!buf) buf = '{}';
    try {
      JSON.parse(buf);
    } catch {
      return mappedRegions;
    }
    const { sections: sec } = parseJsonSections(buf);
    return mappings
      .map((m, i) => {
        const bounds = resolveRegionBounds(sec, m, { trustUiLines: false });
        if (!bounds) return null;
        return {
          regionId: `${m.fieldTypeKey}::${m.jsonPath}::${i}`,
          fieldTypeKey: m.fieldTypeKey,
          startLine: bounds.startLine,
          endLine: bounds.endLine,
          path: m.jsonPath,
        };
      })
      .filter((r): r is MappedRegion => r !== null);
  }, [isEditing, editBuffer, mappings, mappedRegions]);

  const allJsonKeys = useMemo(() => extractJsonKeys(activeJson), [activeJson]);

  const sortedFieldTypesForPanel = useMemo(() => {
    const byKey = new Map(fieldTypes.map((ft) => [ft.key, ft]));
    return fieldTypeDisplayOrder
      .map((k) => byKey.get(k))
      .filter((ft): ft is ConsultationFieldType => Boolean(ft));
  }, [fieldTypeDisplayOrder, fieldTypes]);

  const setFiltersForType = useCallback(
    (fieldTypeKey: string, nextConfig: TypeItemFilterConfig) => {
      onTypeFiltersChange({ ...typeFilters, [fieldTypeKey]: nextConfig });
    },
    [typeFilters, onTypeFiltersChange],
  );

  const setDraftFiltersForType = useCallback(
    (fieldTypeKey: string, nextConfig: TypeItemFilterConfig) => {
      setDraftTypeFilters((prev) => ({ ...prev, [fieldTypeKey]: nextConfig }));
    },
    [],
  );

  const openFilterDialog = useCallback(
    (fieldTypeKey: string) => {
      const nextConfig = cloneTypeItemFilterConfig(typeFilters[fieldTypeKey] ?? emptyTypeItemFilterConfig());
      setDraftTypeFilters((prev) => ({
        ...prev,
        [fieldTypeKey]: nextConfig,
      }));
      setOpenFilterTypeKey(fieldTypeKey);
    },
    [typeFilters],
  );

  const closeFilterDialog = useCallback((fieldTypeKey?: string) => {
    setDraftTypeFilters({});
    setOpenFilterTypeKey(null);
  }, []);

  const saveFilterDialog = useCallback(
    (fieldTypeKey: string) => {
      setFiltersForType(
        fieldTypeKey,
        cloneTypeItemFilterConfig(draftTypeFilters[fieldTypeKey] ?? emptyTypeItemFilterConfig()),
      );
      setDraftTypeFilters({});
      setOpenFilterTypeKey(null);
    },
    [draftTypeFilters, setFiltersForType],
  );

  const findSectionForLine = useCallback((lineIdx: number): JsonSection | null => {
    const startingHere = sections.filter(s => s.startLine === lineIdx);
    if (startingHere.length > 0) {
      const arrays = startingHere.filter(s => s.isArray);
      const pool = arrays.length > 0 ? arrays : startingHere;
      return pool.reduce((largest, s) =>
        (s.endLine - s.startLine) > (largest.endLine - largest.startLine) ? s : largest,
      );
    }

    const matching = sections.filter(s => lineIdx >= s.startLine && lineIdx <= s.endLine);
    if (matching.length === 0) return null;

    const arrayMatches = matching.filter(s => s.isArray);
    if (arrayMatches.length > 0) {
      return arrayMatches.reduce((smallest, s) =>
        (s.endLine - s.startLine) < (smallest.endLine - smallest.startLine) ? s : smallest,
      );
    }

    return matching.reduce((smallest, s) =>
      (s.endLine - s.startLine) < (smallest.endLine - smallest.startLine) ? s : smallest,
    );
  }, [sections]);

  const handleLineDragOver = useCallback((e: React.DragEvent, lineIdx: number) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
    const section = findSectionForLine(lineIdx);
    if (section) {
      hoveredSectionRef.current = section;
      setHoveredSection(section);
    }
  }, [findSectionForLine]);

  const appendRegion = useCallback(
    (fieldTypeKey: string, section: JsonSection) => {
      const nextR: MappedRegion = {
        regionId: newRegionId(),
        fieldTypeKey,
        startLine: section.startLine,
        endLine: section.endLine,
        path: section.path,
      };
      setMappedRegions(prev => {
        const next = [...prev, nextR];
        syncMappings(next);
        return next;
      });
      setSelectedRegion(fieldTypeKey);
      pendingRetornoRevealRef.current = {
        startLine: section.startLine,
        endLine: section.endLine,
      };
      setRetornoNavigateSeq((n) => n + 1);
    },
    [syncMappings],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const section = hoveredSectionRef.current ?? hoveredSection;
      if (!draggedType || !section) return;
      appendRegion(draggedType.key, section);
      hoveredSectionRef.current = null;
      setDraggedType(null);
      setHoveredSection(null);
    },
    [draggedType, hoveredSection, appendRegion],
  );

  const handleEdgeMouseDown = useCallback((e: React.MouseEvent, regionId: string, edge: 'start' | 'end') => {
    e.preventDefault();
    e.stopPropagation();
    const region = mappedRegions.find(r => r.regionId === regionId);
    if (!region) return;
    setEdgeDrag({
      regionKey: regionId,
      edge,
      initialY: e.clientY,
      initialLine: edge === 'start' ? region.startLine : region.endLine,
    });
  }, [mappedRegions]);

  const handleRegionPointerDown = useCallback((e: React.MouseEvent, regionId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const region = mappedRegions.find(r => r.regionId === regionId);
    if (!region) return;
    setRegionDragPending({
      regionId,
      fieldTypeKey: region.fieldTypeKey,
      startY: e.clientY,
      initialStart: region.startLine,
      initialEnd: region.endLine,
    });
  }, [mappedRegions]);

  useEffect(() => {
    if (!edgeDrag && !regionDrag && !regionDragPending) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (regionDragPending && !regionDrag) {
        if (Math.abs(e.clientY - regionDragPending.startY) >= REGION_DRAG_THRESHOLD_PX) {
          setRegionDrag({
            regionKey: regionDragPending.regionId,
            initialY: e.clientY,
            initialStart: regionDragPending.initialStart,
            initialEnd: regionDragPending.initialEnd,
          });
          setSelectedRegion(regionDragPending.fieldTypeKey);
          setRegionDragPending(null);
        }
        return;
      }

      if (edgeDrag) {
        const deltaY = e.clientY - edgeDrag.initialY;
        const deltaLines = Math.round(deltaY / LINE_HEIGHT);
        const newLine = edgeDrag.initialLine + deltaLines;

        setMappedRegions(prev => prev.map(r => {
          if (r.regionId !== edgeDrag.regionKey) return r;
          if (edgeDrag.edge === 'start') {
            const clamped = Math.max(0, Math.min(r.endLine - 1, newLine));
            return { ...r, startLine: clamped };
          } else {
            const clamped = Math.max(r.startLine + 1, Math.min(lines.length - 1, newLine));
            return { ...r, endLine: clamped };
          }
        }));
      }

      if (regionDrag) {
        const deltaY = e.clientY - regionDrag.initialY;
        const deltaLines = Math.round(deltaY / LINE_HEIGHT);
        const size = regionDrag.initialEnd - regionDrag.initialStart;
        let newStart = regionDrag.initialStart + deltaLines;
        let newEnd = newStart + size;

        if (newStart < 0) { newStart = 0; newEnd = size; }
        if (newEnd >= lines.length) { newEnd = lines.length - 1; newStart = newEnd - size; }

        setMappedRegions(prev => prev.map(r => {
          if (r.regionId !== regionDrag.regionKey) return r;
          return { ...r, startLine: newStart, endLine: newEnd };
        }));
      }
    };

    const handleMouseUp = () => {
      if (edgeDrag || regionDrag) {
        skipNextRegionLineClick.current = true;
        setMappedRegions(current => {
          syncMappings(current);
          return current;
        });
      }
      setEdgeDrag(null);
      setRegionDrag(null);
      setRegionDragPending(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [edgeDrag, regionDrag, regionDragPending, lines.length, syncMappings]);

  const removeRegionById = (regionId: string) => {
    const removed = mappedRegions.find(r => r.regionId === regionId);
    const newRegions = mappedRegions.filter(r => r.regionId !== regionId);
    setMappedRegions(newRegions);
    if (removed && selectedRegion === removed.fieldTypeKey && !newRegions.some(r => r.fieldTypeKey === removed.fieldTypeKey)) {
      setSelectedRegion(null);
    }
    if (removed && !newRegions.some(r => r.fieldTypeKey === removed.fieldTypeKey)) {
      setFiltersForType(removed.fieldTypeKey, emptyTypeItemFilterConfig());
    }
    syncMappings(newRegions);
  };

  const removeAllRegionsForType = (fieldTypeKey: string) => {
    const newRegions = mappedRegions.filter(r => r.fieldTypeKey !== fieldTypeKey);
    setMappedRegions(newRegions);
    if (selectedRegion === fieldTypeKey) setSelectedRegion(null);
    syncMappings(newRegions);
    setFiltersForType(fieldTypeKey, emptyTypeItemFilterConfig());
  };

  const getRegionsForLine = (lineIdx: number) =>
    displayRegions.filter(r => lineIdx >= r.startLine && lineIdx <= r.endLine);

  /** Região usada para arraste, resize e clique: a selecionada, se estiver nesta linha; senão a primeira. */
  const getPrimaryRegionForLine = (lineIdx: number) => {
    const onLine = getRegionsForLine(lineIdx);
    if (onLine.length === 0) return undefined;
    const sel = onLine.find(r => r.fieldTypeKey === selectedRegion);
    return sel ?? onLine[0];
  };

  const saveEdit = () => {
    try {
      JSON.parse(editBuffer);
      onJsonChange(editBuffer);
      setIsEditing(false);
    } catch {
      toast.error('JSON inválido — corrija antes de salvar');
    }
  };

  const lineSlicePreview = useCallback(
    (region: MappedRegion): string => lines.slice(region.startLine, region.endLine + 1).join('\n'),
    [lines],
  );

  const typePanelRank = useMemo(() => {
    const m = new Map<string, number>();
    fieldTypeDisplayOrder.forEach((k, i) => m.set(k, i));
    return m;
  }, [fieldTypeDisplayOrder]);

  const mappedTypeKeySet = useMemo(
    () => new Set(displayRegions.map((r) => r.fieldTypeKey)),
    [displayRegions],
  );

  const typeKeysInOrder = useMemo(
    () => fieldTypeDisplayOrder.filter((k) => mappedTypeKeySet.has(k)),
    [fieldTypeDisplayOrder, mappedTypeKeySet],
  );

  useEffect(() => {
    setPreviewTypeStackOrder((prev) => {
      if (typeKeysInOrder.length === 0) return null;
      const set = new Set(typeKeysInOrder);
      if (!prev || prev.length === 0) return [...typeKeysInOrder];
      const kept = prev.filter((k) => set.has(k));
      const missing = typeKeysInOrder.filter((k) => !kept.includes(k));
      return [...kept, ...missing];
    });
  }, [typeKeysInOrder]);

  const previewStackOrderEffective = useMemo(() => {
    if (
      previewTypeStackOrder
      && previewTypeStackOrder.length === typeKeysInOrder.length
      && typeKeysInOrder.every((k) => previewTypeStackOrder.includes(k))
      && previewTypeStackOrder.every((k) => typeKeysInOrder.includes(k))
    ) {
      return previewTypeStackOrder;
    }
    return typeKeysInOrder;
  }, [previewTypeStackOrder, typeKeysInOrder]);


  const handleTypesPanelDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const a = String(active.id);
      const o = String(over.id);
      const oldIndex = fieldTypeDisplayOrder.indexOf(a);
      const newIndex = fieldTypeDisplayOrder.indexOf(o);
      if (oldIndex < 0 || newIndex < 0) return;
      const nextOrder = arrayMove(fieldTypeDisplayOrder, oldIndex, newIndex);
      setFieldTypeDisplayOrder(nextOrder);
      const mapped = new Set(displayRegions.map((r) => r.fieldTypeKey));
      const previewKeys = nextOrder.filter((k) => mapped.has(k));
      onMappingsChange(reorderMappingsByTypeOrder(mappings, previewKeys));
    },
    [fieldTypeDisplayOrder, displayRegions, mappings, onMappingsChange],
  );

  const handlePreviewMappedTypeReorder = useCallback(
    (fromKey: string, toKey: string) => {
      if (fromKey === toKey) return;
      const keys = [...fieldTypeDisplayOrder];
      const fi = keys.indexOf(fromKey);
      const ti = keys.indexOf(toKey);
      if (fi < 0 || ti < 0) return;
      const nextOrder = arrayMove(keys, fi, ti);
      setFieldTypeDisplayOrder(nextOrder);
      const mapped = new Set(displayRegions.map((r) => r.fieldTypeKey));
      const previewKeys = nextOrder.filter((k) => mapped.has(k));
      onMappingsChange(reorderMappingsByTypeOrder(mappings, previewKeys));
    },
    [fieldTypeDisplayOrder, displayRegions, mappings, onMappingsChange],
  );

  const handlePreviewStackSwap = useCallback(
    (typeKey: string, dir: -1 | 1) => {
      setPreviewTypeStackOrder((prev) => {
        const valid =
          prev
          && prev.length === typeKeysInOrder.length
          && typeKeysInOrder.every((k) => prev.includes(k));
        const base = valid ? [...prev!] : [...typeKeysInOrder];
        const i = base.indexOf(typeKey);
        if (i < 0) return prev;
        const j = i + dir;
        if (j < 0 || j >= base.length) return prev;
        return arrayMove(base, i, j);
      });
    },
    [typeKeysInOrder],
  );

  const suggestionsByType = useMemo(() => {
    const keys = [...new Set(displayRegions.map(r => r.fieldTypeKey))];
    const out: Record<string, ReturnType<typeof collectFilterSuggestionsForMappedRegions>> = {};
    for (const k of keys) {
      const regs = displayRegions.filter(r => r.fieldTypeKey === k);
      out[k] = collectFilterSuggestionsForMappedRegions(activeJson, lines, regs);
    }
    return out;
  }, [activeJson, displayRegions, lines]);

  const previewByType = useMemo(() => {
    return typeKeysInOrder.map(fieldTypeKey => {
      const ft = fieldTypes.find(f => f.key === fieldTypeKey);
      if (!ft) return null;
      const regions = displayRegions.filter(r => r.fieldTypeKey === fieldTypeKey);
      const filters = openFilterTypeKey === fieldTypeKey
        ? (draftTypeFilters[fieldTypeKey] ?? typeFilters[fieldTypeKey])
        : typeFilters[fieldTypeKey];
      const parts = regions.map(region => {
        const fallback = lineSlicePreview(region);
        const preview = getMappedValuePreview(activeJson, region.path, filters, fallback);
        const previewUndeduplicated = formatDeepFilteredValueAtPath(activeJson, region.path, filters, fallback, true);
        return {
          regionId: region.regionId,
          path: region.path,
          text: preview.text,
          hasData: preview.hasData,
          textUndeduplicated: previewUndeduplicated.text,
        };
      }).filter(part => countActiveTypeItemRules(filters) === 0 || part.hasData);
      const filterCfg = filters ?? emptyTypeItemFilterConfig();
      if (countActiveTypeItemRules(filters) > 0 && parts.length === 0) {
        return { fieldTypeKey, ft, parts: [], filters: filterCfg, emptyPreviewReason: 'filtered' as const };
      }
      return { fieldTypeKey, ft, parts, filters: filterCfg };
    }).filter(Boolean) as PreviewDisplayRow[];
  }, [typeKeysInOrder, displayRegions, fieldTypes, activeJson, typeFilters, openFilterTypeKey, draftTypeFilters, lineSlicePreview]);

  /** JSON por tipo: chave raiz = tipo, filhos = campos mapeados; faixa na linha = tipo de consulta. */
  const mappedPreviewPayload = useMemo(() => {
    const byType: Record<string, unknown> = {};
    const keyToMeta = new Map<string, LineGutterMeta>();
    const rowInfo = new Map<
      string,
      { rows: Record<string, unknown>[]; dedupKeys: string[]; dedupSummary?: Record<string, unknown> }
    >();
    const stackRank = new Map(previewStackOrderEffective.map((k, i) => [k, i]));

    for (let pi = 0; pi < previewByType.length; pi++) {
      const row = previewByType[pi]!;
      const filters = openFilterTypeKey === row.fieldTypeKey
        ? (draftTypeFilters[row.fieldTypeKey] ?? typeFilters[row.fieldTypeKey])
        : typeFilters[row.fieldTypeKey];
      const filterCfg = filters ?? emptyTypeItemFilterConfig();
      const parsedParts = row.parts.map((part) => parsePreviewPartText(part.text));
      const parsedPartsUndeduplicated = row.parts.map((part) => parsePreviewPartText(part.textUndeduplicated || part.text));
      const fieldsById = new Map((row.ft.reportFieldConfig?.fields ?? []).map((field) => [field.id, field]));
      const mappedFieldRows = filterCfg.fieldMappings
        .filter((mapping) => mapping.jsonPath.trim().length > 0)
        .map((mapping) => {
          const fieldDef = fieldsById.get(mapping.reportFieldId);
          const baseKey = fieldDef?.key
            ?? slugifyReportFieldKey(mapping.reportFieldLabel || mapping.reportFieldId || 'campo');
          const trecho = mapping.sourceTrechoPath?.trim() ?? '';
          const values = row.parts.flatMap((part, idx) => {
            const partValue = parsedParts[idx];
            if (partValue == null) return [];
            if (trecho.length > 0 && part.path !== trecho) return [];
            return collectValuesAtPath(partValue, mapping.jsonPath);
          });
          return {
            baseKey,
            value: formatMappedPreviewValue(
              normalizeMappedFieldValue(values),
              fieldDef?.dataType,
            ),
            reportFieldId: mapping.reportFieldId,
          };
        });
      const computedFieldRows = buildComputedPreviewRows({
        fieldType: row.ft,
        filterCfg,
        parsedParts,
        parsedPartsUndeduplicated,
        partPaths: row.parts.map((p) => p.path),
      });
      const colors = getColors(row.ft.color);
      const sr = stackRank.get(row.fieldTypeKey) ?? pi;
      keyToMeta.set(row.fieldTypeKey, {
        barClass: colors.solid,
        title: `${row.ft.label} · tipo ${row.ft.key}`,
        sectionBadgeLabel: row.ft.label,
        sectionBadgeIcon: row.ft.icon,
        sectionTypeKey: row.fieldTypeKey,
        sectionBadgeOrdinal: pi + 1,
        sectionBadgeStackZ: 26 + sr * 4,
        sessionWashStackZ: 2 + sr,
        sessionWashClass: colors.sessionWash,
      });
      const mappedDisplayKeys = dedupeReportFieldKeys(mappedFieldRows.map((item) => item.baseKey));
      const computedDisplayKeys = dedupeReportFieldKeys(computedFieldRows.map((item) => item.baseKey));
      const dedupFieldIdSet = new Set(filterCfg.dedupFieldIds);
      const mappedBlock: Record<string, unknown> = {};
      const computedBlock: Record<string, unknown> = {};
      const dedupDisplayKeys: string[] = [];
      /** displayKey → reportFieldId canônico para fingerprint cross-type */
      const dedupKeyToCanonical = new Map<string, string>();
      const dedupSummary: Record<string, unknown> = {};
      mappedFieldRows.forEach((fieldRow, index) => {
        const displayKey = mappedDisplayKeys[index]!;
        mappedBlock[displayKey] = fieldRow.value;
        if (dedupFieldIdSet.has(fieldRow.reportFieldId)) {
          dedupDisplayKeys.push(displayKey);
          dedupKeyToCanonical.set(displayKey, fieldRow.reportFieldId);
        }
      });
      computedFieldRows.forEach((fieldRow, index) => {
        const displayKey = computedDisplayKeys[index]!;
        computedBlock[displayKey] = fieldRow.value;
        // Campos calculados marcados para dedup → propagados como dedupSummary (são aggregados, não por linha)
        if (dedupFieldIdSet.has(fieldRow.reportFieldId)) {
          dedupSummary[displayKey] = fieldRow.value;
          dedupDisplayKeys.push(displayKey);
          dedupKeyToCanonical.set(displayKey, fieldRow.reportFieldId);
        }
      });
      const zippedMapped = zipAlignedMappedPreviewRows(mappedBlock);
      let zipped: unknown;
      if (Array.isArray(zippedMapped) && Object.keys(computedBlock).length > 0) {
        zipped = wrapMappedPreviewZippedRows(zippedMapped as Record<string, unknown>[], computedBlock);
      } else if (!Array.isArray(zippedMapped) && Object.keys(computedBlock).length > 0) {
        zipped = { ...(zippedMapped as Record<string, unknown>), ...computedBlock };
      } else {
        zipped = zippedMapped;
      }
      const rowsForDedup = isMappedPreviewZipWrapper(zipped)
        ? zipped.linhas
        : Array.isArray(zippedMapped)
          ? (zippedMapped as Record<string, unknown>[])
          : null;
      if (
        dedupDisplayKeys.length > 0
        && rowsForDedup != null
        && rowsForDedup.length > 0
        && rowsForDedup.every((el) => el != null && typeof el === 'object' && !Array.isArray(el))
      ) {
        rowInfo.set(row.fieldTypeKey, {
          rows: rowsForDedup,
          dedupKeys: dedupDisplayKeys,
          ...(Object.keys(dedupSummary).length > 0 ? { dedupSummary } : {}),
          ...(dedupKeyToCanonical.size > 0 ? { dedupKeyToCanonical } : {}),
        });
      }
      byType[row.fieldTypeKey] = zipped;
    }

    const duplicateRowsByType = computeGlobalDuplicateRowIndicesByType(typeKeysInOrder, rowInfo);
    const dedupFieldKeysByType = new Map<string, Set<string>>();
    rowInfo.forEach((info, typeKey) => {
      if (info.dedupKeys.length > 0) {
        dedupFieldKeysByType.set(typeKey, new Set(info.dedupKeys));
      }
    });
    const byTypeExport = buildByTypeWithGlobalDedupRemoved(byType, typeKeysInOrder, rowInfo);

    const jsonText = JSON.stringify(byType, null, 2);
    const jsonTextForExport = JSON.stringify(byTypeExport, null, 2);
    const lineMeta = computeJsonLineGutterMeta(
      jsonText,
      keyToMeta,
      duplicateRowsByType,
      dedupFieldKeysByType,
    );
    return { jsonText, jsonTextForExport, lineMeta };
  }, [
    previewByType,
    typeKeysInOrder,
    previewStackOrderEffective,
    openFilterTypeKey,
    draftTypeFilters,
    typeFilters,
  ]);

  const retornoMatches = useMemo(
    () => findTextMatches(activeJson, retornoSearch),
    [activeJson, retornoSearch],
  );
  /** Offsets no `editBuffer` alinhados ao textarea (espelho de busca). */
  const retornoEditAbsRanges = useMemo(
    () => toAbsoluteMatchRanges(editBuffer, retornoMatches),
    [editBuffer, retornoMatches],
  );
  const previewMatches = useMemo(
    () => findTextMatches(mappedPreviewPayload.jsonText, previewSearch),
    [mappedPreviewPayload.jsonText, previewSearch],
  );

  const retornoSafeIdx = useMemo(() => {
    if (retornoMatches.length === 0) return 0;
    return Math.min(retornoActiveIdx, retornoMatches.length - 1);
  }, [retornoActiveIdx, retornoMatches.length]);

  const previewSafeIdx = useMemo(() => {
    if (previewMatches.length === 0) return 0;
    return Math.min(previewActiveIdx, previewMatches.length - 1);
  }, [previewActiveIdx, previewMatches.length]);

  /** Evita re-scroll a cada tecla: `matches` muda com o texto, mas só devemos centralizar ao buscar ou ao mudar o índice. */
  const retornoMatchesRef = useRef(retornoMatches);
  retornoMatchesRef.current = retornoMatches;
  const previewMatchesRef = useRef(previewMatches);
  previewMatchesRef.current = previewMatches;

  useEffect(() => {
    setRetornoActiveIdx(0);
  }, [retornoSearch]);

  useEffect(() => {
    setPreviewActiveIdx(0);
  }, [previewSearch]);

  useEffect(() => {
    if (retornoMatches.length === 0) {
      setRetornoActiveIdx(0);
      return;
    }
    setRetornoActiveIdx((i) => Math.min(i, retornoMatches.length - 1));
  }, [retornoMatches.length]);

  useEffect(() => {
    if (previewMatches.length === 0) {
      setPreviewActiveIdx(0);
      return;
    }
    setPreviewActiveIdx((i) => Math.min(i, previewMatches.length - 1));
  }, [previewMatches.length]);

  useLayoutEffect(() => {
    if (!isEditing) return;
    const q = retornoSearch.trim();
    const matches = retornoMatchesRef.current;
    if (!q || matches.length === 0) return;
    const m = matches[retornoSafeIdx];
    if (!m) return;
    const run = () => {
      scrollTextareasToMatchLine(editTextareaRef.current, editHighlightPreRef.current, m.line);
    };
    run();
    const t = requestAnimationFrame(run);
    return () => cancelAnimationFrame(t);
  }, [isEditing, retornoSafeIdx, retornoSearch]);

  useLayoutEffect(() => {
    if (isEditing) return;
    const q = retornoSearch.trim();
    if (!q || retornoMatches.length === 0) return;
    const m = retornoMatches[retornoSafeIdx];
    if (!m) return;
    const run = () => {
      const el = jsonViewScrollRef.current;
      if (el) scrollRetornoRangeIntoViewDom(el, m.line, m.line);
    };
    run();
    const t = requestAnimationFrame(run);
    return () => cancelAnimationFrame(t);
  }, [isEditing, retornoSafeIdx, retornoSearch, retornoMatches]);

  /** Clique na coluna Tipos (ou badge): scroll após commit — evita corrida com rAF e usa alturas reais das linhas. */
  useLayoutEffect(() => {
    const p = pendingRetornoRevealRef.current;
    pendingRetornoRevealRef.current = null;
    if (!p || isEditing) return;
    const { startLine, endLine } = p;
    const apply = () => {
      const root = jsonViewScrollRef.current;
      if (root) scrollRetornoRangeIntoViewDom(root, startLine, endLine);
    };
    apply();
    let innerRaf = 0;
    const outerRaf = requestAnimationFrame(() => {
      apply();
      innerRaf = requestAnimationFrame(apply);
    });
    return () => {
      cancelAnimationFrame(outerRaf);
      cancelAnimationFrame(innerRaf);
    };
  }, [retornoNavigateSeq, isEditing]);

  useEffect(() => {
    const q = previewSearch.trim();
    const matches = previewMatchesRef.current;
    if (!q || matches.length === 0) return;
    const m = matches[previewSafeIdx];
    if (!m) return;
    const el = previewScrollRef.current;
    if (el) {
      const lh = PREVIEW_LINE_HEIGHT;
      el.scrollTop = Math.max(0, m.line * lh - el.clientHeight / 2 + lh / 2);
    }
  }, [previewSafeIdx, previewSearch]);

  const goRetornoPrev = useCallback(() => {
    setRetornoActiveIdx((i) => {
      const n = retornoMatches.length;
      if (n === 0) return 0;
      const cur = Math.min(i, n - 1);
      return (cur - 1 + n) % n;
    });
  }, [retornoMatches.length]);

  const goRetornoNext = useCallback(() => {
    setRetornoActiveIdx((i) => {
      const n = retornoMatches.length;
      if (n === 0) return 0;
      const cur = Math.min(i, n - 1);
      return (cur + 1) % n;
    });
  }, [retornoMatches.length]);

  const goPreviewPrev = useCallback(() => {
    setPreviewActiveIdx((i) => {
      const n = previewMatches.length;
      if (n === 0) return 0;
      const cur = Math.min(i, n - 1);
      return (cur - 1 + n) % n;
    });
  }, [previewMatches.length]);

  const goPreviewNext = useCallback(() => {
    setPreviewActiveIdx((i) => {
      const n = previewMatches.length;
      if (n === 0) return 0;
      const cur = Math.min(i, n - 1);
      return (cur + 1) % n;
    });
  }, [previewMatches.length]);

  const queueRetornoReveal = useCallback((startLine: number, endLine: number) => {
    pendingRetornoRevealRef.current = {
      startLine: Math.min(startLine, endLine),
      endLine: Math.max(startLine, endLine),
    };
    setRetornoNavigateSeq((n) => n + 1);
  }, []);

  const copyRetornoJson = useCallback(async () => {
    const text = activeJson.trim() || '{}';
    try {
      await navigator.clipboard.writeText(text);
      toast.success('JSON de retorno copiado');
    } catch {
      toast.error('Não foi possível copiar');
    }
  }, [activeJson]);

  const copyPreviewJson = useCallback(async () => {
    const text = mappedPreviewPayload.jsonTextForExport.trim() || '{}';
    try {
      await navigator.clipboard.writeText(text);
      toast.success('JSON do relatório copiado (duplicatas globais removidas)');
    } catch {
      toast.error('Não foi possível copiar');
    }
  }, [mappedPreviewPayload.jsonTextForExport]);

  return (
    <div className="h-[460px] border border-border rounded-md overflow-hidden bg-card"
      style={{ cursor: edgeDrag ? 'ns-resize' : regionDrag || regionDragPending ? 'grabbing' : undefined }}>
      <ResizablePanelGroup
        direction="horizontal"
        autoSaveId="consultas-pro-json-field-mapper-panels"
      >
        {/* LEFT: JSON with line numbers */}
        <ResizablePanel defaultSize={50} minSize={22} className="min-h-0 min-w-0">
          <div className="flex min-h-0 min-w-0 flex-col h-full">
            <div className="flex shrink-0 items-center justify-between gap-2 px-3 h-9 border-b border-border bg-muted/40">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2 min-w-0">
                <Code2 className="w-4 h-4 shrink-0" /> <span className="truncate">{jsonColumnTitle}</span>
              </span>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  aria-label="Copiar JSON de retorno"
                  title="Copiar JSON de retorno"
                  onClick={() => void copyRetornoJson()}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                {!isEditing ? (
                  <button onClick={() => { setEditBuffer(json); setIsEditing(true); }}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5">
                    <Pencil className="w-3.5 h-3.5" /> Editar
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={saveEdit} className="text-xs text-emerald-600 hover:text-emerald-500 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> OK
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditBuffer(json);
                        setIsEditing(false);
                      }}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            {isEditing ? (
              <div className="relative min-h-0 flex-1 overflow-hidden">
                <pre
                  ref={editHighlightPreRef}
                  className={`pointer-events-none absolute inset-0 m-0 bg-background text-foreground/90 ${JSON_EDITOR_SYNC_CLASS}`}
                  aria-hidden
                >
                  {retornoSearch.trim()
                    ? retornoEditAbsRanges.length > 0
                      ? renderRetornoFlatTextWithMatches(editBuffer, retornoEditAbsRanges, retornoSafeIdx)
                      : editBuffer
                    : editBuffer}
                </pre>
                <textarea
                  ref={editTextareaRef}
                  value={editBuffer}
                  onChange={e => setEditBuffer(e.target.value)}
                  onScroll={(e) => {
                    const t = e.currentTarget;
                    const p = editHighlightPreRef.current;
                    if (p) {
                      p.scrollTop = t.scrollTop;
                      p.scrollLeft = t.scrollLeft;
                    }
                  }}
                  spellCheck={false}
                  className={`relative z-10 block h-full min-h-[5rem] resize-none bg-transparent text-transparent caret-foreground focus:outline-none selection:bg-primary/25 ${JSON_EDITOR_SYNC_CLASS}`}
                />
              </div>
            ) : (
              <div
                ref={jsonViewScrollRef}
                className="min-h-0 min-w-0 flex-1 overflow-x-auto overflow-y-auto [scrollbar-width:thin] overscroll-x-contain"
              >
                <div
                  ref={jsonContainerRef}
                  className="select-none relative w-max min-w-full"
                  onDragOver={e => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'copy';
                  }}
                  onDrop={handleDrop}
                  onDragLeave={e => {
                    const el = jsonContainerRef.current;
                    const rel = e.relatedTarget as Node | null;
                    if (el && rel && el.contains(rel)) return;
                    hoveredSectionRef.current = null;
                    setHoveredSection(null);
                  }}
                >
                  {lines.map((line, i) => {
                    const regionsOnLine = getRegionsForLine(i);
                    const region = getPrimaryRegionForLine(i);
                    const ft = region ? fieldTypes.find(f => f.key === region.fieldTypeKey) : null;
                    const primaryColors = ft ? getColors(ft.color) : null;
                    const startsOnLine = displayRegions.filter(r => r.startLine === i);
                    const endsOnLine = displayRegions.filter(r => r.endLine === i);
                    const orderedRegionsOnLine = [...regionsOnLine].sort((a, b) =>
                      compareRegionsByPanelOrder(a, b, typePanelRank),
                    );
                    const orderedStartsOnLine = [...startsOnLine].sort((a, b) =>
                      compareRegionsByPanelOrder(a, b, typePanelRank),
                    );
                    const orderedEndsOnLine = [...endsOnLine].sort((a, b) =>
                      compareRegionsByPanelOrder(a, b, typePanelRank),
                    );
                    const dragHoverLine =
                      hoveredSection && draggedType
                      && i >= hoveredSection.startLine && i <= hoveredSection.endLine;
                    const dragColors = dragHoverLine && draggedType ? getColors(draggedType.color) : null;
                    const leftBorder =
                      region && selectedRegion === region.fieldTypeKey && primaryColors
                        ? `${primaryColors.border} border-l-2`
                        : '';
                    const isDragStartLine = dragHoverLine && hoveredSection && i === hoveredSection.startLine;
                    const isDragEndLine = dragHoverLine && hoveredSection && i === hoveredSection.endLine;

                    return (
                      <div
                        key={i}
                        data-json-mapper-line={i}
                        className={`flex w-max min-w-full items-stretch text-sm font-mono leading-6 transition-colors duration-75 relative hover:bg-accent/20 ${regionsOnLine.length ? 'cursor-grab active:cursor-grabbing' : ''} ${leftBorder}`}
                        style={{ height: LINE_HEIGHT }}
                        onDragOver={e => handleLineDragOver(e, i)}
                        onMouseDown={(e) => {
                          if (!region) return;
                          const t = e.target as HTMLElement;
                          if (t.closest('[data-json-mapper-resize]')) return;
                          if (t.closest('[data-json-mapper-badge-stack]')) return;
                          if (t.closest('[data-json-mapper-badge]')) return;
                          handleRegionPointerDown(e, region.regionId);
                        }}
                        onClick={() => {
                          if (skipNextRegionLineClick.current) {
                            skipNextRegionLineClick.current = false;
                            return;
                          }
                          if (region) setSelectedRegion(region.fieldTypeKey === selectedRegion ? null : region.fieldTypeKey);
                        }}
                      >
                        <div className="absolute inset-0 pointer-events-none z-0" aria-hidden>
                          {orderedRegionsOnLine.map((r, hIdx) => {
                            const rft = fieldTypes.find(f => f.key === r.fieldTypeKey);
                            const c = getColors(rft?.color || 'primary');
                            return (
                              <div
                                key={r.regionId}
                                className={`absolute inset-0 ${c.highlightLayer}`}
                                style={{ zIndex: hIdx + 1 }}
                              />
                            );
                          })}
                          {dragHoverLine && dragColors && (
                            <div
                              className={`absolute inset-y-0 left-0 right-0 border-x-2 ${dragColors.border} ${dragColors.highlightLayer} ${
                                isDragStartLine ? 'rounded-t-md border-t-2' : 'border-t-0'
                              } ${isDragEndLine ? 'rounded-b-md border-b-2' : 'border-b-0'}`}
                            />
                          )}
                        </div>

                        {orderedStartsOnLine.map((r, idx) => {
                          const rft = fieldTypes.find(f => f.key === r.fieldTypeKey);
                          const c = getColors(rft?.color || 'primary');
                          return (
                            <div
                              key={`${r.regionId}-resize-start`}
                              data-json-mapper-resize="start"
                              className={`absolute left-10 right-[13.5rem] h-[3px] cursor-ns-resize z-[12] ${c.solid} opacity-40 hover:opacity-80 transition-opacity`}
                              style={{ top: idx * 4 }}
                              onMouseDown={e => handleEdgeMouseDown(e, r.regionId, 'start')}
                            />
                          );
                        })}
                        {orderedEndsOnLine.map((r, idx) => {
                          const rft = fieldTypes.find(f => f.key === r.fieldTypeKey);
                          const c = getColors(rft?.color || 'primary');
                          return (
                            <div
                              key={`${r.regionId}-resize-end`}
                              data-json-mapper-resize="end"
                              className={`absolute left-10 right-[13.5rem] h-[3px] cursor-ns-resize z-[12] ${c.solid} opacity-40 hover:opacity-80 transition-opacity`}
                              style={{ bottom: idx * 4 }}
                              onMouseDown={e => handleEdgeMouseDown(e, r.regionId, 'end')}
                            />
                          );
                        })}

                        <span className="relative z-10 w-10 text-right pr-2 text-muted-foreground/40 select-none flex-shrink-0 border-r border-border/40 text-xs leading-6 tabular-nums">
                          {i + 1}
                        </span>
                        <div className="relative z-[18] flex min-h-0 flex-1 items-center">
                          <pre className="px-2 pr-24 whitespace-pre text-foreground/90 leading-6">
                            {retornoSearch.trim()
                              ? renderRetornoLineWithMatches(line, i, retornoMatches, retornoSafeIdx)
                              : line || ' '}
                          </pre>
                          {orderedStartsOnLine.length > 0 && (
                            <div
                              className="pointer-events-auto sticky right-1 z-[32] ml-auto flex max-w-[18rem] shrink-0 flex-row flex-nowrap items-center justify-end gap-1 rounded-l-full bg-gradient-to-l from-background via-background/95 to-transparent pl-3 pr-1 shadow-sm"
                              data-json-mapper-badge-stack
                            >
                              {orderedStartsOnLine.map((r) => {
                                const rft = fieldTypes.find(f => f.key === r.fieldTypeKey);
                                if (!rft) return null;
                                const c = getColors(rft.color);
                                const ord = typeKeysInOrder.indexOf(r.fieldTypeKey);
                                const stackZ = 34 + Math.max(0, ord);
                                return (
                                  <Badge
                                    key={r.regionId}
                                    data-json-mapper-badge
                                    variant="outline"
                                    className={`relative text-[10px] h-5 max-w-[8.5rem] shrink-0 cursor-pointer rounded-full border ${c.border} ${c.text} bg-background/95 font-medium gap-0.5 shadow-sm`}
                                    style={{ zIndex: stackZ }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedRegion(r.fieldTypeKey === selectedRegion ? null : r.fieldTypeKey);
                                    }}
                                  >
                                    {ord >= 0 ? (
                                      <span className="shrink-0 tabular-nums text-[9px] font-semibold opacity-80">
                                        {ord + 1}.
                                      </span>
                                    ) : null}
                                    <FieldIcon icon={rft.icon} className="w-2.5 h-2.5 shrink-0" />
                                    <span className="truncate">{rft.label}</span>
                                  </Badge>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
              <div className="flex min-h-9 shrink-0 w-full min-w-0 border-t border-border bg-muted/30 px-2 py-1.5">
                <div className="flex min-w-0 flex-1 items-center gap-0.5 rounded-md border border-input bg-background pl-2 pr-1 shadow-sm">
                  <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  <Input
                    placeholder="Buscar no JSON…"
                    value={retornoSearch}
                    onChange={(e) => setRetornoSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        goRetornoNext();
                      }
                    }}
                    className="h-8 min-w-0 flex-1 border-0 bg-transparent px-1.5 text-xs shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                    aria-label="Buscar no JSON de retorno"
                  />
                  {retornoSearch.trim() ? (
                    <>
                      <span className="shrink-0 tabular-nums text-[11px] text-muted-foreground" aria-live="polite">
                        {retornoMatches.length ? retornoSafeIdx + 1 : 0}/{retornoMatches.length}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        disabled={retornoMatches.length === 0}
                        aria-label="Ocorrência anterior"
                        onClick={goRetornoPrev}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        disabled={retornoMatches.length === 0}
                        aria-label="Próxima ocorrência"
                        onClick={goRetornoNext}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                        aria-label="Limpar busca"
                        onClick={() => {
                          setRetornoSearch('');
                          setRetornoActiveIdx(0);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* MIDDLE: Field Types catalog */}
        <ResizablePanel defaultSize={22} minSize={20} className="min-h-0 min-w-[17.5rem]">
          <div className="flex min-h-0 min-w-0 flex-col h-full">
            <div className="flex items-center px-3 h-9 border-b border-border bg-muted/40 shrink-0">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <Tag className="w-4 h-4" /> Tipos
              </span>
            </div>
            <ScrollArea className="flex-1 min-h-0 min-w-0">
              <DndContext sensors={typeReorderSensors} collisionDetection={closestCenter} onDragEnd={handleTypesPanelDragEnd}>
                <SortableContext items={sortedFieldTypesForPanel.map((t) => t.key)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2 py-1.5 pl-1.5 pr-4 pb-1.5">


                    {sortedFieldTypesForPanel.map((ft) => {
                      const colors = getColors(ft.color);
                      const regionsForType = displayRegions.filter(r => r.fieldTypeKey === ft.key);
                      const isMapped = regionsForType.length > 0;
                      const suggest = suggestionsByType[ft.key] ?? {
                        fields: [],
                        valuesByField: {},
                        allValues: [],
                        allPaths: [],
                        jsonFieldSelectGroups: [],
                      };
                      const filterConfig = openFilterTypeKey === ft.key
                        ? (draftTypeFilters[ft.key] ?? typeFilters[ft.key] ?? emptyTypeItemFilterConfig())
                        : (typeFilters[ft.key] ?? emptyTypeItemFilterConfig());
                      const activeCriteriaCount = countActiveTypeItemRules(filterConfig);
                      const criteriaSummary = summarizeTypeItemCriteria(filterConfig);

                      return (
                        <SortableTypeCardShell key={ft.key} typeKey={ft.key}>
                          {({ setNodeRef, style, dragAttributes, dragListeners, isDragging }) => (
                            <div
                              ref={setNodeRef}
                              style={style}
                              onClick={() => {
                                const next = ft.key === selectedRegion ? null : ft.key;
                                setSelectedRegion(next);
                                if (next) {
                                  const regs = displayRegions.filter((r) => r.fieldTypeKey === next);
                                  if (regs.length > 0) {
                                    const minS = Math.min(...regs.map((r) => r.startLine));
                                    const maxE = Math.max(...regs.map((r) => r.endLine));
                                    queueRetornoReveal(minS, maxE);
                                  }
                                }
                              }}
                              className={cn(
                                'rounded-md border text-sm transition-all',
                                isMapped
                                  ? `${colors.bg} ${colors.border} shadow-elevated cursor-pointer`
                                  : 'border-border/60 bg-background hover:border-primary/30 cursor-pointer',
                                selectedRegion === ft.key ? 'ring-1 ring-primary/40' : '',
                                draggedType?.key === ft.key ? 'opacity-70' : '',
                                isDragging ? 'z-10 ring-2 ring-primary/25' : '',
                              )}
                            >
                              <div className="flex items-center gap-1.5 px-2.5 pt-2 pb-1">
                                <button
                                  type="button"
                                  className="flex h-7 w-6 shrink-0 cursor-grab items-center justify-center rounded text-muted-foreground hover:bg-muted/80 active:cursor-grabbing"
                                  aria-label="Reordenar tipo (lista e preview JSON)"
                                  {...dragAttributes}
                                  {...dragListeners}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <GripVertical className="h-3.5 w-3.5 shrink-0 opacity-70" />
                                </button>
                                <div
                                  draggable
                                  onDragStart={(e) => {
                                    e.stopPropagation();
                                    setDraggedType(ft);
                                    e.dataTransfer.effectAllowed = 'copy';
                                  }}
                                  onDragEnd={() => {
                                    hoveredSectionRef.current = null;
                                    setDraggedType(null);
                                    setHoveredSection(null);
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  title="Arrastar para mapear no JSON de retorno"
                                  className={cn(
                                    'flex h-5 w-5 shrink-0 cursor-grab items-center justify-center rounded active:cursor-grabbing',
                                    colors.bg,
                                  )}
                                >
                                  <FieldIcon icon={ft.icon} className={`h-3.5 w-3.5 ${colors.text}`} />
                                </div>
                        <span className="min-w-0 flex-1 truncate font-medium text-foreground">{ft.label}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
                          onClick={(e) => {
                            e.stopPropagation();
                            openFilterDialog(ft.key);
                          }}
                          aria-label="Mapeamento de campos e critérios do tipo"
                        >
                          <Settings2 className="w-3.5 h-3.5" />
                        </Button>
                        {activeCriteriaCount > 0 && (
                          <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                            {activeCriteriaCount}
                          </Badge>
                        )}
                        <TypeCriteriaDialog
                          open={openFilterTypeKey === ft.key}
                          fieldType={ft}
                          draftConfig={draftTypeFilters[ft.key] ?? filterConfig}
                          suggestions={suggest}
                          jsonFieldOptions={suggest.allPaths.length > 0 ? suggest.allPaths : allJsonKeys}
                          jsonFieldSelectGroups={
                            suggest.allPaths.length > 0
                              ? suggest.jsonFieldSelectGroups
                              : [{ header: 'Retorno', items: allJsonKeys.map((k) => ({ value: k, label: k })) }]
                          }
                          mappedRegionCount={regionsForType.length}
                          onOpenChange={(open) => {
                            if (open) openFilterDialog(ft.key);
                            else closeFilterDialog(ft.key);
                          }}
                          onDraftChange={(nextConfig) => setDraftFiltersForType(ft.key, nextConfig)}
                          onSave={() => saveFilterDialog(ft.key)}
                        />
                        {isMapped && (
                          <button
                            type="button"
                            className="shrink-0 cursor-pointer p-0.5 text-muted-foreground hover:text-destructive"
                            onClick={e => {
                              e.stopPropagation();
                              removeAllRegionsForType(ft.key);
                            }}
                            aria-label="Remover tipo e trechos"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      {isMapped && (
                        <>
                          <div className="space-y-1 px-2.5 pb-1">
                            {regionsForType.map(r => (
                              <div
                                key={r.regionId}
                                className="cursor-pointer rounded border border-border/60 bg-background/70 px-2 py-1 hover:bg-muted/40"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (selectedRegion !== ft.key) setSelectedRegion(ft.key);
                                  queueRetornoReveal(r.startLine, r.endLine);
                                }}
                              >
                                <div className="flex items-center gap-1">
                                  <code
                                    className="min-w-0 flex-1 truncate text-[10px] font-mono text-muted-foreground"
                                    title="Referência (jsonPath) no retorno"
                                  >
                                    {r.path}
                                  </code>
                                  <span
                                    className="shrink-0 text-[10px] tabular-nums text-muted-foreground"
                                    title="Posição neste JSON de exemplo (muda se o texto mudar; o path é estável)"
                                  >
                                    L{r.startLine + 1}–{r.endLine + 1}
                                  </span>
                                  <button
                                    type="button"
                                    className="shrink-0 cursor-pointer p-0.5 text-muted-foreground hover:text-destructive"
                                    onClick={e => {
                                      e.stopPropagation();
                                      removeRegionById(r.regionId);
                                    }}
                                    aria-label="Remover trecho"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                                {criteriaSummary ? (
                                  <p className="mt-0.5 text-[9px] leading-snug text-primary/90">
                                    Filtro: {criteriaSummary}
                                  </p>
                                ) : null}
                              </div>
                            ))}
                          </div>
                          <div
                            role="button"
                            tabIndex={0}
                            onDragOver={e => {
                              if (draggedType?.key !== ft.key) return;
                              e.preventDefault();
                              e.stopPropagation();
                              e.dataTransfer.dropEffect = 'copy';
                            }}
                            onDrop={e => {
                              e.preventDefault();
                              e.stopPropagation();
                              const section = hoveredSectionRef.current ?? hoveredSection;
                              if (draggedType?.key !== ft.key || !section) return;
                              appendRegion(ft.key, section);
                              hoveredSectionRef.current = null;
                              setDraggedType(null);
                              setHoveredSection(null);
                            }}
                            onKeyDown={e => {
                              if (e.key === 'Enter' || e.key === ' ') e.preventDefault();
                            }}
                            className={`mx-2 mb-2 flex cursor-pointer items-center justify-center rounded-md border border-dashed py-2 text-xs transition-colors ${
                              draggedType?.key === ft.key
                                ? 'border-primary/50 bg-primary/10 text-primary'
                                : 'border-border/70 bg-muted/25 text-muted-foreground hover:border-primary/30 hover:bg-muted/40'
                            }`}
                          >
                            <Plus className="mr-1 h-3.5 w-3.5" />
                            add
                          </div>
                        </>
                      )}
                            </div>
                          )}
                        </SortableTypeCardShell>
                      );
                    })}
                  </div>
                </SortableContext>
              </DndContext>
            </ScrollArea>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* RIGHT: Preview — dados unificados; duplicatas marcadas nas linhas */}
        <ResizablePanel defaultSize={28} minSize={18} className="min-h-0 min-w-[12rem]">
          <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
            <div className="flex shrink-0 items-center justify-between gap-2 px-3 h-9 border-b border-border bg-muted/40">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2 min-w-0">
                <Eye className="w-4 h-4 shrink-0" /> Preview
              </span>
              <div className="flex shrink-0 items-center gap-2">
                {displayRegions.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {displayRegions.length} trecho{displayRegions.length > 1 ? 's' : ''} · {typeKeysInOrder.length} tipo
                    {typeKeysInOrder.length > 1 ? 's' : ''}
                  </span>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  aria-label="Copiar JSON do relatório sem duplicatas globais"
                  title="Copia o JSON de saída com deduplicação global (mesmos campos deduplicar entre tipos)"
                  onClick={() => void copyPreviewJson()}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
              {previewByType.length > 0 ? (
                <div className="flex min-h-0 min-w-0 flex-1 flex-col p-2">
                  <MappedJsonPreviewCanvas
                    jsonText={mappedPreviewPayload.jsonText}
                    lineMeta={mappedPreviewPayload.lineMeta}
                    highlightQuery={previewSearch}
                    highlightNavigation={
                      previewSearch.trim() && previewMatches.length > 0
                        ? { matches: previewMatches, activeIndex: previewSafeIdx }
                        : undefined
                    }
                    scrollBodyRef={previewScrollRef}
                    onPreviewSectionDocReorder={handlePreviewMappedTypeReorder}
                    onPreviewSectionStackSwap={handlePreviewStackSwap}
                  />
                </div>
              ) : (
                <div className="flex h-full min-h-0 flex-col items-center justify-center p-4 text-center">
                  <Move className="mb-2 h-6 w-6 text-muted-foreground/20" />
                  <p className="px-2 text-sm leading-relaxed text-muted-foreground">
                    Arraste um tipo para o JSON — o preview unifica os campos mapeados na configuração do tipo (chaves do
                    relatório), com a faixa colorida indicando a origem por tipo
                  </p>
                </div>
              )}
            </div>
            <div className="flex min-h-9 shrink-0 w-full min-w-0 border-t border-border bg-muted/30 px-2 py-1.5">
              <div className="flex min-w-0 flex-1 items-center gap-0.5 rounded-md border border-input bg-background pl-2 pr-1 shadow-sm">
                <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                <Input
                  placeholder="Buscar no preview…"
                  value={previewSearch}
                  onChange={(e) => setPreviewSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      goPreviewNext();
                    }
                  }}
                  className="h-8 min-w-0 flex-1 border-0 bg-transparent px-1.5 text-xs shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                  aria-label="Buscar no preview"
                />
                {previewSearch.trim() ? (
                  <>
                    <span className="shrink-0 tabular-nums text-[11px] text-muted-foreground" aria-live="polite">
                      {previewMatches.length ? previewSafeIdx + 1 : 0}/{previewMatches.length}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      disabled={previewMatches.length === 0}
                      aria-label="Ocorrência anterior"
                      onClick={goPreviewPrev}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      disabled={previewMatches.length === 0}
                      aria-label="Próxima ocorrência"
                      onClick={goPreviewNext}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                      aria-label="Limpar busca"
                      onClick={() => {
                        setPreviewSearch('');
                        setPreviewActiveIdx(0);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
