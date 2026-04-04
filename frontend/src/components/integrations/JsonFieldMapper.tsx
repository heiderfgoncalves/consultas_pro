import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  Tag, GripVertical, Pencil, Check, X, ChevronUp, ChevronDown,
  Move, Code2, Eye, Trash2, User, AlertTriangle, Gauge, FileWarning,
  Building2, FileX, Users, DollarSign, TrendingUp, Award, Hash,
  Filter, Copy, CheckSquare, Plus, List,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import type { ConsultationFieldType, FieldMapping, MappingItemFilter, MappingItemFilterOp } from '@/types/integrations';
import { formatDeepFilteredValueAtPath, getValueAtJsonPath } from '@/lib/providerResponseMapping';

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

interface JsonFieldMapperProps {
  json: string;
  onJsonChange: (json: string) => void;
  fieldTypes: ConsultationFieldType[];
  mappings: FieldMapping[];
  onMappingsChange: (mappings: FieldMapping[]) => void;
  typeFilters?: Record<string, MappingItemFilter[]>;
  onTypeFiltersChange?: (next: Record<string, MappingItemFilter[]>) => void;
  /** Título da coluna esquerda (JSON de retorno do provedor) */
  jsonColumnTitle?: string;
}

function newRegionId(): string {
  return `r_${Math.random().toString(36).slice(2, 12)}`;
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

function resolveRegionBounds(
  sections: JsonSection[],
  mapping: Pick<FieldMapping, 'jsonPath' | 'uiStartLine' | 'uiEndLine'>,
): { startLine: number; endLine: number } | null {
  if (
    typeof mapping.uiStartLine === 'number'
    && typeof mapping.uiEndLine === 'number'
    && mapping.uiEndLine >= mapping.uiStartLine
  ) {
    return { startLine: mapping.uiStartLine, endLine: mapping.uiEndLine };
  }
  const section = resolveSectionForJsonPath(sections, mapping.jsonPath);
  if (!section) return null;
  return { startLine: section.startLine, endLine: section.endLine };
}

const colorMap: Record<string, {
  bg: string; border: string; text: string; highlightLayer: string; solid: string;
}> = {
  primary: {
    bg: 'bg-primary/8', border: 'border-primary/30', text: 'text-primary',
    highlightLayer: 'bg-primary/[0.11]', solid: 'bg-primary',
  },
  destructive: {
    bg: 'bg-destructive/8', border: 'border-destructive/30', text: 'text-destructive',
    highlightLayer: 'bg-destructive/[0.11]', solid: 'bg-destructive',
  },
  warning: {
    bg: 'bg-amber-500/8', border: 'border-amber-500/30', text: 'text-amber-500',
    highlightLayer: 'bg-amber-500/[0.11]', solid: 'bg-amber-500',
  },
  success: {
    bg: 'bg-emerald-500/8', border: 'border-emerald-500/30', text: 'text-emerald-500',
    highlightLayer: 'bg-emerald-500/[0.11]', solid: 'bg-emerald-500',
  },
  info: {
    bg: 'bg-sky-500/8', border: 'border-sky-500/30', text: 'text-sky-500',
    highlightLayer: 'bg-sky-500/[0.11]', solid: 'bg-sky-500',
  },
};

function getColors(color: string) {
  return colorMap[color] || colorMap.primary;
}

function cloneFilters(filters: MappingItemFilter[] | undefined): MappingItemFilter[] {
  return (filters ?? []).map((filter) => ({ ...filter }));
}

function getMappedValuePreview(
  rootJson: string,
  jsonPath: string,
  filters: MappingItemFilter[] | undefined,
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

const LINE_HEIGHT = 24; // px por linha (alinhado a text-sm / leading-6)
const REGION_DRAG_THRESHOLD_PX = 5; // evita confundir clique de seleção com arraste

const FILTER_OPS: { value: MappingItemFilterOp; label: string }[] = [
  { value: 'eq', label: 'igual a' },
  { value: 'contains', label: 'contém' },
  { value: 'startsWith', label: 'começa com' },
  { value: 'endsWith', label: 'termina com' },
  { value: 'regex', label: 'regex' },
];

const SENTINEL_EMPTY = '__empty__';
const SENTINEL_FREE_FIELD = '__add_campo_livre__';
const SENTINEL_FREE_VALUE = '__add_valor_livre__';

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
  const relStart = body.search(/[\[{]/);
  if (relStart < 0) return null;
  const balanced = extractBalancedJsonFragment(body, relStart);
  if (!balanced) return null;
  try {
    return JSON.parse(balanced);
  } catch {
    return null;
  }
}

/** Coleta chaves e valores dos trechos mapeados: valor no `jsonPath` + JSON literal das linhas selecionadas. */
function collectFilterSuggestionsForMappedRegions(
  jsonStr: string,
  lines: string[],
  regions: { path: string; startLine: number; endLine: number }[],
): {
  fields: string[];
  valuesByField: Record<string, string[]>;
  allValues: string[];
} {
  const fieldSet = new Set<string>();
  const valueMap = new Map<string, Set<string>>();

  const scanObject = (obj: Record<string, unknown>) => {
    for (const [k, val] of Object.entries(obj)) {
      fieldSet.add(k);
      if (!valueMap.has(k)) valueMap.set(k, new Set());
      const s = cellToSuggestionString(val);
      if (s) valueMap.get(k)!.add(s);
    }
  };

  const scanArrayOfObjects = (arr: unknown[]) => {
    for (const el of arr) {
      if (!el || typeof el !== 'object' || Array.isArray(el)) continue;
      scanObject(el as Record<string, unknown>);
    }
  };

  const deepCollect = (value: unknown) => {
    if (value == null) return;
    if (Array.isArray(value)) {
      scanArrayOfObjects(value);
      for (const el of value) deepCollect(el);
    } else if (typeof value === 'object') {
      scanObject(value as Record<string, unknown>);
      for (const v of Object.values(value as Record<string, unknown>)) deepCollect(v);
    }
  };

  let root: unknown;
  try {
    root = JSON.parse(jsonStr) as unknown;
  } catch {
    return { fields: [], valuesByField: {}, allValues: [] };
  }

  for (const r of regions) {
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

  return {
    fields: [...fieldSet].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    valuesByField,
    allValues,
  };
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
    return mappings.map((m, i) => {
      const bounds = resolveRegionBounds(sections, m);
      return {
        regionId: `${m.fieldTypeKey}::${m.jsonPath}::${i}`,
        fieldTypeKey: m.fieldTypeKey,
        startLine: bounds?.startLine ?? 0,
        endLine: bounds?.endLine ?? 0,
        path: m.jsonPath,
      };
    }).filter(r => r.endLine > 0);
  });
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [dedupEnabled, setDedupEnabled] = useState(false);
  const [dedupFields, setDedupFields] = useState<string[]>([]);
  const [openFilterTypeKey, setOpenFilterTypeKey] = useState<string | null>(null);
  const [draftTypeFilters, setDraftTypeFilters] = useState<Record<string, MappingItemFilter[]>>({});
  const jsonContainerRef = useRef<HTMLDivElement>(null);
  const skipNextRegionLineClick = useRef(false);
  const prevMappingsSigRef = useRef<string | null>(null);
  /** Atualizado em todo dragover; o drop usa isto para não perder a seção (state/React 18 ou dragleave). */
  const hoveredSectionRef = useRef<JsonSection | null>(null);

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

  /** Por tipo: modo lista vs texto livre para campo/valor em cada critério (índice alinhado a `rules`). */
  const [criterionUiByType, setCriterionUiByType] = useState<
    Record<string, { fieldList: boolean; valueList: boolean }[]>
  >({});

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

  const { lines, sections } = useMemo(() => parseJsonSections(json), [json]);
  const allJsonKeys = useMemo(() => extractJsonKeys(json), [json]);

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
    const { sections: nextSections } = parseJsonSections(json);
    setMappedRegions(prev => {
      if (prevMappingsSigRef.current !== mappingsSig) {
        prevMappingsSigRef.current = mappingsSig;
        return mappings
          .map((m, i) => {
            const bounds = resolveRegionBounds(nextSections, m);
            return {
              regionId: `${m.fieldTypeKey}::${m.jsonPath}::${i}`,
              fieldTypeKey: m.fieldTypeKey,
              startLine: bounds?.startLine ?? 0,
              endLine: bounds?.endLine ?? 0,
              path: m.jsonPath,
            };
          })
          .filter(r => r.endLine > 0);
      }
      return prev
        .map(r => {
          const section = nextSections.find(s => s.path === r.path);
          if (!section) return { ...r, startLine: 0, endLine: 0 };
          return { ...r, startLine: section.startLine, endLine: section.endLine };
        })
        .filter(r => r.endLine > 0);
    });
  }, [json, mappingsSig, mappings]);

  useEffect(() => {
    setCriterionUiByType(prev => {
      let changed = false;
      const next = { ...prev };
      for (const ft of fieldTypes) {
        const len = typeFilters[ft.key]?.length ?? 0;
        const cur = next[ft.key] ?? [];
        if (cur.length === len) continue;
        changed = true;
        const padded = [...cur];
        while (padded.length < len) padded.push({ fieldList: true, valueList: true });
        padded.length = len;
        next[ft.key] = padded;
      }
      return changed ? next : prev;
    });
  }, [typeFilters, fieldTypes]);

  const setFiltersForType = useCallback(
    (fieldTypeKey: string, nextRules: MappingItemFilter[]) => {
      onTypeFiltersChange({ ...typeFilters, [fieldTypeKey]: nextRules });
    },
    [typeFilters, onTypeFiltersChange],
  );

  const setDraftFiltersForType = useCallback(
    (fieldTypeKey: string, nextRules: MappingItemFilter[]) => {
      setDraftTypeFilters((prev) => ({ ...prev, [fieldTypeKey]: nextRules }));
    },
    [],
  );

  const openFilterDialog = useCallback(
    (fieldTypeKey: string) => {
      const nextRules = cloneFilters(typeFilters[fieldTypeKey]);
      setDraftTypeFilters((prev) => ({ ...prev, [fieldTypeKey]: nextRules }));
      setCriterionUiByType((prev) => {
        const cur = [...(prev[fieldTypeKey] ?? [])];
        while (cur.length < nextRules.length) {
          cur.push({ fieldList: true, valueList: true });
        }
        cur.length = nextRules.length;
        return { ...prev, [fieldTypeKey]: cur };
      });
      setOpenFilterTypeKey(fieldTypeKey);
    },
    [typeFilters],
  );

  const closeFilterDialog = useCallback((fieldTypeKey?: string) => {
    const key = fieldTypeKey ?? openFilterTypeKey;
    if (!key) return;
    setDraftTypeFilters((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setOpenFilterTypeKey((current) => (current === key ? null : current));
  }, [openFilterTypeKey]);

  const saveFilterDialog = useCallback(
    (fieldTypeKey: string) => {
      setFiltersForType(fieldTypeKey, cloneFilters(draftTypeFilters[fieldTypeKey]));
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
      setFiltersForType(removed.fieldTypeKey, []);
    }
    syncMappings(newRegions);
  };

  const removeAllRegionsForType = (fieldTypeKey: string) => {
    const newRegions = mappedRegions.filter(r => r.fieldTypeKey !== fieldTypeKey);
    setMappedRegions(newRegions);
    if (selectedRegion === fieldTypeKey) setSelectedRegion(null);
    syncMappings(newRegions);
    setFiltersForType(fieldTypeKey, []);
  };

  const getRegionsForLine = (lineIdx: number) =>
    mappedRegions.filter(r => lineIdx >= r.startLine && lineIdx <= r.endLine);

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
      setMappedRegions([]);
      onMappingsChange([]);
      onTypeFiltersChange({});
    } catch {
      // invalid JSON
    }
  };

  const lineSlicePreview = (region: MappedRegion): string =>
    lines.slice(region.startLine, region.endLine + 1).join('\n');

  const typeKeysInOrder = useMemo(() => {
    const seen = new Set<string>();
    const order: string[] = [];
    for (const r of mappedRegions) {
      if (!seen.has(r.fieldTypeKey)) {
        seen.add(r.fieldTypeKey);
        order.push(r.fieldTypeKey);
      }
    }
    return order;
  }, [mappedRegions]);

  const suggestionsByType = useMemo(() => {
    const keys = [...new Set(mappedRegions.map(r => r.fieldTypeKey))];
    const out: Record<string, ReturnType<typeof collectFilterSuggestionsForMappedRegions>> = {};
    for (const k of keys) {
      const regs = mappedRegions.filter(r => r.fieldTypeKey === k);
      out[k] = collectFilterSuggestionsForMappedRegions(json, lines, regs);
    }
    return out;
  }, [json, mappedRegions, lines]);

  const previewByType = useMemo(() => {
    return typeKeysInOrder.map(fieldTypeKey => {
      const ft = fieldTypes.find(f => f.key === fieldTypeKey);
      if (!ft) return null;
      const regions = mappedRegions.filter(r => r.fieldTypeKey === fieldTypeKey);
      const filters = openFilterTypeKey === fieldTypeKey
        ? (draftTypeFilters[fieldTypeKey] ?? typeFilters[fieldTypeKey])
        : typeFilters[fieldTypeKey];
      const parts = regions.map(region => {
        const fallback = lineSlicePreview(region);
        const preview = getMappedValuePreview(json, region.path, filters, fallback);
        return { regionId: region.regionId, path: region.path, text: preview.text, hasData: preview.hasData };
      }).filter(part => !filters?.length || part.hasData);
      if (filters?.length && parts.length === 0) return null;
      return { fieldTypeKey, ft, parts, filters: filters ?? [] };
    }).filter(Boolean) as {
      fieldTypeKey: string;
      ft: ConsultationFieldType;
      parts: { regionId: string; path: string; text: string; hasData: boolean }[];
      filters: MappingItemFilter[];
    }[];
  }, [typeKeysInOrder, mappedRegions, fieldTypes, lines, json, typeFilters, openFilterTypeKey, draftTypeFilters]);

  return (
    <div className="h-[460px] border border-border rounded-md overflow-hidden bg-card"
      style={{ cursor: edgeDrag ? 'ns-resize' : regionDrag || regionDragPending ? 'grabbing' : undefined }}>
      <ResizablePanelGroup direction="horizontal">
        {/* LEFT: JSON with line numbers */}
        <ResizablePanel defaultSize={50} minSize={25} className="min-h-0 min-w-0">
          <div className="flex min-h-0 min-w-0 flex-col h-full">
            <div className="flex items-center justify-between px-3 h-9 border-b border-border bg-muted/40">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2 min-w-0">
                <Code2 className="w-4 h-4 shrink-0" /> <span className="truncate">{jsonColumnTitle}</span>
              </span>
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
                  <button onClick={() => setIsEditing(false)} className="text-xs text-muted-foreground hover:text-foreground">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {isEditing ? (
              <textarea
                value={editBuffer}
                onChange={e => setEditBuffer(e.target.value)}
                className="flex-1 min-h-0 min-w-0 p-3 text-sm font-mono bg-background text-foreground resize-none focus:outline-none leading-6 overflow-x-auto overflow-y-auto [scrollbar-width:thin]"
                spellCheck={false}
              />
            ) : (
              <div className="min-h-0 min-w-0 flex-1 overflow-x-auto overflow-y-auto [scrollbar-width:thin] overscroll-x-contain">
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
                    const startsOnLine = mappedRegions.filter(r => r.startLine === i);
                    const endsOnLine = mappedRegions.filter(r => r.endLine === i);
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
                          {regionsOnLine.map(r => {
                            const rft = fieldTypes.find(f => f.key === r.fieldTypeKey);
                            const c = getColors(rft?.color || 'primary');
                            return (
                              <div
                                key={r.regionId}
                                className={`absolute inset-0 ${c.highlightLayer}`}
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

                        {startsOnLine.map((r, idx) => {
                          const rft = fieldTypes.find(f => f.key === r.fieldTypeKey);
                          const c = getColors(rft?.color || 'primary');
                          return (
                            <div
                              key={`${r.regionId}-resize-start`}
                              data-json-mapper-resize="start"
                              className={`absolute left-10 right-2 h-[3px] cursor-ns-resize z-20 ${c.solid} opacity-40 hover:opacity-80 transition-opacity`}
                              style={{ top: idx * 4 }}
                              onMouseDown={e => handleEdgeMouseDown(e, r.regionId, 'start')}
                            />
                          );
                        })}
                        {endsOnLine.map((r, idx) => {
                          const rft = fieldTypes.find(f => f.key === r.fieldTypeKey);
                          const c = getColors(rft?.color || 'primary');
                          return (
                            <div
                              key={`${r.regionId}-resize-end`}
                              data-json-mapper-resize="end"
                              className={`absolute left-10 right-2 h-[3px] cursor-ns-resize z-20 ${c.solid} opacity-40 hover:opacity-80 transition-opacity`}
                              style={{ bottom: idx * 4 }}
                              onMouseDown={e => handleEdgeMouseDown(e, r.regionId, 'end')}
                            />
                          );
                        })}

                        <span className="relative z-10 w-10 text-right pr-2 text-muted-foreground/40 select-none flex-shrink-0 border-r border-border/40 text-xs leading-6 tabular-nums">
                          {i + 1}
                        </span>
                        <div className="relative z-10 flex min-h-0 flex-1 items-center">
                          <pre className="px-2 pr-24 whitespace-pre text-foreground/90 leading-6">
                            {line || ' '}
                          </pre>
                          {startsOnLine.length > 0 && (
                            <div
                              className="pointer-events-auto sticky right-1 ml-auto flex max-w-[18rem] shrink-0 flex-row flex-nowrap items-center justify-end gap-1 rounded-l-full bg-gradient-to-l from-background via-background/95 to-transparent pl-3 pr-1"
                              data-json-mapper-badge-stack
                            >
                              {startsOnLine.map(r => {
                                const rft = fieldTypes.find(f => f.key === r.fieldTypeKey);
                                if (!rft) return null;
                                const c = getColors(rft.color);
                                return (
                                  <Badge
                                    key={r.regionId}
                                    data-json-mapper-badge
                                    variant="outline"
                                    className={`text-[10px] h-5 max-w-[8.5rem] shrink-0 cursor-pointer rounded-full border ${c.border} ${c.text} bg-background/95 font-medium gap-0.5 shadow-sm`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedRegion(r.fieldTypeKey === selectedRegion ? null : r.fieldTypeKey);
                                    }}
                                  >
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
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* MIDDLE: Field Types catalog */}
        <ResizablePanel defaultSize={22} minSize={15}>
          <div className="flex flex-col h-full">
            <div className="flex items-center px-3 h-9 border-b border-border bg-muted/40">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <Tag className="w-4 h-4" /> Tipos
              </span>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-1.5 space-y-2">
                {fieldTypes.map(ft => {
                  const colors = getColors(ft.color);
                  const regionsForType = mappedRegions.filter(r => r.fieldTypeKey === ft.key);
                  const isMapped = regionsForType.length > 0;
                  const rules = openFilterTypeKey === ft.key
                    ? (draftTypeFilters[ft.key] ?? [])
                    : (typeFilters[ft.key] ?? []);
                  const suggest = suggestionsByType[ft.key] ?? { fields: [], valuesByField: {}, allValues: [] };
                  const uiModes = criterionUiByType[ft.key] ?? [];

                  return (
                    <div
                      key={ft.key}
                      draggable
                      onDragStart={e => {
                        setDraggedType(ft);
                        e.dataTransfer.effectAllowed = 'copy';
                      }}
                      onDragEnd={() => {
                        hoveredSectionRef.current = null;
                        setDraggedType(null);
                        setHoveredSection(null);
                      }}
                      onClick={() => {
                        if (isMapped) setSelectedRegion(ft.key === selectedRegion ? null : ft.key);
                      }}
                      className={`
                        rounded-md border text-sm transition-all
                        ${isMapped
                          ? `${colors.bg} ${colors.border} shadow-elevated cursor-pointer`
                          : 'border-border/60 bg-background hover:border-primary/30 cursor-grab active:cursor-grabbing'
                        }
                        ${selectedRegion === ft.key ? 'ring-1 ring-primary/40' : ''}
                        ${draggedType?.key === ft.key ? 'opacity-70' : ''}
                      `}
                    >
                      <div className="flex items-center gap-1.5 px-2.5 pt-2 pb-1">
                        <GripVertical className="w-3.5 h-3.5 shrink-0 text-muted-foreground/40" />
                        <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded ${colors.bg}`}>
                          <FieldIcon icon={ft.icon} className={`w-3.5 h-3.5 ${colors.text}`} />
                        </div>
                        <span className="min-w-0 flex-1 truncate font-medium text-foreground">{ft.label}</span>
                        {isMapped && (
                          <Dialog
                            open={openFilterTypeKey === ft.key}
                            onOpenChange={(open) => {
                              if (open) {
                                openFilterDialog(ft.key);
                              } else {
                                closeFilterDialog(ft.key);
                              }
                            }}
                          >
                            <DialogTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
                                onClick={e => {
                                  e.stopPropagation();
                                  openFilterDialog(ft.key);
                                }}
                                aria-label="Critérios de filtro do tipo"
                              >
                                <Filter className="w-3.5 h-3.5" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent
                              className="flex max-h-[min(90vh,880px)] w-[min(36rem,calc(100vw-1.5rem))] max-w-[min(36rem,95vw)] flex-col gap-0 overflow-hidden border bg-background p-0 sm:max-w-[min(36rem,95vw)]"
                              onClick={e => e.stopPropagation()}
                            >
                              <DialogHeader className="space-y-2 border-b border-border px-5 py-4 text-left">
                                <DialogTitle className="text-base">Critérios do tipo</DialogTitle>
                                <DialogDescription className="text-xs leading-relaxed">
                                  Valem para todos os trechos JSON deste tipo. Em arrays de objetos, os critérios combinam com AND.
                                  Campos e valores são inferidos do trecho grifado (linhas) e do path JSON, sem duplicar entradas.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-5 py-4">
                                {rules.length === 0 && (
                                  <p className="text-xs italic text-muted-foreground">Nenhum critério</p>
                                )}
                                {rules.map((rule, idx) => {
                                  const uiRow = uiModes[idx] ?? { fieldList: true, valueList: true };
                                  const valueOpts = rule.field.trim()
                                    ? (suggest.valuesByField[rule.field] ?? [])
                                    : suggest.allValues;
                                  const showFieldSelect =
                                    uiRow.fieldList &&
                                    (suggest.fields.length > 0 || rule.field === '');
                                  const showValueSelect =
                                    uiRow.valueList &&
                                    (valueOpts.length > 0 || rule.value === '');

                                  const patchRule = (patch: Partial<MappingItemFilter>) => {
                                    const base = draftTypeFilters[ft.key] ?? [];
                                    setDraftFiltersForType(
                                      ft.key,
                                      base.map((x, i) => (i === idx ? { ...x, ...patch } : x)),
                                    );
                                  };

                                  const setMode = (patch: Partial<{ fieldList: boolean; valueList: boolean }>) => {
                                    setCriterionUiByType(prev => {
                                      const cur = [...(prev[ft.key] ?? [])];
                                      while (cur.length < rules.length) {
                                        cur.push({ fieldList: true, valueList: true });
                                      }
                                      const row = cur[idx] ?? { fieldList: true, valueList: true };
                                      cur[idx] = { ...row, ...patch };
                                      return { ...prev, [ft.key]: cur };
                                    });
                                  };

                                  return (
                                    <div
                                      key={idx}
                                      className="space-y-2 rounded-lg border border-border/80 bg-muted/20 p-3"
                                    >
                                      <div className="flex flex-wrap items-end gap-2">
                                        {showFieldSelect ? (
                                          <Select
                                            value={
                                              rule.field && suggest.fields.includes(rule.field)
                                                ? rule.field
                                                : SENTINEL_EMPTY
                                            }
                                            onValueChange={v => {
                                              if (v === SENTINEL_FREE_FIELD) {
                                                setMode({ fieldList: false });
                                                return;
                                              }
                                              if (v === SENTINEL_EMPTY) {
                                                patchRule({ field: '' });
                                                return;
                                              }
                                              patchRule({ field: v });
                                            }}
                                          >
                                            <SelectTrigger className="h-9 min-w-[7rem] max-w-[11rem] flex-1 bg-background text-xs">
                                              <SelectValue placeholder="Campo" />
                                            </SelectTrigger>
                                            <SelectContent className="max-h-60 z-[200]">
                                              <SelectItem value={SENTINEL_EMPTY} className="text-xs text-muted-foreground">
                                                Selecione o campo…
                                              </SelectItem>
                                              {suggest.fields.length === 0 && (
                                                <div className="px-2 py-1.5 text-[10px] leading-snug text-muted-foreground">
                                                  Nenhum campo detectado nos trechos — use texto livre ou mapeie um array de objetos.
                                                </div>
                                              )}
                                              {suggest.fields.map(f => (
                                                <SelectItem key={f} value={f} className="font-mono text-xs">
                                                  {f}
                                                </SelectItem>
                                              ))}
                                              <SelectItem
                                                value={SENTINEL_FREE_FIELD}
                                                className="text-xs font-medium text-primary"
                                              >
                                                + Texto livre (add campo)
                                              </SelectItem>
                                            </SelectContent>
                                          </Select>
                                        ) : (
                                          <div className="flex min-w-0 flex-1 items-center gap-1.5">
                                            <Input
                                              value={rule.field}
                                              onChange={e => patchRule({ field: e.target.value })}
                                              placeholder="Campo (livre)"
                                              className="h-9 min-w-0 flex-1 bg-background font-mono text-xs"
                                            />
                                            <Button
                                              type="button"
                                              variant="outline"
                                              size="icon"
                                              className="h-9 w-9 shrink-0 cursor-pointer"
                                              title={
                                                suggest.fields.length > 0
                                                  ? 'Abrir lista de campos'
                                                  : 'Abrir seletor (lista vazia até haver objeto/array no trecho)'
                                              }
                                              aria-label="Abrir lista de campos"
                                              onClick={() => setMode({ fieldList: true })}
                                            >
                                              <List className="h-4 w-4" />
                                            </Button>
                                          </div>
                                        )}

                                        <Select
                                          value={rule.op}
                                          onValueChange={v =>
                                            patchRule({ op: v as MappingItemFilterOp })
                                          }
                                        >
                                          <SelectTrigger className="h-9 w-[9.5rem] shrink-0 bg-background text-xs">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {FILTER_OPS.map(op => (
                                              <SelectItem key={op.value} value={op.value} className="text-xs">
                                                {op.label}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>

                                        {showValueSelect ? (
                                          <Select
                                            value={
                                              rule.value && valueOpts.includes(rule.value)
                                                ? rule.value
                                                : SENTINEL_EMPTY
                                            }
                                            onValueChange={v => {
                                              if (v === SENTINEL_FREE_VALUE) {
                                                setMode({ valueList: false });
                                                return;
                                              }
                                              if (v === SENTINEL_EMPTY) {
                                                patchRule({ value: '' });
                                                return;
                                              }
                                              patchRule({ value: v });
                                            }}
                                          >
                                            <SelectTrigger className="h-9 min-w-[7rem] max-w-[11rem] flex-1 bg-background text-xs">
                                              <SelectValue placeholder="Valor" />
                                            </SelectTrigger>
                                            <SelectContent className="max-h-60 z-[200]">
                                              <SelectItem value={SENTINEL_EMPTY} className="text-xs text-muted-foreground">
                                                Selecione o valor…
                                              </SelectItem>
                                              {valueOpts.length === 0 && (
                                                <div className="px-2 py-1.5 text-[10px] leading-snug text-muted-foreground">
                                                  {rule.field.trim()
                                                    ? 'Sem valores amostrados para este campo — texto livre.'
                                                    : 'Escolha um campo primeiro ou use texto livre.'}
                                                </div>
                                              )}
                                              {valueOpts.slice(0, 200).map(v => (
                                                <SelectItem key={v} value={v} className="text-xs">
                                                  <span className="line-clamp-2">{v}</span>
                                                </SelectItem>
                                              ))}
                                              {valueOpts.length > 200 && (
                                                <p className="px-2 py-1 text-[10px] text-muted-foreground">
                                                  Lista limitada a 200 — use texto livre para outros.
                                                </p>
                                              )}
                                              <SelectItem
                                                value={SENTINEL_FREE_VALUE}
                                                className="text-xs font-medium text-primary"
                                              >
                                                + Texto livre (add valor)
                                              </SelectItem>
                                            </SelectContent>
                                          </Select>
                                        ) : (
                                          <div className="flex min-w-0 flex-1 items-center gap-1.5">
                                            <Input
                                              value={rule.value}
                                              onChange={e => patchRule({ value: e.target.value })}
                                              placeholder="Valor (livre)"
                                              className="h-9 min-w-0 flex-1 bg-background text-xs"
                                            />
                                            <Button
                                              type="button"
                                              variant="outline"
                                              size="icon"
                                              className="h-9 w-9 shrink-0 cursor-pointer"
                                              title={
                                                valueOpts.length > 0
                                                  ? 'Abrir lista de valores'
                                                  : 'Abrir seletor (escolha um campo ou mapeie trecho com dados)'
                                              }
                                              aria-label="Abrir lista de valores"
                                              onClick={() => setMode({ valueList: true })}
                                            >
                                              <List className="h-4 w-4" />
                                            </Button>
                                          </div>
                                        )}

                                        <button
                                          type="button"
                                          className="shrink-0 cursor-pointer p-1.5 text-muted-foreground hover:text-destructive"
                                          aria-label="Remover critério"
                                          onClick={() => {
                                            const base = draftTypeFilters[ft.key] ?? [];
                                            setDraftFiltersForType(ft.key, base.filter((_, i) => i !== idx));
                                          }}
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                              <div className="border-t border-border px-5 py-3">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-9 w-full cursor-pointer text-xs"
                                  onClick={() => {
                                    const base = draftTypeFilters[ft.key] ?? [];
                                    setDraftFiltersForType(ft.key, [...base, { field: '', op: 'eq', value: '' }]);
                                  }}
                                >
                                  <Plus className="mr-1 h-3 w-3" />
                                  Adicionar critério
                                </Button>
                              </div>
                              <DialogFooter className="border-t border-border px-5 py-3">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  className="h-9"
                                  onClick={() => closeFilterDialog(ft.key)}
                                >
                                  Cancelar
                                </Button>
                                <Button
                                  type="button"
                                  className="h-9"
                                  onClick={() => saveFilterDialog(ft.key)}
                                >
                                  Salvar
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        )}
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
                                className="flex items-center gap-1 rounded border border-border/60 bg-background/70 px-2 py-1"
                              >
                                <code className="min-w-0 flex-1 truncate text-[10px] font-mono text-muted-foreground">
                                  {r.path}
                                </code>
                                <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
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
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* RIGHT: Preview — all data summary + dedup */}
        <ResizablePanel defaultSize={28} minSize={15}>
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between px-3 h-9 border-b border-border bg-muted/40">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <Eye className="w-4 h-4" /> Preview
              </span>
              {mappedRegions.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {mappedRegions.length} trecho{mappedRegions.length > 1 ? 's' : ''} · {typeKeysInOrder.length} tipo
                  {typeKeysInOrder.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <ScrollArea className="flex-1">
              {previewByType.length > 0 ? (
                <div className="space-y-2 p-2">
                  <div className="rounded border border-border bg-muted/20 p-2 space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <Checkbox
                        id="dedup"
                        checked={dedupEnabled}
                        onCheckedChange={v => setDedupEnabled(!!v)}
                        className="w-4 h-4"
                      />
                      <label htmlFor="dedup" className="text-sm font-medium text-foreground cursor-pointer flex items-center gap-1.5">
                        <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                        Remover duplicidade
                      </label>
                    </div>
                    {dedupEnabled && (
                      <div className="space-y-1.5 pl-1">
                        <p className="text-xs text-muted-foreground">Campos para identificar duplicatas:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {allJsonKeys.slice(0, 20).map(key => (
                            <button
                              key={key}
                              onClick={() => setDedupFields(prev =>
                                prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
                              )}
                              className={`text-xs font-mono px-2 py-1 rounded-md border transition-all ${
                                dedupFields.includes(key)
                                  ? 'bg-primary/15 border-primary/40 text-primary'
                                  : 'border-border text-muted-foreground hover:border-primary/20'
                              }`}
                            >
                              {dedupFields.includes(key) && <CheckSquare className="w-3 h-3 inline mr-0.5" />}
                              {key.split('.').pop()}
                            </button>
                          ))}
                        </div>
                        {dedupFields.length > 0 && (
                          <p className="text-xs text-primary font-mono break-all">
                            Chaves: {dedupFields.join(', ')}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <p className="px-0.5 text-[11px] text-muted-foreground">
                    Somente leitura — edite trechos e critérios na coluna Tipos.
                  </p>

                  {previewByType.map(({ fieldTypeKey, ft, parts, filters }) => {
                    const colors = getColors(ft.color);
                    const isSelected = selectedRegion === ft.key;

                    return (
                      <div
                        key={fieldTypeKey}
                        className={`overflow-hidden rounded-md border transition-all ${
                          isSelected ? `${colors.border} border-2` : 'border-border'
                        }`}
                        onClick={() => setSelectedRegion(ft.key === selectedRegion ? null : ft.key)}
                      >
                        <div className={`flex cursor-pointer items-center gap-2 px-2.5 py-2 ${colors.bg}`}>
                          <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded ${colors.bg}`}>
                            <FieldIcon icon={ft.icon} className={`h-3.5 w-3.5 ${colors.text}`} />
                          </div>
                          <span className={`min-w-0 flex-1 truncate text-sm font-semibold ${colors.text}`}>
                            {ft.label}
                          </span>
                          {filters.length > 0 && (
                            <Badge variant="secondary" className="h-5 shrink-0 px-1.5 py-0 text-[10px] font-normal">
                              {filters.length} critério{filters.length > 1 ? 's' : ''}
                            </Badge>
                          )}
                        </div>
                        <div className="border-t border-border bg-background/40">
                          {parts.map(p => (
                            <div key={p.regionId} className="border-b border-border/60 last:border-b-0">
                              <div className="px-2 py-1">
                                <code className="block truncate text-[10px] font-mono text-muted-foreground">
                                  {p.path}
                                </code>
                              </div>
                              <pre className="max-h-28 overflow-auto whitespace-pre border-t border-border/40 bg-background p-2 font-mono text-[11px] leading-relaxed text-foreground/85 [scrollbar-width:thin]">
                                {p.text}
                              </pre>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                  <Move className="w-6 h-6 text-muted-foreground/20 mb-2" />
                  <p className="text-sm text-muted-foreground leading-relaxed px-2">
                    Arraste um tipo para o JSON
                  </p>
                </div>
              )}
            </ScrollArea>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
