import type { ReportFieldDataType } from '@/types/integrations';

function digitsOnly(raw: string): string {
  return raw.replace(/\D/g, '');
}

/** CPF/CNPJ com máscara quando há 11 ou 14 dígitos; caso contrário devolve o texto original. */
export function formatDocumentBrDisplay(raw: unknown): string {
  if (raw == null) return '';
  const s0 = String(raw).trim();
  const d = digitsOnly(s0);
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
  const s = String(raw).trim();
  if (!s) return '';
  const normalized = s.replace(/\./g, '').replace(',', '.');
  const n = Number(normalized);
  if (Number.isFinite(n)) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
  }
  return s;
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
      return new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 4 }).format(raw);
    }
    const body = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 4 }).format(raw);
    return `${body} %`;
  }
  const s = String(raw).trim();
  if (!s) return '';
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

function formatLeaf(raw: unknown, dataType: ReportFieldDataType): unknown {
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
    case 'boolean':
      return raw;
    case 'text':
    default:
      return typeof raw === 'string' ? raw : String(raw);
  }
}

/** Aplica formatação de preview conforme o tipo do campo do relatório (folhas e arrays de folhas). */
export function formatMappedPreviewValue(value: unknown, dataType: ReportFieldDataType | undefined): unknown {
  const dt = dataType ?? 'text';
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map((v) => formatMappedPreviewValue(v, dt));
  if (value !== null && typeof value === 'object') return value;
  return formatLeaf(value, dt);
}
