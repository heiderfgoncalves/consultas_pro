import type { MappingItemFilter, TypeItemFilterConfig } from '@/types/integrations';
import { getActiveTypeItemFilterGroups, normalizeTypeItemFilterConfig } from '@/lib/typeItemFilters';

/** Lê propriedade com tolerância a maiúsculas/minúsculas (retornos usam INFORMANTE, telas às vezes informante). */
export function getRecordPropertyCI(obj: Record<string, unknown>, key: string): unknown {
  const k = key.trim();
  if (!k) return undefined;
  if (Object.prototype.hasOwnProperty.call(obj, k)) return obj[k];
  const lower = k.toLowerCase();
  for (const prop of Object.keys(obj)) {
    if (prop.toLowerCase() === lower) return obj[prop];
  }
  return undefined;
}

export function getValueAtJsonPath(root: unknown, path: string): unknown {
  if (!path) return root;
  const parts = path.split('.').filter(Boolean);
  let cur: unknown = root;
  for (const part of parts) {
    if (cur == null || typeof cur !== 'object') return undefined;
    const rec = cur as Record<string, unknown>;
    const next = getRecordPropertyCI(rec, part);
    if (next === undefined) return undefined;
    cur = next;
  }
  return cur;
}

function normalizeCell(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'string') return v.trim();
  return String(v).trim();
}

function matchesFilter(item: Record<string, unknown>, f: MappingItemFilter): boolean {
  const cell = normalizeCell(getRecordPropertyCI(item, f.field));
  const target = f.value.trim();
  switch (f.op) {
    case 'eq':
      return cell === target;
    case 'contains':
      return cell.includes(target);
    case 'startsWith':
      return cell.startsWith(target);
    case 'endsWith':
      return cell.endsWith(target);
    case 'regex': {
      try {
        return new RegExp(target).test(cell);
      } catch {
        return false;
      }
    }
    default:
      return true;
  }
}

export function activeMappingItemFilters(filters: MappingItemFilter[] | undefined): MappingItemFilter[] {
  if (!filters?.length) return [];
  return filters.filter(f => f.field.trim().length > 0);
}

function matchesFilterConfig(
  item: Record<string, unknown>,
  filters: MappingItemFilter[] | TypeItemFilterConfig | undefined,
): boolean {
  const groups = getActiveTypeItemFilterGroups(normalizeTypeItemFilterConfig(filters));
  if (!groups.length) return true;

  let result = groups[0].rules.every((rule) => matchesFilter(item, rule));
  for (let index = 1; index < groups.length; index += 1) {
    const groupMatches = groups[index].rules.every((rule) => matchesFilter(item, rule));
    result = groups[index].joinOperator === 'or' ? (result || groupMatches) : (result && groupMatches);
  }
  return result;
}

function dedupeObjectArrayByFieldPaths(
  arr: Record<string, unknown>[],
  fieldPaths: string[],
): Record<string, unknown>[] {
  if (fieldPaths.length === 0 || arr.length <= 1) return arr;
  const seen = new Set<string>();
  const out: Record<string, unknown>[] = [];
  for (const item of arr) {
    const signature = fieldPaths
      .map((path) => JSON.stringify(getValueAtJsonPath(item, path) ?? null))
      .join('\x1e');
    if (seen.has(signature)) continue;
    seen.add(signature);
    out.push(item);
  }
  return out;
}

function dedupeValueDeep(value: unknown, fieldPaths: string[]): unknown {
  if (fieldPaths.length === 0) return value;
  if (Array.isArray(value)) {
    const nested = value.map((item) => dedupeValueDeep(item, fieldPaths));
    const recordsOnly = nested.every(
      (item) => item !== null && typeof item === 'object' && !Array.isArray(item),
    );
    if (recordsOnly) {
      return dedupeObjectArrayByFieldPaths(nested as Record<string, unknown>[], fieldPaths);
    }
    return nested;
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, nested]) => [
        key,
        dedupeValueDeep(nested, fieldPaths),
      ]),
    );
  }
  return value;
}

function getDedupFieldPaths(config: TypeItemFilterConfig): string[] {
  if (!config.dedupFieldIds.length || !config.fieldMappings.length) return [];
  const selected = new Set(config.dedupFieldIds);
  return config.fieldMappings
    .filter((mapping) => selected.has(mapping.reportFieldId))
    .map((mapping) => mapping.jsonPath.trim())
    .filter((path) => path.length > 0);
}

function isPrimitiveArrayElement(el: unknown): boolean {
  return el === null
    || el === undefined
    || typeof el === 'string'
    || typeof el === 'number'
    || typeof el === 'boolean';
}

function isPrimitiveLikeArray(arr: unknown[]): boolean {
  if (arr.length === 0) return true;
  return arr.every(isPrimitiveArrayElement);
}

/**
 * Quando o valor é um array de objetos, filtra por critério em cada objeto.
 * Elementos que não são objetos (ex.: strings em array paralelo) permanecem —
 * caso contrário critérios ativos esvaziariam arrays de primitivos no preview.
 */
export function applyMappingItemFilters(
  value: unknown,
  filters: MappingItemFilter[] | TypeItemFilterConfig | undefined,
): unknown {
  const groups = getActiveTypeItemFilterGroups(normalizeTypeItemFilterConfig(filters));
  if (!groups.length) return value;
  if (!Array.isArray(value)) return value;
  return value.filter((el) => {
    if (el == null) return false;
    if (typeof el !== 'object' || Array.isArray(el)) return true;
    const obj = el as Record<string, unknown>;
    return matchesFilterConfig(obj, filters);
  });
}

