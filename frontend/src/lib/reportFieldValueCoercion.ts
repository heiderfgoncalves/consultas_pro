import type { ReportFieldDataType } from '@/types/integrations';

/** Remove símbolo R$, espaços finos e normaliza para parse numérico (milhar `.` e decimal `,`). */
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

/**
 * Converte entrada de percentual para valor absoluto em “pontos percentuais” (ex.: 90 para 90%).
 * - `0.9` / `0,9` sem `%` → fração → 90
 * - `0.9%` → 0.9
 * - `10.1` → 10.1
 */
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

/** Formata número absoluto de percentual para exibição estável (ex.: 90 → "90%", 0.9 → "0,90%"). */
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

/** Converte folha para número finito quando possível (agregação). */
export function coerceLeafToNumberForAggregation(
  raw: unknown,
  sourceDataType: ReportFieldDataType | undefined,
): number | null {
  const dt = sourceDataType ?? 'text';
  switch (dt) {
    case 'currency':
      return parseCurrencyBrlToNumber(raw);
    case 'percent':
      return parsePercentToAbsolutePercent(raw);
    case 'numeric': {
      if (raw == null) return null;
      if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
      const s = String(raw).trim().replace(/\./g, '').replace(',', '.');
      const n = Number(s);
      return Number.isFinite(n) ? n : null;
    }
    case 'boolean': {
      const b = coerceBooleanForReport(raw);
      if (b === true) return 1;
      if (b === false) return 0;
      return null;
    }
    default: {
      if (raw == null) return null;
      if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
      const s = String(raw).trim();
      if (!s) return null;
      const n = Number(s.replace(/\./g, '').replace(',', '.'));
      return Number.isFinite(n) ? n : null;
    }
  }
}
