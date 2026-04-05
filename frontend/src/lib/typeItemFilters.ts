import type {
  MappingItemFilter,
  MappingItemFilterOp,
  TypeItemFieldMapping,
  TypeItemFilterConfig,
  TypeItemFilterGroup,
  TypeItemFilterRule,
} from '@/types/integrations';

const FILTER_OPS = new Set<MappingItemFilterOp>(['eq', 'contains', 'startsWith', 'endsWith', 'regex']);

function createId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeFilterOp(value: unknown): MappingItemFilterOp {
  return typeof value === 'string' && FILTER_OPS.has(value as MappingItemFilterOp)
    ? (value as MappingItemFilterOp)
    : 'eq';
}

function normalizeLegacyFilter(raw: unknown): MappingItemFilter | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const item = raw as Record<string, unknown>;
  return {
    field: typeof item.field === 'string' ? item.field : '',
    op: normalizeFilterOp(item.op),
    value: item.value == null ? '' : String(item.value),
  };
}

function normalizeRule(raw: unknown, index: number): TypeItemFilterRule | null {
  const normalized = normalizeLegacyFilter(raw);
  if (!normalized) return null;
  const item = raw as Record<string, unknown>;
  return {
    id: typeof item.id === 'string' && item.id.trim() ? item.id : createId(`rule_${index + 1}`),
    ...normalized,
  };
}

function normalizeFieldMapping(raw: unknown, index: number): TypeItemFieldMapping | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const item = raw as Record<string, unknown>;
  return {
    id: typeof item.id === 'string' && item.id.trim() ? item.id : createId(`map_${index + 1}`),
    reportFieldId: typeof item.reportFieldId === 'string' ? item.reportFieldId : '',
    reportFieldLabel: typeof item.reportFieldLabel === 'string' ? item.reportFieldLabel : '',
    jsonPath: typeof item.jsonPath === 'string' ? item.jsonPath : '',
  };
}

function normalizeGroup(raw: unknown, index: number): TypeItemFilterGroup | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const item = raw as Record<string, unknown>;
  const rules = Array.isArray(item.rules)
    ? item.rules
        .map((rule, ruleIndex) => normalizeRule(rule, ruleIndex))
        .filter((rule): rule is TypeItemFilterRule => !!rule)
    : [];

  return {
    id: typeof item.id === 'string' && item.id.trim() ? item.id : createId(`group_${index + 1}`),
    joinOperator: item.joinOperator === 'or' ? 'or' : 'and',
    rules,
  };
}

export function createTypeItemFilterRule(seed?: Partial<MappingItemFilter>): TypeItemFilterRule {
  return {
    id: createId('rule'),
    field: seed?.field ?? '',
    op: normalizeFilterOp(seed?.op),
    value: seed?.value ?? '',
  };
}

export function createTypeItemFilterGroup(
  joinOperator: TypeItemFilterGroup['joinOperator'] = 'and',
  rules: MappingItemFilter[] = [],
): TypeItemFilterGroup {
  return {
    id: createId('group'),
    joinOperator,
    rules: rules.length ? rules.map((rule) => createTypeItemFilterRule(rule)) : [],
  };
}

export function emptyTypeItemFilterConfig(): TypeItemFilterConfig {
  return {
    version: 2,
    groups: [],
    fieldMappings: [],
    dedupFieldIds: [],
  };
}

export function cloneTypeItemFilterConfig(config?: TypeItemFilterConfig): TypeItemFilterConfig {
  const normalized = normalizeTypeItemFilterConfig(config);
  return {
    version: 2,
    groups: normalized.groups.map((group) => ({
      id: group.id,
      joinOperator: group.joinOperator,
      rules: group.rules.map((rule) => ({ ...rule })),
    })),
    fieldMappings: normalized.fieldMappings.map((mapping) => ({ ...mapping })),
    dedupFieldIds: [...normalized.dedupFieldIds],
  };
}

export function normalizeTypeItemFilterConfig(raw: unknown): TypeItemFilterConfig {
  if (Array.isArray(raw)) {
    const rules = raw
      .map((item, index) => normalizeRule(item, index))
      .filter((item): item is TypeItemFilterRule => !!item);
    return {
      version: 2,
      groups: rules.length ? [{ id: createId('group_legacy'), joinOperator: 'and', rules }] : [],
      fieldMappings: [],
      dedupFieldIds: [],
    };
  }

  if (!raw || typeof raw !== 'object') return emptyTypeItemFilterConfig();

  const item = raw as Record<string, unknown>;
  const groups = Array.isArray(item.groups)
    ? item.groups
        .map((group, index) => normalizeGroup(group, index))
        .filter((group): group is TypeItemFilterGroup => !!group)
    : [];
  const fieldMappings = Array.isArray(item.fieldMappings)
    ? item.fieldMappings
        .map((mapping, index) => normalizeFieldMapping(mapping, index))
        .filter((mapping): mapping is TypeItemFieldMapping => !!mapping)
    : [];
  const dedupFieldIds = Array.isArray(item.dedupFieldIds)
    ? item.dedupFieldIds.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    : [];

  return {
    version: 2,
    groups: groups.filter((g) => g.rules.length > 0),
    fieldMappings,
    dedupFieldIds,
  };
}

export function parseTypeItemFiltersRecord(raw: unknown): Record<string, TypeItemFilterConfig> | undefined {
  let value = raw;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    try {
      value = JSON.parse(trimmed) as unknown;
    } catch {
      return undefined;
    }
  }

  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;

  const out: Record<string, TypeItemFilterConfig> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (!item) continue;
    if (!Array.isArray(item) && (typeof item !== 'object' || item === null)) continue;
    out[key] = normalizeTypeItemFilterConfig(item);
  }

  return Object.keys(out).length > 0 ? out : undefined;
}

export function flattenTypeItemFilterRules(config?: TypeItemFilterConfig): MappingItemFilter[] {
  if (!config) return [];
  return config.groups.flatMap((group) =>
    group.rules.map((rule) => ({
      field: rule.field,
      op: rule.op,
      value: rule.value,
    })),
  );
}

export function countActiveTypeItemRules(config?: TypeItemFilterConfig): number {
  if (!config) return 0;
  return config.groups.reduce(
    (total, group) => total + group.rules.filter((rule) => rule.field.trim().length > 0).length,
    0,
  );
}

export function getActiveTypeItemFilterGroups(config?: TypeItemFilterConfig): TypeItemFilterGroup[] {
  if (!config) return [];
  return config.groups
    .map((group) => ({
      ...group,
      rules: group.rules.filter((rule) => rule.field.trim().length > 0),
    }))
    .filter((group) => group.rules.length > 0);
}

export function buildSingleGroupTypeItemFilterConfig(
  filters: MappingItemFilter[],
  existing?: TypeItemFilterConfig,
): TypeItemFilterConfig {
  const normalized = existing ? cloneTypeItemFilterConfig(existing) : emptyTypeItemFilterConfig();
  const rules = filters.map((rule) => createTypeItemFilterRule(rule));
  normalized.groups = rules.length ? [{ id: normalized.groups[0]?.id ?? createId('group'), joinOperator: 'and', rules }] : [];
  return normalized;
}
