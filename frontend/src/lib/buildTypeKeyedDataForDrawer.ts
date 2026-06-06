import type { ConsultationFieldType, FieldMapping, TypeItemFilterConfig } from '@/types/integrations';
import {
  buildByTypeWithGlobalDedupRemoved,
  formatDeepFilteredValueAtPath,
} from '@/lib/providerResponseMapping';
import {
  isMappedPreviewZipWrapper,
  MAPPED_PREVIEW_AGGREGATES_KEY,
  MAPPED_PREVIEW_ROWS_KEY,
  wrapMappedPreviewZippedRows,
} from '@/lib/mappedPreviewZipWrapper';
import { countActiveTypeItemRules, normalizeTypeItemFilterConfig } from '@/lib/typeItemFilters';
import { dedupeReportFieldKeys } from '@/lib/reportFieldKeys';
import { formatMappedPreviewValue } from '@/lib/reportFieldPreviewFormat';
import {
  collectValuesAtPath,
  normalizeMappedFieldValue,
  buildComputedPreviewRows,
  parsePreviewPartText,
  zipAlignedMappedPreviewRows,
} from '@/lib/consultationMappedPreview';

/**
 * Constrói a estrutura de dados normalizada ("para") com base nas chaves dos campos tipados
 * especificamente para uso no Templates Drawer. Evita caminhos físicos aninhados do JSON de origem.
 */
export function buildTypeKeyedDataForDrawer(params: {
  sampleResponse: string;
  trechoMappings: FieldMapping[];
  fieldType: ConsultationFieldType;
  typeItemFilterConfig: TypeItemFilterConfig;
}): Record<string, unknown> | null {
  const { sampleResponse, trechoMappings, fieldType, typeItemFilterConfig } = params;
  const normalizedCfg = normalizeTypeItemFilterConfig(typeItemFilterConfig);

  if (!sampleResponse.trim() || trechoMappings.length === 0) {
    return null;
  }

  const activeRules = countActiveTypeItemRules(normalizedCfg) > 0;

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

  const partsUndeduplicated = trechoMappings
    .map((m) => {
      const { text, hasData } = formatDeepFilteredValueAtPath(
        sampleResponse,
        m.jsonPath,
        normalizedCfg,
        '',
        true, // skipDedup
      );
      return { path: m.jsonPath, text, hasData };
    })
    .filter((p) => !activeRules || p.hasData);

  if (activeRules && parts.length === 0) {
    return {
      linhas: [],
      totaisCalculados: {},
    };
  }

  const parsedParts = parts.map((p) => parsePreviewPartText(p.text));
  const parsedPartsUndeduplicated = partsUndeduplicated.map((p) => parsePreviewPartText(p.text));
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
        key: fieldDef.key, // Aqui usamos a chave tipada ("para") do Tipo, não o fullPathKey ("de")
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
      ...(Object.keys(dedupSummary).length > 0 ? { dedupSummary } : {}),
      ...(dedupKeyToCanonical.size > 0 ? { dedupKeyToCanonical } : {}),
    });
    const cleaned = buildByTypeWithGlobalDedupRemoved(byType, [typeKey], rowInfo);
    zipped = cleaned[typeKey];
  }

  if (zipped) {
    return zipped as Record<string, unknown> | Record<string, unknown>[];
  }

  return [];

  return null;
}
