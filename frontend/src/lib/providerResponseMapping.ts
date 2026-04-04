import type { MappingItemFilter } from '@/types/integrations';

export function getValueAtJsonPath(root: unknown, path: string): unknown {
  if (!path) return root;
  const parts = path.split('.').filter(Boolean);
  let cur: unknown = root;
  for (const part of parts) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

function normalizeCell(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'string') return v.trim();
  return String(v).trim();
}

function matchesFilter(item: Record<string, unknown>, f: MappingItemFilter): boolean {
  const cell = normalizeCell(item[f.field]);
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

/** Aplica critérios em cada elemento quando o valor em `jsonPath` é um array de objetos. */
export function applyMappingItemFilters(
  value: unknown,
  filters: MappingItemFilter[] | undefined,
): unknown {
  const use = activeMappingItemFilters(filters);
  if (!use.length) return value;
  if (!Array.isArray(value)) return value;
  return value.filter(el => {
    if (!el || typeof el !== 'object' || Array.isArray(el)) return false;
    const obj = el as Record<string, unknown>;
    return use.every(f => matchesFilter(obj, f));
  });
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
  filters: MappingItemFilter[] | undefined,
): { value: unknown; hasData: boolean } {
  const active = activeMappingItemFilters(filters);
  if (!active.length) {
    return { value, hasData: hasVisiblePreviewValue(value) };
  }

  if (Array.isArray(value)) {
    const directlyFiltered = applyMappingItemFilters(value, active);
    if (directlyFiltered !== value) {
      return {
        value: directlyFiltered,
        hasData: Array.isArray(directlyFiltered)
          ? directlyFiltered.length > 0
          : hasVisiblePreviewValue(directlyFiltered),
      };
    }

    const nestedItems: unknown[] = [];
    for (const item of value) {
      const nested = filterValueForPreviewDeep(item, active);
      if (nested.hasData) nestedItems.push(nested.value);
    }
    return { value: nestedItems, hasData: nestedItems.length > 0 };
  }

  if (value && typeof value === 'object') {
    const nextObject: Record<string, unknown> = {};
    let matchedNestedChild = false;

    for (const [key, childValue] of Object.entries(value as Record<string, unknown>)) {
      const nested = filterValueForPreviewDeep(childValue, active);
      if (nested.hasData) {
        nextObject[key] = nested.value;
        matchedNestedChild = true;
      }
    }

    if (matchedNestedChild) {
      return { value: nextObject, hasData: true };
    }

    return { value: {}, hasData: false };
  }

  return { value, hasData: false };
}

export function formatDeepFilteredValueAtPath(
  rootJson: string,
  jsonPath: string,
  filters: MappingItemFilter[] | undefined,
  lineFallback: string,
): { text: string; hasData: boolean } {
  try {
    const parsed = JSON.parse(rootJson) as unknown;
    const value = getValueAtJsonPath(parsed, jsonPath);
    if (value === undefined) {
      return { text: lineFallback, hasData: lineFallback.trim().length > 0 };
    }
    const filtered = filterValueForPreviewDeep(value, filters);
    return {
      text: JSON.stringify(filtered.value, null, 2) || '—',
      hasData: filtered.hasData,
    };
  } catch {
    return { text: lineFallback, hasData: lineFallback.trim().length > 0 };
  }
}

export function formatMappedValuePreview(
  rootJson: string,
  jsonPath: string,
  filters: MappingItemFilter[] | undefined,
  lineFallback: string,
): string {
  return formatDeepFilteredValueAtPath(rootJson, jsonPath, filters, lineFallback).text;
}
