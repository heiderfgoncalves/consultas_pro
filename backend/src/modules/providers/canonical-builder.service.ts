import { prisma } from '../../db/prisma';
import { normalizeProviderPayload } from './normalization.service';

export interface FieldMapping {
  jsonPath: string;
  fieldTypeKey: string;
  label: string;
}

export interface ConsultationFieldType {
  id: string;
  key: string;
  label: string;
  reportFieldConfig?: {
    version: number;
    title?: string;
    fields: Array<{
      id: string;
      label: string;
      dataType: string;
      sortOrder: number;
      key: string;
    }>;
  };
}

export interface TypeItemFilterRule {
  id: string;
  field: string;
  op: 'eq' | 'contains' | 'startsWith' | 'endsWith' | 'regex';
  value: string;
}

export interface TypeItemFilterGroup {
  id: string;
  joinOperator: 'and' | 'or';
  rules: TypeItemFilterRule[];
}

export interface TypeItemFieldMapping {
  id: string;
  reportFieldId: string;
  reportFieldLabel: string;
  jsonPath: string;
  sourceTrechoPath?: string;
}

export interface TypeItemFilterConfig {
  version: number;
  groups: TypeItemFilterGroup[];
  fieldMappings: TypeItemFieldMapping[];
  dedupFieldIds: string[];
  computedFields?: any[];
}

/** Minúsculas, sem acentos, espaços e barras → `_`, apenas [a-z0-9_]. */
export function slugifyReportFieldKey(label: string): string {
  const base = label
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim()
    .replace(/[\s/]+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  return base || 'campo';
}

export function dedupeReportFieldKeys(slugs: string[]): string[] {
  const counts = new Map<string, number>();
  return slugs.map((raw) => {
    const base = raw.trim() || 'campo';
    const n = (counts.get(base) ?? 0) + 1;
    counts.set(base, n);
    return n === 1 ? base : `${base}_${n}`;
  });
}

/** Define `key` de cada campo a partir do rótulo, com slugs únicos na lista. */
export function assignKeysToReportFields<T extends { label: string }>(fields: T[]): (T & { key: string })[] {
  const slugs = fields.map((f) => slugifyReportFieldKey(f.label));
  const keys = dedupeReportFieldKeys(slugs);
  return fields.map((f, i) => ({ ...f, key: keys[i]! }));
}

export function coerceBooleanForReport(raw: unknown): boolean | undefined {
  if (typeof raw === 'boolean') return raw;
  if (typeof raw === 'number') {
    if (raw === 1) return true;
    if (raw === 0) return false;
  }
  if (typeof raw === 'string') {
    const s = raw.trim().toLowerCase();
    if (s === 'true' || s === '1') return true;
    if (s === 'false' || s === '0') return false;
  }
  return undefined;
}

/** Remove símbolo R$, espaços finos e normaliza para parse numérico. */
export function parseCurrencyBrlToNumber(raw: unknown): number | null {
  if (raw == null) return null;
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  let s = String(raw).trim();
  if (!s) return null;
  s = s
    .replace(/\r?\n/g, ' ')
    .replace(/[\u00a0\u202f\u2007\u2009]/g, ' ')
    .replace(/r\$\s*/gi, '')
    .trim();
  if (!s) return null;
  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  let normalized: string;
  if (lastComma > lastDot) {
    normalized = s.replace(/\./g, '').replace(',', '.');
  } else if (lastDot > lastComma) {
    normalized = s.replace(/,/g, '');
  } else {
    normalized = s.replace(/,/g, '.');
  }
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

/** Converte entrada de percentual para valor absoluto em “pontos percentuais”. */
export function parsePercentToAbsolutePercent(raw: unknown): number | null {
  if (raw == null) return null;
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    if (raw > 0 && raw <= 1) return raw * 100;
    return raw;
  }
  const s = String(raw).trim().replace(/\s+/g, '');
  if (!s) return null;
  const hasPct = s.endsWith('%');
  const numPart = hasPct ? s.slice(0, -1) : s;
  const normalized = numPart.replace(',', '.');
  const n = Number(normalized);
  if (!Number.isFinite(n)) return null;
  if (hasPct) return n;
  if (n > 0 && n <= 1) return n * 100;
  return n;
}

/** Formata número absoluto de percentual para exibição estável (ex.: 90 → "90%"). */
export function formatAbsolutePercentBrDisplay(absolutePercent: number): string {
  if (!Number.isFinite(absolutePercent)) return '';
  const hasFraction = Math.abs(absolutePercent % 1) > 1e-9;
  const body = hasFraction
    ? new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
        absolutePercent,
      )
    : new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(absolutePercent);
  return `${body}%`;
}

