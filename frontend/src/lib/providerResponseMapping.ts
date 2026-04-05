import type { MappingItemFilter, TypeItemFilterConfig } from '@/types/integrations';
import { getActiveTypeItemFilterGroups, normalizeTypeItemFilterConfig } from '@/lib/typeItemFilters';
import {
  isMappedPreviewZipWrapper,
  MAPPED_PREVIEW_ROWS_KEY,
} from '@/lib/mappedPreviewZipWrapper';

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

/** Normaliza valor para comparar duplicatas (preview, relatório e dedup por path). */
export function normalizeDedupFingerprintPart(value: unknown): string {
  if (value == null) return '';
  const raw = String(value).trim();
  if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(raw)) {
    return raw.toLowerCase();
  }
  return raw
    .toLowerCase()
    .replace(/r\$\s*/gi, '')
    .replace(/[\u00a0\u202f\u2007\u2009]/g, ' ')
    .replace(/\s+/g, '')
    .replace(/\./g, '')
    .replace(/[/-]/g, '')
    .replace('%', '')
    .replace(',', '.');
}

/** Fingerprint estável para dedup global no preview/relatório (chaves do relatório + valores normalizados). */
export function reportRowDedupFingerprint(
  row: Record<string, unknown>,
  dedupKeys: string[],
  dedupSummary?: Record<string, unknown>,
): string {
  if (dedupKeys.length === 0) return '';
  const sorted = [...dedupKeys].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  return sorted
    .map((k) => {
      const v = Object.prototype.hasOwnProperty.call(row, k) ? row[k] : dedupSummary?.[k];
      return `${k}\0${normalizeDedupFingerprintPart(v)}`;
    })
    .join('\x1e');
}

function rowHasDedupSubstance(
  row: Record<string, unknown>,
  dedupKeys: string[],
  dedupSummary?: Record<string, unknown>,
): boolean {
  return dedupKeys.some((k) => {
    const v = Object.prototype.hasOwnProperty.call(row, k) ? row[k] : dedupSummary?.[k];
    return normalizeDedupFingerprintPart(v) !== '';
  });
}

/**
 * Marca índices de linha duplicados **entre tipos**: mesmo conjunto de campos deduplicar com os mesmos valores
 * (chaves do relatório + normalização), independentemente do tipo.
 */
export function computeGlobalDuplicateRowIndicesByType(
  typeKeysInOrder: string[],
  rowInfo: Map<
    string,
    { rows: Record<string, unknown>[]; dedupKeys: string[]; dedupSummary?: Record<string, unknown> }
  >,
): Map<string, Set<number>> {
  const byFp = new Map<string, { typeKey: string; rowIndex: number }[]>();
  for (const typeKey of typeKeysInOrder) {
    const pack = rowInfo.get(typeKey);
    if (!pack?.dedupKeys.length) continue;
    pack.rows.forEach((row, rowIndex) => {
      if (!rowHasDedupSubstance(row, pack.dedupKeys, pack.dedupSummary)) return;
      const fp = reportRowDedupFingerprint(row, pack.dedupKeys, pack.dedupSummary);
      const list = byFp.get(fp) ?? [];
      list.push({ typeKey, rowIndex });
      byFp.set(fp, list);
    });
  }
  const duplicateRowsByType = new Map<string, Set<number>>();
  for (const refs of byFp.values()) {
    if (refs.length < 2) continue;
    for (const r of refs) {
      if (!duplicateRowsByType.has(r.typeKey)) duplicateRowsByType.set(r.typeKey, new Set());
      duplicateRowsByType.get(r.typeKey)!.add(r.rowIndex);
    }
  }
  return duplicateRowsByType;
}

/** Mantém a primeira ocorrência global (ordem dos tipos em `typeKeysInOrder`, depois índice na lista). */
export function buildByTypeWithGlobalDedupRemoved(
  byType: Record<string, unknown>,
  typeKeysInOrder: string[],
  rowInfo: Map<
    string,
    { rows: Record<string, unknown>[]; dedupKeys: string[]; dedupSummary?: Record<string, unknown> }
  >,
): Record<string, unknown> {
  const seen = new Set<string>();
  const out: Record<string, unknown> = { ...byType };
  for (const typeKey of typeKeysInOrder) {
    const pack = rowInfo.get(typeKey);
    const val = out[typeKey];
    if (!pack?.dedupKeys.length) continue;

    if (isMappedPreviewZipWrapper(val)) {
      const rows = val[MAPPED_PREVIEW_ROWS_KEY];
      out[typeKey] = {
        ...val,
        [MAPPED_PREVIEW_ROWS_KEY]: rows.filter((row) => {
          if (!rowHasDedupSubstance(row, pack.dedupKeys, pack.dedupSummary)) return true;
          const fp = reportRowDedupFingerprint(row, pack.dedupKeys, pack.dedupSummary);
          if (seen.has(fp)) return false;
          seen.add(fp);
          return true;
        }),
      };
      continue;
    }

    if (!Array.isArray(val)) continue;
    const rows = val as Record<string, unknown>[];
    out[typeKey] = rows.filter((row) => {
      if (!rowHasDedupSubstance(row, pack.dedupKeys, pack.dedupSummary)) return true;
      const fp = reportRowDedupFingerprint(row, pack.dedupKeys, pack.dedupSummary);
      if (seen.has(fp)) return false;
      seen.add(fp);
      return true;
    });
  }
  return out;
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
      .map((path) => normalizeDedupFingerprintPart(getValueAtJsonPath(item, path)))
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
