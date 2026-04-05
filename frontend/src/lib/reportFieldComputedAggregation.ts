import type { ReportFieldDataType, TypeComputedFieldDefinition, TypeComputedFieldOperator } from '@/types/integrations';
import { formatMappedPreviewValue } from '@/lib/reportFieldPreviewFormat';
import { coerceLeafToNumberForAggregation } from '@/lib/reportFieldValueCoercion';

function aggregateNumbers(nums: number[], op: TypeComputedFieldOperator): number | null {
  if (nums.length === 0) return null;
  switch (op) {
    case 'sum':
      return nums.reduce((a, b) => a + b, 0);
    case 'avg':
      return nums.reduce((a, b) => a + b, 0) / nums.length;
    case 'min':
      return Math.min(...nums);
    case 'max':
      return Math.max(...nums);
    case 'count':
      return nums.length;
    default:
      return null;
  }
}

/**
 * Agrega valores crus coletados do trecho conforme operador e tipos de origem/destino.
 */
export function aggregateComputedFieldValue(params: {
  rawValues: unknown[];
  sourceDataType: ReportFieldDataType | undefined;
  definition: TypeComputedFieldDefinition;
}): unknown {
  const { rawValues, sourceDataType, definition } = params;
  const { operator, dataType: outputDataType } = definition;

  if (operator === 'count') {
    const n = rawValues.filter((v) => v != null && String(v).trim() !== '').length;
    return formatMappedPreviewValue(n, outputDataType);
  }

  const nums = rawValues
    .map((v) => coerceLeafToNumberForAggregation(v, sourceDataType))
    .filter((n): n is number => n != null && Number.isFinite(n));

  const aggregated = aggregateNumbers(nums, operator);
  if (aggregated == null) return null;

  return formatMappedPreviewValue(aggregated, outputDataType);
}
