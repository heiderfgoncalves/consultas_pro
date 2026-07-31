import {
  BRASILCRED_RADAR_PRONAMPE_TYPES,
  type BrasilCredFieldSpec,
  type BrasilCredTypeSpec,
} from './brasilcred-template-products';

/**
 * Mapeador DE -> PARA do Radar PRONAMPE.
 *
 * DE  = `RadarPronampeResult`, o schema neutro entregue pela API Brasil Cred.
 * PARA = blocos canonicos PRONAMPE_* consumidos pelo Preview e pelo Drawer.
 *
 * Regra central: um bloco inteiramente ausente na origem some do PARA, para que
 * a secao correspondente se auto-oculte em vez de renderizar campos vazios.
 */

/** Le um caminho JSON simples, com suporte a `[*]` para colecoes. */
export function readPath(source: unknown, jsonPath: string): unknown {
  if (!jsonPath) return source;
  let current: unknown = source;
  for (const segment of jsonPath.split('.')) {
    if (current === null || current === undefined) return undefined;
    if (segment.endsWith('[*]')) {
      const key = segment.slice(0, -3);
      const value = (current as Record<string, unknown>)[key];
      return Array.isArray(value) ? value : undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

/**
 * Traduz codigo para o texto exibido ao cliente. Codigo desconhecido e
 * preservado cru — nunca vira texto inventado nem some do relatorio.
 */
export function applyLookup(value: unknown, field: BrasilCredFieldSpec): unknown {
  if (value === null || value === undefined) return undefined;
  if (!field.lookup) return value;
  return field.lookup[String(value)] ?? value;
}

export function buildRadarPronampeMappedData(
  response: Record<string, unknown>,
  types: readonly BrasilCredTypeSpec[] = BRASILCRED_RADAR_PRONAMPE_TYPES,
): Record<string, unknown> {
  const mapped: Record<string, unknown> = {};
  for (const type of types) {
    if (type.isCollection) {
      const rows = readPath(response, `${type.sourcePath}[*]`);
      mapped[type.key] = Array.isArray(rows)
        ? rows.map((row) => {
            const item: Record<string, unknown> = {};
            for (const field of type.fields) {
              const leaf = field.sourcePath.split('[*].').pop() ?? field.key;
              item[field.key] = applyLookup(
                (row as Record<string, unknown>)[leaf],
                field,
              );
            }
            return item;
          })
        : [];
      continue;
    }
    const block: Record<string, unknown> = {};
    let hasValue = false;
    for (const field of type.fields) {
      const value = applyLookup(readPath(response, field.sourcePath), field);
      if (value !== undefined) hasValue = true;
      block[field.key] = value;
    }
    mapped[type.key] = hasValue ? block : undefined;
  }
  return mapped;
}

export type FieldLineage = {
  typeKey: string;
  fieldKey: string;
  sourcePath: string;
  sourceValue: unknown;
  previewValue: unknown;
  status: 'ok' | 'ausente-na-origem' | 'divergente';
};

/**
 * Prova campo a campo que o valor da origem chega ao Preview.
 * E a mesma garantia que a Fabrica exige dos produtos Sollos.
 */
export function auditRadarPronampeLineage(
  response: Record<string, unknown>,
  types: readonly BrasilCredTypeSpec[] = BRASILCRED_RADAR_PRONAMPE_TYPES,
): FieldLineage[] {
  const mapped = buildRadarPronampeMappedData(response, types);
  const lineage: FieldLineage[] = [];

  for (const type of types) {
    const block = mapped[type.key];
    for (const field of type.fields) {
      const sourceValue = readPath(response, field.sourcePath);
      const expected = applyLookup(sourceValue, field);

      let previewValue: unknown;
      if (type.isCollection) {
        const rows = Array.isArray(block)
          ? (block as Record<string, unknown>[])
          : [];
        previewValue = rows.map((row) => row[field.key]);
      } else {
        previewValue =
          block === undefined
            ? undefined
            : (block as Record<string, unknown>)[field.key];
      }

      if (sourceValue === undefined) {
        lineage.push({
          typeKey: type.key,
          fieldKey: field.key,
          sourcePath: field.sourcePath,
          sourceValue,
          previewValue,
          status: 'ausente-na-origem',
        });
        continue;
      }

      const matches = type.isCollection
        ? JSON.stringify(previewValue) ===
          JSON.stringify(
            (sourceValue as unknown[]).map((row) =>
              applyLookup(
                (row as Record<string, unknown>)[
                  field.sourcePath.split('[*].').pop() ?? field.key
                ],
                field,
              ),
            ),
          )
        : JSON.stringify(previewValue) === JSON.stringify(expected);

      lineage.push({
        typeKey: type.key,
        fieldKey: field.key,
        sourcePath: field.sourcePath,
        sourceValue,
        previewValue,
        status: matches ? 'ok' : 'divergente',
      });
    }
  }
  return lineage;
}
