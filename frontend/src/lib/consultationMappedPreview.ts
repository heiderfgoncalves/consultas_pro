import type { ConsultationFieldType, FieldMapping, TypeItemFilterConfig, TypeComputedFieldDefinition } from '@/types/integrations';
import {
  buildByTypeWithGlobalDedupRemoved,
  formatDeepFilteredValueAtPath,
  getRecordPropertyCI,
} from '@/lib/providerResponseMapping';
import {
  isMappedPreviewZipWrapper,
  MAPPED_PREVIEW_AGGREGATES_KEY,
  MAPPED_PREVIEW_ROWS_KEY,
  wrapMappedPreviewZippedRows,
} from '@/lib/mappedPreviewZipWrapper';
import { countActiveTypeItemRules, normalizeTypeItemFilterConfig } from '@/lib/typeItemFilters';
import { dedupeReportFieldKeys, slugifyReportFieldKey } from '@/lib/reportFieldKeys';
import { aggregateComputedFieldValue } from '@/lib/reportFieldComputedAggregation';
import { formatMappedPreviewValue } from '@/lib/reportFieldPreviewFormat';

/** Path absoluto no JSON de retorno: raiz do trecho + path relativo do de-para. */
function joinJsonPaths(trechoRoot: string, relativePath: string): string {
  const root = trechoRoot.trim();
  const rel = relativePath.trim();
  if (!rel) return root;
  if (!root) return rel;
  return `${root}.${rel}`;
}

/** Grava `value` em `target` seguindo segmentos `a.b.c` (como no JSON de origem). */
function assignDotPath(target: Record<string, unknown>, dotPath: string, value: unknown): void {
  const segments = dotPath.split('.').map((s) => s.trim()).filter(Boolean);
  if (segments.length === 0) return;
  let cur: Record<string, unknown> = target;
  for (let i = 0; i < segments.length - 1; i += 1) {
    const seg = segments[i]!;
    const next = cur[seg];
    if (next && typeof next === 'object' && !Array.isArray(next)) {
      cur = next as Record<string, unknown>;
    } else {
      const fresh: Record<string, unknown> = {};
      cur[seg] = fresh;
      cur = fresh;
    }
  }
  cur[segments[segments.length - 1]!] = value;
}

/**
 * Converte chaves `HEADER.PARAMETROS.CPFCNPJ` em objeto aninhado.
 * Chaves com ` · ` (vários trechos) repetem o mesmo valor em cada árvore e fazem merge profundo.
 */
function nestFlatPathRecord(flat: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(flat)) {
    const variants = k.split(' · ').map((p) => p.trim()).filter(Boolean);
    const paths = variants.length > 0 ? variants : [k];
    for (const dotPath of paths) {
      assignDotPath(out, dotPath, v);
    }
  }
  return out;
}