/** CPF/CNPJ com máscara quando há 11 ou 14 dígitos. */
export function formatDocumentBrDisplay(raw: unknown): string {
  if (raw == null) return '';
  const s0 = String(raw).trim();
  const d = s0.replace(/\D/g, '');
  if (d.length === 0) return s0;
  if (d.length === 11) {
    return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  if (d.length === 14) {
    return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  return s0;
}

export function formatCurrencyBrlDisplay(raw: unknown): string {
  if (raw == null) return '';
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(raw);
  }
  const n = parseCurrencyBrlToNumber(raw);
  if (n != null) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
  }
  return String(raw).trim();
}

function coerceToDate(raw: unknown): Date | null {
  if (raw == null) return null;
  if (raw instanceof Date) return Number.isNaN(raw.getTime()) ? null : raw;
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const s = String(raw).trim();
  if (!s) return null;
  const isoDate = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (isoDate) {
    const d = new Date(Number(isoDate[1]), Number(isoDate[2]) - 1, Number(isoDate[3]));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const br = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s);
  if (br) {
    const d = new Date(Number(br[3]), Number(br[2]) - 1, Number(br[1]));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const t = Date.parse(s);
  if (!Number.isNaN(t)) return new Date(t);
  return null;
}

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

export function formatDateBrDisplay(raw: unknown): string {
  const d = coerceToDate(raw);
  if (!d) return raw == null ? '' : String(raw);
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export function formatDateTimeBrDisplay(raw: unknown): string {
  const d = coerceToDate(raw);
  if (!d) return raw == null ? '' : String(raw);
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

export function formatPercentBrDisplay(raw: unknown): string {
  if (raw == null) return '';
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    const abs = Math.abs(raw);
    if (abs > 0 && abs <= 1) {
      return formatAbsolutePercentBrDisplay(raw * 100);
    }
    return formatAbsolutePercentBrDisplay(raw);
  }
  const s = String(raw).trim();
  if (!s) return '';
  const abs = parsePercentToAbsolutePercent(s);
  if (abs != null) return formatAbsolutePercentBrDisplay(abs);
  return s.endsWith('%') ? s : `${s} %`;
}

export function formatNumericBrDisplay(raw: unknown): string {
  if (raw == null) return '';
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 20 }).format(raw);
  }
  const s = String(raw).trim();
  const normalized = s.replace(/\./g, '').replace(',', '.');
  const n = Number(normalized);
  if (Number.isFinite(n)) return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 20 }).format(n);
  return s;
}

function formatLeaf(raw: unknown, dataType: string): unknown {
  if (raw === null || raw === undefined) return raw;
  switch (dataType) {
    case 'document':
      return formatDocumentBrDisplay(raw);
    case 'currency':
      return formatCurrencyBrlDisplay(raw);
    case 'date':
      return formatDateBrDisplay(raw);
    case 'datetime':
      return formatDateTimeBrDisplay(raw);
    case 'percent':
      return formatPercentBrDisplay(raw);
    case 'numeric':
      return formatNumericBrDisplay(raw);
    case 'boolean': {
      const b = coerceBooleanForReport(raw);
      if (b !== undefined) return b;
      return raw;
    }
    case 'text':
    default:
      return typeof raw === 'string' ? raw : String(raw);
  }
}

export function formatMappedPreviewValue(value: unknown, dataType: string | undefined): unknown {
  const dt = dataType ?? 'text';
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map((v) => formatMappedPreviewValue(v, dt));
  if (value !== null && typeof value === 'object') return value;
  return formatLeaf(value, dt);
}

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