/**
 * Provedores costumam enviar “colunas” paralelas (`data`, `valor`, … como arrays)
 * e um único escalar (ex.: `data_inclusao`). Converte em lista de objetos-linha só para o preview.
 */
function zipOneLevelColumnarObject(rec: Record<string, unknown>): Record<string, unknown> | unknown[] {
  const arrayKeys: string[] = [];
  const scalars: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(rec)) {
    if (!Array.isArray(v)) {
      scalars[k] = v;
      continue;
    }
    if (!isPrimitiveLikeArray(v)) {
      return rec;
    }
    arrayKeys.push(k);
  }
  if (arrayKeys.length < 2) {
    return rec;
  }
  const lengths = arrayKeys.map(k => (rec[k] as unknown[]).length);
  const n = lengths[0]!;
  if (n === 0 || lengths.some(len => len !== n)) {
    return rec;
  }
  const rows: Record<string, unknown>[] = [];
  for (let i = 0; i < n; i += 1) {
    const row: Record<string, unknown> = { ...scalars };
    for (const k of arrayKeys) {
      row[k] = (rec[k] as unknown[])[i];
    }
    rows.push(row);
  }
  return rows;
}

function zipColumnarParallelArraysForPreview(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(el => zipColumnarParallelArraysForPreview(el));
  }
  if (!value || typeof value !== 'object') {
    return value;
  }
  const rec = value as Record<string, unknown>;
  const zipped = zipOneLevelColumnarObject(rec);
  if (Array.isArray(zipped)) {
    return zipped.map(row => zipColumnarParallelArraysForPreview(row));
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(zipped)) {
    out[k] = zipColumnarParallelArraysForPreview(v);
  }
  return out;
}

export function hasVisiblePreviewValue(value: unknown): boolean {
  if (value == null) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'object') return Object.keys(value as Record<string, unknown>).length > 0;
  return true;
}

/**
 * Filtra valores para preview quando o path aponta para objeto pai ou arrays aninhados
 * (mesma semântica do mapeador JSON na aba Consultas).
 */
export function filterValueForPreviewDeep(
  value: unknown,
  filters: MappingItemFilter[] | TypeItemFilterConfig | undefined,
): { value: unknown; hasData: boolean } {
  const normalized = normalizeTypeItemFilterConfig(filters);
  const activeGroups = getActiveTypeItemFilterGroups(normalized);
  const dedupFieldPaths = getDedupFieldPaths(normalized);
  if (!activeGroups.length && dedupFieldPaths.length === 0) {
    return { value, hasData: hasVisiblePreviewValue(value) };
  }

  const applyDedup = (nextValue: unknown) => dedupeValueDeep(nextValue, dedupFieldPaths);

  if (Array.isArray(value)) {
    const directlyFiltered = activeGroups.length > 0
      ? applyMappingItemFilters(value, normalized)
      : value;
    if (directlyFiltered !== value) {
      const deduped = applyDedup(directlyFiltered);
      return {
        value: deduped,
        hasData: Array.isArray(deduped)
          ? deduped.length > 0
          : hasVisiblePreviewValue(deduped),
      };
    }

    const nestedItems: unknown[] = [];
    for (const item of value) {
      const nested = filterValueForPreviewDeep(item, normalized);
      if (nested.hasData) nestedItems.push(nested.value);
    }
    const deduped = applyDedup(nestedItems);
    return {
      value: deduped,
      hasData: Array.isArray(deduped) ? deduped.length > 0 : hasVisiblePreviewValue(deduped),
    };
  }

  if (value && typeof value === 'object') {
    const nextObject: Record<string, unknown> = {};
    let matchedNestedChild = false;

    for (const [key, childValue] of Object.entries(value as Record<string, unknown>)) {
      const nested = filterValueForPreviewDeep(childValue, normalized);
      if (nested.hasData) {
        nextObject[key] = nested.value;
        matchedNestedChild = true;
      }
    }

    if (matchedNestedChild) {
      const deduped = applyDedup(nextObject);
      return { value: deduped, hasData: hasVisiblePreviewValue(deduped) };
    }

    return { value: {}, hasData: false };
  }

  // Critérios de item aplicam a arrays de objetos; em folhas (string, número, etc.) não há como filtrar — mostrar o valor.
  const deduped = applyDedup(value);
  return { value: deduped, hasData: hasVisiblePreviewValue(deduped) };
}

export function formatDeepFilteredValueAtPath(
  rootJson: string,
  jsonPath: string,
  filters: MappingItemFilter[] | TypeItemFilterConfig | undefined,
  lineFallback: string,
): { text: string; hasData: boolean } {
  try {
    const parsed = JSON.parse(rootJson) as unknown;
    const value = getValueAtJsonPath(parsed, jsonPath);
    if (value === undefined) {
      return { text: lineFallback, hasData: lineFallback.trim().length > 0 };
    }
    const filtered = filterValueForPreviewDeep(value, filters);
    const forDisplay = zipColumnarParallelArraysForPreview(filtered.value);
    return {
      text: JSON.stringify(forDisplay, null, 2) || '—',
      hasData: filtered.hasData,
    };
  } catch {
    return { text: lineFallback, hasData: lineFallback.trim().length > 0 };
  }
}

export function formatMappedValuePreview(
  rootJson: string,
  jsonPath: string,
  filters: MappingItemFilter[] | TypeItemFilterConfig | undefined,
  lineFallback: string,
): string {
  return formatDeepFilteredValueAtPath(rootJson, jsonPath, filters, lineFallback).text;
}
