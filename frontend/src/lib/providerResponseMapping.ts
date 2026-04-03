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

function activeFilters(filters: MappingItemFilter[] | undefined): MappingItemFilter[] {
  if (!filters?.length) return [];
  return filters.filter(f => f.field.trim().length > 0);
}

/** Aplica critérios em cada elemento quando o valor em `jsonPath` é um array de objetos. */
export function applyMappingItemFilters(
  value: unknown,
  filters: MappingItemFilter[] | undefined,
): unknown {
  const use = activeFilters(filters);
  if (!use.length) return value;
  if (!Array.isArray(value)) return value;
  return value.filter(el => {
    if (!el || typeof el !== 'object' || Array.isArray(el)) return false;
    const obj = el as Record<string, unknown>;
    return use.every(f => matchesFilter(obj, f));
  });
}

export function formatMappedValuePreview(
  rootJson: string,
  jsonPath: string,
  filters: MappingItemFilter[] | undefined,
  lineFallback: string,
): string {
  try {
    const parsed = JSON.parse(rootJson) as unknown;
    let value = getValueAtJsonPath(parsed, jsonPath);
    if (value === undefined) return lineFallback;
    value = applyMappingItemFilters(value, filters);
    return JSON.stringify(value, null, 2) || '—';
  } catch {
    return lineFallback;
  }
}