export function collectValuesAtPath(value: unknown, path: string): unknown[] {
  const parts = path.split('.').filter(Boolean);
  if (parts.length === 0) return [];

  const walk = (node: unknown, index: number): unknown[] => {
    if (node == null) return [];
    if (index >= parts.length) return [node];
    if (Array.isArray(node)) {
      return node.flatMap((item) => walk(item, index));
    }
    if (typeof node !== 'object') return [];
    const next = getRecordPropertyCI(node as Record<string, unknown>, parts[index]!);
    if (next === undefined) return [];
    return walk(next, index + 1);
  };

  return walk(value, 0);
}

export function zipAlignedMappedPreviewRows(obj: Record<string, unknown>): unknown {
  const arrayEntries: [string, unknown[]][] = [];
  const scalars: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (Array.isArray(v)) arrayEntries.push([k, v]);
    else scalars[k] = v;
  }
  if (arrayEntries.length < 2) return obj;
  const lengths = arrayEntries.map(([, a]) => a.length);
  const n = lengths[0]!;
  if (n === 0 || lengths.some((len) => len !== n)) return obj;
  const rows: Record<string, unknown>[] = [];
  for (let i = 0; i < n; i += 1) {
    const row: Record<string, unknown> = { ...scalars };
    for (const [k, arr] of arrayEntries) {
      row[k] = arr[i];
    }
    rows.push(row);
  }
  return rows;
}

export function normalizeMappedFieldValue(values: unknown[]): unknown {
  if (values.length === 0) return null;
  if (values.length === 1) return values[0];
  return values;
}

function normalizeCell(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'string') return v.trim();
  return String(v).trim();
}

