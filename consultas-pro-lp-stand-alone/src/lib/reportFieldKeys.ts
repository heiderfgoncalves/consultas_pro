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