function nestZippedPathsForDisplay(zipped: unknown): unknown {
  if (isMappedPreviewZipWrapper(zipped)) {
    const agg = zipped[MAPPED_PREVIEW_AGGREGATES_KEY];
    const rows = zipped[MAPPED_PREVIEW_ROWS_KEY];
    const nestedRows = rows.map((row) => nestFlatPathRecord(row));
    const nestedAgg =
      agg != null && typeof agg === 'object' && !Array.isArray(agg)
        ? nestFlatPathRecord(agg as Record<string, unknown>)
        : agg;
    return {
      [MAPPED_PREVIEW_AGGREGATES_KEY]: nestedAgg ?? {},
      [MAPPED_PREVIEW_ROWS_KEY]: nestedRows,
    };
  }
  if (Array.isArray(zipped)) {
    if (zipped.every((el) => el != null && typeof el === 'object' && !Array.isArray(el))) {
      return (zipped as Record<string, unknown>[]).map((row) => nestFlatPathRecord(row));
    }
    return zipped;
  }
  if (zipped !== null && typeof zipped === 'object' && !Array.isArray(zipped)) {
    return nestFlatPathRecord(zipped as Record<string, unknown>);
  }
  return zipped;
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

export function collectValuesAtPath(value: unknown, path: string): unknown[] {
  if (path.trim() === '$') {
    return value === null || value === undefined ? [] : [value];
  }
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

/** Preview: objetos só com arrays do mesmo tamanho viram lista de linhas (cada índice = uma ocorrência). */
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

/** Uma entrada por linha da origem; não remove repetidos (origem/contrato repetem entre linhas). */
export function normalizeMappedFieldValue(values: unknown[]): unknown {
  if (values.length === 0) return null;
  if (values.length === 1) return values[0];
  return values;
}

/** Linhas de preview: campos mapeados + calculados (mesma ordem lógica do JsonFieldMapper). */
export function buildComputedPreviewRows(params: {
  fieldType: ConsultationFieldType;
  filterCfg: TypeItemFilterConfig;
  parsedParts: unknown[];
  parsedPartsUndeduplicated?: unknown[];
  partPaths: string[];
}): { baseKey: string; value: unknown; reportFieldId: string }[] {
  return [];
}

/**
 * Preview na aba Tipos: mesmos valores filtrados/formatados do preview da consulta (“para”),
 * organizados na hierarquia do retorno (“de”: trecho + jsonPath → objeto aninhado, `JSON.stringify` indentado).
 */
export function buildTypeLinkedConsultationMappedPreview(params: {
  sampleResponse: string;
  trechoMappings: FieldMapping[];
  fieldType: ConsultationFieldType;
  typeItemFilterConfig: TypeItemFilterConfig;
}): string {
  const { sampleResponse, trechoMappings, fieldType, typeItemFilterConfig } = params;
  const normalizedCfg = normalizeTypeItemFilterConfig(typeItemFilterConfig);

  if (!sampleResponse.trim() || trechoMappings.length === 0) {
    return '—';
  }

  const activeRules = countActiveTypeItemRules(normalizedCfg) > 0;

  const parts = trechoMappings.map((m) => {
    const { text, hasData } = formatDeepFilteredValueAtPath(
      sampleResponse,
      m.jsonPath,
      normalizedCfg,
      '',
    );
    return { path: m.jsonPath, text, hasData };
  }).filter((p) => !activeRules || p.hasData);

  const partsUndeduplicated = trechoMappings.map((m) => {
    const { text, hasData } = formatDeepFilteredValueAtPath(
      sampleResponse,
      m.jsonPath,
      normalizedCfg,
      '',
      true, // skipDedup
    );
    return { path: m.jsonPath, text, hasData };
  }).filter((p) => !activeRules || p.hasData);

  if (activeRules && parts.length === 0) {
    return 'Nenhum trecho corresponde aos critérios.';
  }

  const parsedParts = parts.map((p) => parsePreviewPartText(p.text));
  const parsedPartsUndeduplicated = partsUndeduplicated.map((p) => parsePreviewPartText(p.text));
  const fieldsById = new Map(
    (fieldType.reportFieldConfig?.fields ?? []).map((f) => [f.id, f]),
  );

  const mappedFieldRows = normalizedCfg.fieldMappings
    .filter((mapping) => mapping.jsonPath.trim().length > 0)
    .filter((mapping) => fieldsById.has(mapping.reportFieldId))
    .map((mapping) => {
      const fieldDef = fieldsById.get(mapping.reportFieldId);
      const trechoFilter = mapping.sourceTrechoPath?.trim() ?? '';
      const relPath = mapping.jsonPath.trim();
      const pathRoots: string[] = [];
      const values: unknown[] = [];
      for (let idx = 0; idx < parts.length; idx += 1) {
        const part = parts[idx]!;
        if (trechoFilter.length > 0 && part.path !== trechoFilter) continue;
        const partValue = parsedParts[idx];
        if (partValue == null) continue;
        const chunk = collectValuesAtPath(partValue, relPath);
        if (chunk.length === 0) continue;
        pathRoots.push(joinJsonPaths(part.path, relPath));
        values.push(...chunk);
      }
      const uniqueRoots = [...new Set(pathRoots)].sort((a, b) => a.localeCompare(b, 'pt-BR'));
      const fullPathKey =
        uniqueRoots.length === 0
          ? ''
          : uniqueRoots.length === 1
            ? uniqueRoots[0]!
            : uniqueRoots.join(' · ');
      return {
        fullPathKey,
        value: formatMappedPreviewValue(
          normalizeMappedFieldValue(values),
          fieldDef?.dataType,
        ),
        reportFieldId: mapping.reportFieldId,
      };
    })
    .filter((row) => row.fullPathKey.length > 0);

  const computedPreviewRows = buildComputedPreviewRows({
    fieldType,
    filterCfg: normalizedCfg,
    parsedParts,
    parsedPartsUndeduplicated,
    partPaths: parts.map((p) => p.path),
  });

  if (mappedFieldRows.length === 0 && computedPreviewRows.length === 0) {
    const hasComputedDefs = (normalizedCfg.computedFields ?? []).length > 0;
    if (normalizedCfg.fieldMappings.length === 0 && !hasComputedDefs) {
      return 'Defina o de-para dos campos do tipo na consulta (aba Consultas → mapeamento ou critérios do tipo).';
    }
    if (hasComputedDefs) {
      return 'Configure o de-para do campo fonte do cálculo ou verifique paths e trechos.';
    }
    return 'Nenhum campo do tipo com de-para válido para esta consulta (confira campos do relatório e paths).';
  }

  const mappedDisplayKeys = dedupeReportFieldKeys(mappedFieldRows.map((r) => r.fullPathKey));
  const computedDisplayKeys = dedupeReportFieldKeys(computedPreviewRows.map((r) => r.baseKey));
  const dedupFieldIdSet = new Set(normalizedCfg.dedupFieldIds);
  const mappedBlock: Record<string, unknown> = {};
  const computedBlock: Record<string, unknown> = {};
  const dedupDisplayKeys: string[] = [];
  /** displayKey → reportFieldId canônico para fingerprint cross-type */
  const dedupKeyToCanonical = new Map<string, string>();
  const dedupSummary: Record<string, unknown> = {};
  mappedFieldRows.forEach((fieldRow, index) => {
    const displayKey = mappedDisplayKeys[index]!;
    mappedBlock[displayKey] = fieldRow.value;
    if (dedupFieldIdSet.has(fieldRow.reportFieldId)) {
      dedupDisplayKeys.push(displayKey);
      dedupKeyToCanonical.set(displayKey, fieldRow.reportFieldId);
    }
  });
  computedPreviewRows.forEach((row, index) => {
    const displayKey = computedDisplayKeys[index]!;
    computedBlock[displayKey] = row.value;
  });

  const zippedMapped = zipAlignedMappedPreviewRows(mappedBlock);
  let zipped: unknown;
  if (Array.isArray(zippedMapped) && Object.keys(computedBlock).length > 0) {
    zipped = wrapMappedPreviewZippedRows(zippedMapped as Record<string, unknown>[], computedBlock);
  } else if (!Array.isArray(zippedMapped) && Object.keys(computedBlock).length > 0) {
    zipped = { ...(zippedMapped as Record<string, unknown>), ...computedBlock };
  } else {
    zipped = zippedMapped;
  }

  const typeKey = fieldType.key;
  const rowsForDedup = isMappedPreviewZipWrapper(zipped)
    ? zipped[MAPPED_PREVIEW_ROWS_KEY]
    : Array.isArray(zippedMapped)
      ? (zippedMapped as Record<string, unknown>[])
      : null;
  if (
    dedupDisplayKeys.length > 0
    && rowsForDedup != null
    && rowsForDedup.length > 0
    && rowsForDedup.every((el) => el != null && typeof el === 'object' && !Array.isArray(el))
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
      ...(Object.keys(dedupSummary).length > 0 ? { dedupSummary } : {}),
      ...(dedupKeyToCanonical.size > 0 ? { dedupKeyToCanonical } : {}),
    });
    const cleaned = buildByTypeWithGlobalDedupRemoved(byType, [typeKey], rowInfo);
    zipped = cleaned[typeKey];
  }

  const nested = nestZippedPathsForDisplay(zipped);
  return JSON.stringify(nested, null, 2) || '—';
}