export function normalizeDedupFingerprintPart(value: unknown): string {
  if (value == null) return '';
  let raw = String(value).trim();
  if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(raw)) {
    return raw.toLowerCase();
  }
  if (/^[0-9a-zA-Z]+$/.test(raw)) {
    raw = raw.replace(/^0+/, '');
    if (raw === '') raw = '0';
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

export function reportRowCrossTypeDedupFingerprint(
  row: Record<string, unknown>,
  dedupKeys: string[],
  dedupKeyToCanonical: Map<string, string>,
  dedupSummary?: Record<string, unknown>,
): string {
  if (dedupKeys.length === 0) return '';
  const sorted = [...dedupKeys].sort((a, b) => {
    const ca = dedupKeyToCanonical.get(a) ?? a;
    const cb = dedupKeyToCanonical.get(b) ?? b;
    return ca.localeCompare(cb, 'pt-BR');
  });
  return sorted
    .map((k) => {
      const canonical = dedupKeyToCanonical.get(k) ?? k;
      const v = Object.prototype.hasOwnProperty.call(row, k) ? row[k] : dedupSummary?.[k];
      return `${canonical}\0${normalizeDedupFingerprintPart(v)}`;
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

function matchesFilter(item: Record<string, unknown>, f: TypeItemFilterRule): boolean {
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

export function normalizeTypeItemFilterConfig(raw: unknown): TypeItemFilterConfig {
  if (!raw || typeof raw !== 'object') {
    return {
      version: 2,
      groups: [],
      fieldMappings: [],
      dedupFieldIds: [],
    };
  }
  const item = raw as Record<string, unknown>;
  const groups = Array.isArray(item.groups) ? item.groups : [];
  const fieldMappings = Array.isArray(item.fieldMappings) ? item.fieldMappings : [];
  const dedupFieldIds = Array.isArray(item.dedupFieldIds) ? item.dedupFieldIds : [];
  return {
    version: 2,
    groups: groups as any,
    fieldMappings: fieldMappings as any,
    dedupFieldIds: dedupFieldIds as any,
  };
}

function matchesFilterConfig(
  item: Record<string, unknown>,
  filters: TypeItemFilterConfig | undefined,
): boolean {
  if (!filters) return true;
  const normalized = normalizeTypeItemFilterConfig(filters);
  const groups = normalized.groups.filter((g) => g.rules && g.rules.length > 0);
  if (!groups.length) return true;

  let result = groups[0].rules.every((rule) => matchesFilter(item, rule));
  for (let index = 1; index < groups.length; index += 1) {
    const groupMatches = groups[index].rules.every((rule) => matchesFilter(item, rule));
    result = groups[index].joinOperator === 'or' ? (result || groupMatches) : (result && groupMatches);
  }
  return result;
}

export function applyMappingItemFilters(
  value: unknown,
  filters: TypeItemFilterConfig | undefined,
): unknown {
  if (!filters) return value;
  const normalized = normalizeTypeItemFilterConfig(filters);
  const groups = normalized.groups.filter((g) => g.rules && g.rules.length > 0);
  if (!groups.length) return value;
  if (!Array.isArray(value)) return value;
  return value.filter((el) => {
    if (el == null) return false;
    if (typeof el !== 'object' || Array.isArray(el)) return true;
    const obj = el as Record<string, unknown>;
    return matchesFilterConfig(obj, filters);
  });
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

export function filterValueForPreviewDeep(
  value: unknown,
  filters: TypeItemFilterConfig | undefined,
  skipDedup = false,
): { value: unknown; hasData: boolean } {
  if (!filters) return { value, hasData: hasVisiblePreviewValue(value) };
  const normalized = normalizeTypeItemFilterConfig(filters);
  const activeGroups = normalized.groups.filter((g) => g.rules && g.rules.length > 0);
  const dedupFieldPaths = skipDedup ? [] : getDedupFieldPaths(normalized);
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
      const nested = filterValueForPreviewDeep(item, normalized, skipDedup);
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
      const nested = filterValueForPreviewDeep(childValue, normalized, skipDedup);
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

  const deduped = applyDedup(value);
  return { value: deduped, hasData: hasVisiblePreviewValue(deduped) };
}

export function formatDeepFilteredValueAtPath(
  rootJson: string,
  jsonPath: string,
  filters: TypeItemFilterConfig | undefined,
  lineFallback: string,
  skipDedup = false,
): { text: string; hasData: boolean } {
  try {
    const parsed = JSON.parse(rootJson) as unknown;
    const value = getValueAtJsonPath(parsed, jsonPath);
    if (value === undefined) {
      return { text: lineFallback, hasData: lineFallback.trim().length > 0 };
    }
    const filtered = filterValueForPreviewDeep(value, filters, skipDedup);
    const forDisplay = zipColumnarParallelArraysForPreview(filtered.value);
    return {
      text: JSON.stringify(forDisplay, null, 2) || '—',
      hasData: filtered.hasData,
    };
  } catch {
    return { text: lineFallback, hasData: lineFallback.trim().length > 0 };
  }
}

export function parsePreviewPartText(text: string): unknown {
  const t = text.trim();
  if (!t || t === '—') return null;
  try {
    return JSON.parse(t) as unknown;
  } catch {
    return t;
  }
}

export function buildByTypeWithGlobalDedupRemoved(
  byType: Record<string, unknown>,
  typeKeysInOrder: string[],
  rowInfo: Map<
    string,
    {
      rows: Record<string, unknown>[];
      dedupKeys: string[];
      dedupSummary?: Record<string, unknown>;
      dedupKeyToCanonical?: Map<string, string>;
    }
  >,
): Record<string, unknown> {
  const seen = new Set<string>();
  const out: Record<string, unknown> = { ...byType };
  for (const typeKey of typeKeysInOrder) {
    const pack = rowInfo.get(typeKey);
    const val = out[typeKey];
    if (!pack?.dedupKeys.length) continue;
    const canonical = pack.dedupKeyToCanonical ?? new Map<string, string>();

    if (!Array.isArray(val)) continue;
    const rows = val as Record<string, unknown>[];
    out[typeKey] = rows.filter((row) => {
      if (!rowHasDedupSubstance(row, pack.dedupKeys, pack.dedupSummary)) return true;
      const fp = reportRowCrossTypeDedupFingerprint(row, pack.dedupKeys, canonical, pack.dedupSummary);
      if (seen.has(fp)) return false;
      seen.add(fp);
      return true;
    });
  }
  return out;
}

export function parseTypeItemFiltersRecord(raw: unknown): Record<string, TypeItemFilterConfig> | undefined {
  let value = raw;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    try {
      value = JSON.parse(trimmed) as unknown;
    } catch {
      return undefined;
    }
  }

  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;

  const out: Record<string, TypeItemFilterConfig> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (!item) continue;
    if (!Array.isArray(item) && (typeof item !== 'object' || item === null)) continue;
    out[key] = normalizeTypeItemFilterConfig(item);
  }

  return Object.keys(out).length > 0 ? out : undefined;
}

export function buildTypeKeyedData(params: {
  sampleResponse: string;
  trechoMappings: FieldMapping[];
  fieldType: ConsultationFieldType;
  typeItemFilterConfig: TypeItemFilterConfig;
}): Record<string, unknown> | unknown[] | null {
  const { sampleResponse, trechoMappings, fieldType, typeItemFilterConfig } = params;
  const normalizedCfg = normalizeTypeItemFilterConfig(typeItemFilterConfig);

  if (!sampleResponse.trim() || trechoMappings.length === 0) {
    return null;
  }

  const activeRules = normalizedCfg.groups.reduce(
    (total, group) => total + group.rules.filter((rule) => rule.field.trim().length > 0).length,
    0,
  ) > 0;

  // Filtra as partes correspondentes de acordo com os critérios definidos
  const parts = trechoMappings
    .map((m) => {
      const { text, hasData } = formatDeepFilteredValueAtPath(
        sampleResponse,
        m.jsonPath,
        normalizedCfg,
        '',
      );
      return { path: m.jsonPath, text, hasData };
    })
    .filter((p) => !activeRules || p.hasData);

  if (activeRules && parts.length === 0) {
    return [];
  }

  const parsedParts = parts.map((p) => parsePreviewPartText(p.text));
  const fieldsById = new Map(
    (fieldType.reportFieldConfig?.fields ?? []).map((f) => [f.id, f]),
  );

  // Mapeamento de de-para para os campos do Tipo
  const mappedFieldRows = normalizedCfg.fieldMappings
    .filter((mapping) => mapping.jsonPath.trim().length > 0)
    .filter((mapping) => fieldsById.has(mapping.reportFieldId))
    .map((mapping) => {
      const fieldDef = fieldsById.get(mapping.reportFieldId)!;
      const trechoFilter = mapping.sourceTrechoPath?.trim() ?? '';
      const relPath = mapping.jsonPath.trim();
      const values: unknown[] = [];

      for (let idx = 0; idx < parts.length; idx += 1) {
        const part = parts[idx]!;
        if (trechoFilter.length > 0 && part.path !== trechoFilter) continue;
        const partValue = parsedParts[idx];
        if (partValue == null) continue;
        const chunk = collectValuesAtPath(partValue, relPath);
        if (chunk.length === 0) continue;
        values.push(...chunk);
      }

      return {
        key: fieldDef.key,
        value: formatMappedPreviewValue(
          normalizeMappedFieldValue(values),
          fieldDef.dataType,
        ),
        reportFieldId: mapping.reportFieldId,
      };
    });

  if (mappedFieldRows.length === 0) {
    return [];
  }

  // Chaves para mapeamento dedupado
  const mappedKeys = mappedFieldRows.map((r) => r.key);
  const mappedDisplayKeys = dedupeReportFieldKeys(mappedKeys);
  
  const dedupFieldIdSet = new Set(normalizedCfg.dedupFieldIds);
  const mappedBlock: Record<string, unknown> = {};
  const dedupDisplayKeys: string[] = [];
  const dedupKeyToCanonical = new Map<string, string>();

  mappedFieldRows.forEach((fieldRow, index) => {
    const displayKey = mappedDisplayKeys[index]!;
    mappedBlock[displayKey] = fieldRow.value;
    if (dedupFieldIdSet.has(fieldRow.reportFieldId)) {
      dedupDisplayKeys.push(displayKey);
      dedupKeyToCanonical.set(displayKey, fieldRow.reportFieldId);
    }
  });

  // Alinhamento de linhas (zip)
  let zipped = zipAlignedMappedPreviewRows(mappedBlock);

  // Deduplicação de linhas baseada em campos chave
  const typeKey = fieldType.key;
  const rowsForDedup = Array.isArray(zipped)
    ? (zipped as Record<string, unknown>[])
    : null;

  if (
    dedupDisplayKeys.length > 0 &&
    rowsForDedup != null &&
    rowsForDedup.length > 0 &&
    rowsForDedup.every((el) => el != null && typeof el === 'object' && !Array.isArray(el))
  ) {
    const byType = { [typeKey]: zipped };
    const rowInfo = new Map<
      string,
      {
        rows: Record<string, unknown>[];
        dedupKeys: string[];
        dedupSummary?: Record<string, unknown>;
        dedupKeyToCanonical?: Map<string, string>;
      }
    >();
    rowInfo.set(typeKey, {
      rows: rowsForDedup,
      dedupKeys: dedupDisplayKeys,
      dedupKeyToCanonical,
    });
    const cleaned = buildByTypeWithGlobalDedupRemoved(byType, [typeKey], rowInfo);
    zipped = cleaned[typeKey];
  }

  if (zipped) {
    return zipped as any;
  }

  return [];
}

/**
 * Constrói o renderPayload canônico completo para a consulta unificando múltiplos produtos
 * e executando a deduplicação global inter-tipos (ex: SPC, Serasa, Boa Vista).
 */
export async function buildCanonicalRenderPayload(
  executions: { productId: string; rawResponse: unknown }[],
  products: Array<{
    id: string;
    typeItemFilters: unknown;
    mappings: Array<{
      isActive: boolean;
      sourcePath: string;
      canonicalField: {
        pathKey: string;
        label: string;
        dataType: string;
      };
    }>;
  }>
): Promise<Record<string, unknown>> {
  const dbFields = await prisma.canonicalFieldCatalog.findMany({
    where: {
      isActive: true,
      dataType: 'object',
    },
  });

  const fieldTypes: ConsultationFieldType[] = dbFields
    .filter((f) => !f.pathKey.includes('.') && !f.pathKey.includes('['))
    .map((f) => {
      let reportFieldConfig: any = undefined;
      try {
        if (f.reportFieldConfig) {
          const parsed = typeof f.reportFieldConfig === 'string'
            ? JSON.parse(f.reportFieldConfig)
            : f.reportFieldConfig;
          
          if (parsed && Array.isArray(parsed.fields)) {
            const mappedFields = parsed.fields.map((field: any, idx: number) => ({
              id: field.id || `field_${idx + 1}`,
              label: field.label || '',
              sortOrder: typeof field.sortOrder === 'number' ? field.sortOrder : idx,
              dataType: field.dataType || 'text',
            }));
            reportFieldConfig = {
              version: parsed.version || 1,
              title: parsed.title,
              fields: assignKeysToReportFields(mappedFields),
            };
          }
        }
      } catch (e) {
        console.error('Error parsing reportFieldConfig for', f.pathKey, e);
      }

      return {
        id: f.id,
        key: f.pathKey,
        label: f.label,
        reportFieldConfig,
      };
    });

  const mergedPayload: Record<string, any> = {};

  for (const exec of executions) {
    const product = products.find((p) => p.id === exec.productId);
    if (!product) continue;

    const rawPayload = exec.rawResponse;
    if (!rawPayload) continue;

    const rawPayloadStr = typeof rawPayload === 'string'
      ? rawPayload
      : JSON.stringify(rawPayload);
    const payloadObj = typeof rawPayload === 'string'
      ? JSON.parse(rawPayload)
      : rawPayload;

    const fieldMappings: FieldMapping[] = product.mappings
      .filter((m) => m.isActive)
      .map((m) => ({
        jsonPath: m.sourcePath,
        fieldTypeKey: m.canonicalField.pathKey,
        label: m.canonicalField.label,
      }));

    if (fieldMappings.length > 0) {
      const productFilters: Record<string, any> = (typeof product.typeItemFilters === 'string'
        ? JSON.parse(product.typeItemFilters)
        : product.typeItemFilters) || {};

      const typeItemFiltersParsed = parseTypeItemFiltersRecord(productFilters) || {};

      // 1. Processar cada Tipo Canônico cadastrado
      for (const ft of fieldTypes) {
        const mapsForType = fieldMappings.filter((m) => m.fieldTypeKey === ft.key);

        if (mapsForType.length > 0) {
          const typeItemFilterConfig = typeItemFiltersParsed[ft.key] || {
            version: 2,
            groups: [],
            fieldMappings: [],
            dedupFieldIds: [],
          };

          const parsedVal = buildTypeKeyedData({
            sampleResponse: rawPayloadStr,
            trechoMappings: mapsForType,
            fieldType: ft,
            typeItemFilterConfig,
          });

          if (parsedVal) {
            mergedPayload[ft.key] = parsedVal;
          } else {
            mergedPayload[ft.key] = [];
          }
        }
      }

      // 2. Processar mappings legados/órfãos que não pertencem a nenhum Tipo Canônico do catálogo
      const orphanMappings = product.mappings.filter(
        (m) => m.isActive && !fieldTypes.some((ft) => ft.key === m.canonicalField.pathKey)
      );

      if (orphanMappings.length > 0) {
        const normalizedOrphans = normalizeProviderPayload(payloadObj, orphanMappings as any);
        for (const [key, val] of Object.entries(normalizedOrphans)) {
          if (
            mergedPayload[key] &&
            typeof mergedPayload[key] === 'object' &&
            !Array.isArray(mergedPayload[key]) &&
            val &&
            typeof val === 'object' &&
            !Array.isArray(val)
          ) {
            mergedPayload[key] = { ...mergedPayload[key], ...val };
          } else {
            mergedPayload[key] = val;
          }
        }
      }
    } else {
      // Se não há mapeamento, dump completo de primeiro nível na raiz
      for (const [key, val] of Object.entries(payloadObj || {})) {
        if (
          mergedPayload[key] &&
          typeof mergedPayload[key] === 'object' &&
          !Array.isArray(mergedPayload[key]) &&
          val &&
          typeof val === 'object' &&
          !Array.isArray(val)
        ) {
          mergedPayload[key] = { ...mergedPayload[key], ...val as any };
        } else {
          mergedPayload[key] = val;
        }
      }
    }
  }

  // 3. Executar Deduplicação Global/Cross-Type se houver múltiplos tipos de dívidas
  const activeDebtTypes = ['DIVIDAS_SPC', 'DIVIDAS_SERASA', 'DIVIDAS_BOA_VISTA'].filter(
    (key) => mergedPayload[key] && Array.isArray(mergedPayload[key]) && mergedPayload[key].length > 0
  );

  if (activeDebtTypes.length > 1) {
    const rowInfo = new Map<
      string,
      {
        rows: Record<string, unknown>[];
        dedupKeys: string[];
        dedupSummary?: Record<string, unknown>;
        dedupKeyToCanonical?: Map<string, string>;
      }
    >();

    const typeKeysInOrder = activeDebtTypes;

    for (const ftKey of activeDebtTypes) {
      const typeData = mergedPayload[ftKey] as Record<string, unknown>[];
      let dedupKeys: string[] = [];
      const dedupKeyToCanonical = new Map<string, string>();

      for (const exec of executions) {
        const product = products.find((p) => p.id === exec.productId);
        if (!product) continue;

        const productFilters: Record<string, any> = (typeof product.typeItemFilters === 'string'
          ? JSON.parse(product.typeItemFilters)
          : product.typeItemFilters) || {};
        
        const typeItemFiltersParsed = parseTypeItemFiltersRecord(productFilters) || {};
        const filterConfig = typeItemFiltersParsed[ftKey];

        if (filterConfig && Array.isArray(filterConfig.dedupFieldIds) && filterConfig.dedupFieldIds.length > 0) {
          const dedupFieldIdSet = new Set(filterConfig.dedupFieldIds);
          const ft = fieldTypes.find((f) => f.key === ftKey);

          if (Array.isArray(filterConfig.fieldMappings)) {
            for (const mapping of filterConfig.fieldMappings) {
              if (dedupFieldIdSet.has(mapping.reportFieldId)) {
                const fieldDef = ft?.reportFieldConfig?.fields?.find((f) => f.id === mapping.reportFieldId);
                if (fieldDef?.key) {
                  dedupKeys.push(fieldDef.key);
                  dedupKeyToCanonical.set(fieldDef.key, fieldDef.key);
                }
              }
            }
          }
        }
      }

      if (dedupKeys.length > 0) {
        dedupKeys = [...new Set(dedupKeys)];
        rowInfo.set(ftKey, {
          rows: typeData,
          dedupKeys,
          dedupKeyToCanonical,
        });
      }
    }

    const byTypeObj: Record<string, any> = {};
    for (const ftKey of activeDebtTypes) {
      byTypeObj[ftKey] = mergedPayload[ftKey];
    }

    const cleaned = buildByTypeWithGlobalDedupRemoved(byTypeObj, typeKeysInOrder, rowInfo);

    for (const ftKey of activeDebtTypes) {
      if (cleaned[ftKey]) {
        mergedPayload[ftKey] = cleaned[ftKey];
      }
    }
  }

  return mergedPayload;
}
