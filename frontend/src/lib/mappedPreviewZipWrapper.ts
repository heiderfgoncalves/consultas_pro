/** Chaves estáveis do JSON de preview quando há zip + campos calculados (agregados fora das linhas). */
export const MAPPED_PREVIEW_AGGREGATES_KEY = 'totaisCalculados';
export const MAPPED_PREVIEW_ROWS_KEY = 'linhas';

export function isMappedPreviewZipWrapper(v: unknown): v is {
  [MAPPED_PREVIEW_AGGREGATES_KEY]: Record<string, unknown>;
  [MAPPED_PREVIEW_ROWS_KEY]: Record<string, unknown>[];
} {
  if (v == null || typeof v !== 'object' || Array.isArray(v)) return false;
  const o = v as Record<string, unknown>;
  const rows = o[MAPPED_PREVIEW_ROWS_KEY];
  if (!Array.isArray(rows)) return false;
  return rows.every((el) => el != null && typeof el === 'object' && !Array.isArray(el));
}

export function wrapMappedPreviewZippedRows(
  zippedRows: Record<string, unknown>[],
  aggregates: Record<string, unknown>,
): Record<string, unknown> {
  return {
    [MAPPED_PREVIEW_AGGREGATES_KEY]: aggregates,
    [MAPPED_PREVIEW_ROWS_KEY]: zippedRows,
  };
}
