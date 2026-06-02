import type { ProviderFieldMapping } from '@prisma/client';
import { JSONPath } from 'jsonpath-plus';

type MappingWithField = ProviderFieldMapping & {
  canonicalField: {
    pathKey: string;
    dataType: string;
  };
};

export function normalizeProviderPayload(
  rawPayload: unknown,
  mappings: MappingWithField[],
) {
  const normalized: Record<string, unknown> = {};
  const arrayGroups = new Map<string, Array<{
    suffix: string;
    values: unknown[];
    dataType: string;
  }>>();

  for (const mapping of mappings.filter((item) => item.isActive)) {
    const extracted = extractByJsonPath(rawPayload, mapping.sourcePath);
    const pathKey = mapping.canonicalField.pathKey;

    if (pathKey.includes('[].')) {
      const [arrayKey, suffix] = pathKey.split('[].');
      if (!arrayGroups.has(arrayKey)) {
        arrayGroups.set(arrayKey, []);
      }
      arrayGroups.get(arrayKey)!.push({
        suffix,
        values: Array.isArray(extracted) ? extracted : [extracted],
        dataType: mapping.canonicalField.dataType,
      });
      continue;
    }

    const value = Array.isArray(extracted) && extracted.length === 1 ? extracted[0] : extracted;
    setDeep(normalized, pathKey, applyTransform(value, mapping.transformName, mapping.canonicalField.dataType, mapping.fallbackValue));
  }

  for (const [arrayKey, groupedMappings] of arrayGroups.entries()) {
    const maxLength = groupedMappings.reduce((acc, item) => Math.max(acc, item.values.length), 0);
    const rows = Array.from({ length: maxLength }, () => ({} as Record<string, unknown>));

    for (const grouped of groupedMappings) {
      for (let index = 0; index < maxLength; index += 1) {
        const value = grouped.values[index];
        setDeep(rows[index]!, grouped.suffix, applyTransform(value, undefined, grouped.dataType));
      }
    }

    normalized[arrayKey] = rows.filter((row) => Object.keys(row).length > 0);
  }

  return normalized;
}

function extractByJsonPath(payload: unknown, path: string) {
  try {
    return JSONPath({
      path,
      json: payload as any,
      wrap: true,
    }) as any;
  } catch {
    return [];
  }
}

function applyTransform(value: unknown, transformName?: string | null, dataType?: string | null, fallbackValue?: string | null) {
  const candidate = normalizePrimitive(Array.isArray(value) && value.length === 0 ? fallbackValue ?? null : value);

  if (candidate === null || candidate === undefined) return fallbackValue ?? null;

  switch (transformName ?? dataType) {
    case 'number':
      return Number(String(candidate).replace(',', '.'));
    case 'currency':
      return Number(String(candidate).replace(/[^\d,.-]/g, '').replace(',', '.'));
    case 'boolean':
      return ['true', '1', 'sim', 'yes'].includes(String(candidate).toLowerCase());
    case 'date':
      return String(candidate);
    default:
      return candidate;
  }
}

function normalizePrimitive(value: unknown): any {
  if (Array.isArray(value)) {
    if (value.length === 1) return normalizePrimitive(value[0]);
    return value.map(normalizePrimitive);
  }
  return value;
}

function setDeep(target: Record<string, unknown>, path: string, value: unknown) {
  const parts = path.split('.');
  let current: Record<string, unknown> = target;

  parts.forEach((part, index) => {
    const isLast = index === parts.length - 1;
    if (isLast) {
      if (
        current[part] &&
        typeof current[part] === 'object' &&
        !Array.isArray(current[part]) &&
        value &&
        typeof value === 'object' &&
        !Array.isArray(value)
      ) {
        current[part] = { ...current[part] as Record<string, unknown>, ...value as Record<string, unknown> };
      } else {
        current[part] = value;
      }
      return;
    }

    if (!current[part] || typeof current[part] !== 'object' || Array.isArray(current[part])) {
      current[part] = {};
    }

    current = current[part] as Record<string, unknown>;
  });
}
