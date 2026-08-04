/**
 * Pivô de arrays paralelos.
 *
 * Alguns tipos canonicos chegam como um objeto cujos campos sao arrays de mesmo
 * indice — colunas de uma tabela achatadas lado a lado. Ex.: em PAGAMENTO_ATRASADO,
 * `ocorrencias_descricao[i]` e `pontuacao[i]` sao a linha `i`.
 *
 * Mas um mesmo tipo pode conter DUAS tabelas de tamanhos diferentes: as 5 faixas
 * de atraso e os 60 meses de historico. Juntar tudo numa tabela pelo maior
 * tamanho enche as colunas curtas de vazio. Por isso os campos sao agrupados por
 * comprimento — cada comprimento vira uma tabela propria, sem linhas vazias.
 *
 * As chaves sinteticas (`__rows0`, `__rows1`…) seguem a ordem de aparicao dos
 * grupos, entao o template gravado continua valido quando o dado real muda de
 * tamanho (campos que andam juntos mantem o mesmo comprimento entre si).
 */

export type PivotGroup = {
  index: number;
  length: number;
  fields: string[];
  rows: Array<Record<string, unknown>>;
};

export type PivotResult = {
  scalars: string[];
  groups: PivotGroup[];
};

export const PIVOT_ROWS_PREFIX = '__rows';

/** Separa escalares de campos-array e agrupa os arrays por comprimento. */
export function pivotValue(value: unknown): PivotResult | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const entries = Object.entries(value as Record<string, unknown>);

  const arrayEntries = entries.filter(
    ([, v]) => Array.isArray(v) && (v as unknown[]).length > 0,
  ) as Array<[string, unknown[]]>;
  if (arrayEntries.length === 0) return null;

  const scalars = entries.filter(([, v]) => !Array.isArray(v)).map(([k]) => k);

  // Agrupa por comprimento, preservando a ordem de aparicao.
  const groupsByLen = new Map<number, string[]>();
  for (const [key, arr] of arrayEntries) {
    const len = arr.length;
    if (!groupsByLen.has(len)) groupsByLen.set(len, []);
    groupsByLen.get(len)!.push(key);
  }

  const groups: PivotGroup[] = [];
  let index = 0;
  for (const [len, fields] of groupsByLen) {
    const rows: Array<Record<string, unknown>> = [];
    for (let i = 0; i < len; i += 1) {
      const row: Record<string, unknown> = {};
      for (const key of fields) {
        row[key] = (value as Record<string, unknown[]>)[key][i];
      }
      rows.push(row);
    }
    groups.push({ index: index += 0, length: len, fields, rows });
    index += 1;
  }
  // Reindexa de forma estavel (0,1,2…).
  groups.forEach((g, i) => (g.index = i));

  return { scalars, groups };
}

/**
 * Enriquece o `data` de renderizacao: para cada tipo com campos-array, adiciona
 * `${pathKey}__rows${grupo}` com as linhas daquele grupo. Nao remove o original.
 */
export function applyPivotToData(
  data: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...data };
  for (const [key, value] of Object.entries(data)) {
    const pivot = pivotValue(value);
    if (!pivot) continue;
    for (const group of pivot.groups) {
      out[`${key}${PIVOT_ROWS_PREFIX}${group.index}`] = group.rows;
    }
  }
  return out;
}
