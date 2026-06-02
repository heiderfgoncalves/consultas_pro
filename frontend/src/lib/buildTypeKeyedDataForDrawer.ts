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

  if (activeRules && parts.length === 0) {
    return {
      linhas: [],
      totaisCalculados: {},
    };
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
        key: fieldDef.key, // Aqui usamos a chave tipada ("para") do Tipo, não o fullPathKey ("de")
        value: formatMappedPreviewValue(
          normalizeMappedFieldValue(values),
          fieldDef.dataType,
        ),
        reportFieldId: mapping.reportFieldId,
      };
    });

  // Campos calculados configurados no integrador
  const computedPreviewRows = buildComputedPreviewRows({
    fieldType,
    filterCfg: normalizedCfg,
    parsedParts,
    partPaths: parts.map((p) => p.path),
  });

  if (mappedFieldRows.length === 0 && computedPreviewRows.length === 0) {
    return {
      linhas: [],
      totaisCalculados: {},
    };
  }

  // Chaves para mapeamento dedupado
  const mappedKeys = mappedFieldRows.map((r) => r.key);
  const mappedDisplayKeys = dedupeReportFieldKeys(mappedKeys);
  const computedDisplayKeys = dedupeReportFieldKeys(computedPreviewRows.map((r) => r.baseKey));
  
  const dedupFieldIdSet = new Set(normalizedCfg.dedupFieldIds);
  const mappedBlock: Record<string, unknown> = {};
  const computedBlock: Record<string, unknown> = {};
  const dedupDisplayKeys: string[] = [];
  const dedupSummary: Record<string, unknown> = {};

  mappedFieldRows.forEach((fieldRow, index) => {
    const displayKey = mappedDisplayKeys[index]!;
    mappedBlock[displayKey] = fieldRow.value;
    if (dedupFieldIdSet.has(fieldRow.reportFieldId)) {
      dedupDisplayKeys.push(displayKey);
    }
  });

  computedPreviewRows.forEach((row, index) => {
    const displayKey = computedDisplayKeys[index]!;
    computedBlock[displayKey] = row.value;
    if (dedupFieldIdSet.has(row.reportFieldId)) {
      dedupDisplayKeys.push(displayKey);
      dedupSummary[displayKey] = row.value;
    }
  });

  // Alinhamento de linhas (zip)
  const zippedMapped = zipAlignedMappedPreviewRows(mappedBlock);
  let zipped: unknown;

  if (Array.isArray(zippedMapped) && Object.keys(computedBlock).length > 0) {
    zipped = wrapMappedPreviewZippedRows(zippedMapped as Record<string, unknown>[], computedBlock);
  } else if (!Array.isArray(zippedMapped) && Object.keys(computedBlock).length > 0) {
    zipped = { ...(zippedMapped as Record<string, unknown>), ...computedBlock };
  } else {
    zipped = zippedMapped;
  }

  // Deduplicação de linhas baseada em campos chave
  const typeKey = fieldType.key;
  const rowsForDedup = isMappedPreviewZipWrapper(zipped)
    ? zipped[MAPPED_PREVIEW_ROWS_KEY]
    : Array.isArray(zippedMapped)
      ? (zippedMapped as Record<string, unknown>[])
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
      { rows: Record<string, unknown>[]; dedupKeys: string[]; dedupSummary?: Record<string, unknown> }
    >();
    rowInfo.set(typeKey, {
      rows: rowsForDedup,
      dedupKeys: dedupDisplayKeys,
      ...(Object.keys(dedupSummary).length > 0 ? { dedupSummary } : {}),
    });
    const cleaned = buildByTypeWithGlobalDedupRemoved(byType, [typeKey], rowInfo);
    zipped = cleaned[typeKey];
  }

  // Formatação final adequada para consumo do Templates Drawer
  if (isMappedPreviewZipWrapper(zipped)) {
    return {
      linhas: (zipped[MAPPED_PREVIEW_ROWS_KEY] as Record<string, unknown>[]) || [],
      totaisCalculados: (zipped[MAPPED_PREVIEW_AGGREGATES_KEY] as Record<string, unknown>) || {},
    };
  }

  if (Array.isArray(zipped)) {
    return {
      linhas: zipped as Record<string, unknown>[],
      totaisCalculados: computedBlock,
    };
  }

  if (zipped && typeof zipped === 'object') {
    // Se mapeado gerou objeto escalar direto (ex: dados cadastrais simples que não são listas aligned)
    const zippedObj = zipped as Record<string, unknown>;
    return {
      ...zippedObj,
      totaisCalculados: computedBlock,
    };
  }

  return null;
}
