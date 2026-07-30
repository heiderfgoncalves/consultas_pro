import type {
  ConsultationFieldType,
  FieldMapping,
  ProviderConsultation,
  TypeItemFilterConfig,
} from '@/types/integrations';

export type DraftMappingSuggestion = {
  typeKey: string;
  typeLabel: string;
  sourcePath: string | null;
  confidence: 'high' | 'review' | 'new' | 'unmapped';
  reason: string;
};

type JsonNode = {
  path: string;
  tail: string;
  value: unknown;
};

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\[\*\]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();
}

function pathTail(path: string) {
  return path.split('.').at(-1)?.replace(/\[\*\]$/g, '') ?? path;
}

function collectJsonNodes(value: unknown, path = ''): JsonNode[] {
  if (Array.isArray(value)) {
    const arrayPath = path.endsWith('[*]') ? path : `${path}[*]`;
    const firstObject = value.find(
      (item) => item !== null && typeof item === 'object',
    );
    return firstObject
      ? [
          { path: arrayPath, tail: pathTail(arrayPath), value },
          ...collectJsonNodes(firstObject, arrayPath),
        ]
      : [{ path: arrayPath, tail: pathTail(arrayPath), value }];
  }
  if (value === null || typeof value !== 'object') return [];

  return Object.entries(value as Record<string, unknown>).flatMap(
    ([key, child]) => {
      const childPath = path ? `${path}.${key}` : key;
      if (child !== null && typeof child === 'object') {
        return [
          { path: childPath, tail: key, value: child },
          ...collectJsonNodes(child, childPath),
        ];
      }
      return [];
    },
  );
}

function collectLeafPaths(value: unknown, path = ''): string[] {
  if (Array.isArray(value)) {
    const first = value.find((item) => item !== null && item !== undefined);
    return first === undefined ? [] : collectLeafPaths(first, path);
  }
  if (value === null || typeof value !== 'object') return path ? [path] : [];
  return Object.entries(value as Record<string, unknown>).flatMap(
    ([key, child]) =>
      collectLeafPaths(child, path ? `${path}.${key}` : key),
  );
}

function inferDataType(value: unknown) {
  if (typeof value === 'boolean') return 'boolean' as const;
  if (typeof value === 'number') return 'numeric' as const;
  const text = String(value ?? '');
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(text)) return 'date' as const;
  if (/^(R\$\s*)?[\d.]+,\d{2}$/.test(text)) return 'currency' as const;
  if (/^\d{11}$|^\d{14}$/.test(text.replace(/\D/g, ''))) {
    return 'document' as const;
  }
  return 'text' as const;
}

function sampleValueAtRelativePath(value: unknown, relativePath: string): unknown {
  let current = value;
  for (const segment of relativePath.split('.')) {
    if (Array.isArray(current)) current = current[0];
    if (current === null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  if (Array.isArray(current)) return current[0];
  return current;
}

function provisionalTypeForBlock(node: JsonNode, keyOverride?: string) {
  const typeKey = keyOverride ?? `NOVO_${normalize(node.path)}`;
  const relativeLeafPaths = collectLeafPaths(node.value);
  const uniquePaths = [...new Set(relativeLeafPaths)].filter(Boolean);
  const fields = uniquePaths.map((jsonPath, index) => {
    const label = pathTail(jsonPath).replace(/_/g, ' ');
    return {
      id: `${typeKey.toLowerCase()}-field-${index}`,
      key: normalize(pathTail(jsonPath)).toLowerCase(),
      label,
      sortOrder: index,
      dataType: inferDataType(sampleValueAtRelativePath(node.value, jsonPath)),
      conditionalRules: [],
    };
  });
  const fieldType: ConsultationFieldType = {
    id: `draft-type-${typeKey.toLowerCase()}`,
    key: typeKey,
    label: keyOverride
      ? keyOverride.replace(/_/g, ' ')
      : `Novo · ${node.tail.replace(/_/g, ' ')}`,
    description: `Tipo provisório descoberto em ${node.path}`,
    color: '#f59e0b',
    icon: 'sparkles',
    reportFieldConfig: {
      version: 1,
      fields,
    },
  };
  const config: TypeItemFilterConfig = {
    version: 2,
    groups: [],
    fieldMappings: fields.map((field, index) => ({
      id: `${typeKey.toLowerCase()}-mapping-${index}`,
      reportFieldId: field.id,
      reportFieldLabel: field.label,
      jsonPath: uniquePaths[index]!,
      sourceTrechoPath: node.path,
    })),
    dedupFieldIds: [],
    computedFields: [],
  };
  return { fieldType, config };
}

function matchScore(
  candidate: JsonNode,
  fieldType: ConsultationFieldType,
  referencePaths: string[],
) {
  const candidateTail = normalize(candidate.tail);
  const candidatePath = normalize(candidate.path);
  const typeKey = normalize(fieldType.key);
  const typeLabel = normalize(fieldType.label);
  let score = 0;
  let reason = '';

  if (candidateTail === typeKey || candidateTail === typeLabel) {
    score = 95;
    reason = 'nome idêntico ao tipo canônico';
  } else if (
    candidatePath.includes(typeKey) ||
    (typeLabel.length >= 5 && candidatePath.includes(typeLabel))
  ) {
    score = 78;
    reason = 'nome compatível com o tipo canônico';
  }

  for (const referencePath of referencePaths) {
    const referenceTail = normalize(pathTail(referencePath));
    const referenceFull = normalize(referencePath);
    if (candidateTail === referenceTail && score < 100) {
      score = 100;
      reason = 'mesmo bloco usado por produto já catalogado';
    } else if (
      referenceTail.length >= 5 &&
      candidatePath.includes(referenceTail) &&
      score < 88
    ) {
      score = 88;
      reason = 'estrutura equivalente a produto já catalogado';
    } else if (candidatePath === referenceFull && score < 105) {
      score = 105;
      reason = 'mesmo caminho usado por produto já catalogado';
    }
  }

  return { score, reason };
}

function cloneFilterConfig(
  config: TypeItemFilterConfig | undefined,
  sourcePath: string,
): TypeItemFilterConfig {
  if (!config) {
    return {
      version: 2,
      groups: [],
      fieldMappings: [],
      dedupFieldIds: [],
      computedFields: [],
    };
  }
  const cloned = JSON.parse(JSON.stringify(config)) as TypeItemFilterConfig;
  cloned.fieldMappings = cloned.fieldMappings.map((mapping) => ({
    ...mapping,
    sourceTrechoPath:
      mapping.sourceTrechoPath &&
      normalize(pathTail(mapping.sourceTrechoPath)) === 'OCORRENCIAS' &&
      normalize(pathTail(sourcePath)) !== 'OCORRENCIAS'
        ? `${sourcePath}.OCORRENCIAS`
        : sourcePath,
  }));
  return cloned;
}

export function buildAutomaticDraftMapping(params: {
  rawJson: string;
  productCode: string;
  productName?: string;
  providerId: string;
  consultations: ProviderConsultation[];
  fieldTypes: ConsultationFieldType[];
}): {
  consultation: ProviderConsultation;
  suggestions: DraftMappingSuggestion[];
  fieldTypes: ConsultationFieldType[];
  coverage: {
    totalLeafPaths: number;
    coveredLeafPaths: number;
    newTypeCount: number;
  };
} {
  const original = JSON.parse(params.rawJson) as unknown;
  const nodes = collectJsonNodes(original);
  const fieldMappings: FieldMapping[] = [];
  const typeItemFilters: Record<string, TypeItemFilterConfig> = {};
  const suggestions: DraftMappingSuggestion[] = [];
  const discoveredFieldTypes: ConsultationFieldType[] = [];
  const claimedPaths = new Set<string>();

  for (const fieldType of params.fieldTypes) {
    const references = params.consultations
      .filter(
        (consultation) =>
          consultation.providerId === params.providerId &&
          consultation.status === 'active',
      )
      .flatMap((consultation) =>
        consultation.fieldMappings
          .filter((mapping) => mapping.fieldTypeKey === fieldType.key)
          .map((mapping) => ({
            consultation,
            path: mapping.jsonPath,
          })),
      );
    const referencePaths = references.map((reference) => reference.path);
    const ranked = nodes
      .map((node) => ({
        node,
        ...matchScore(node, fieldType, referencePaths),
      }))
      .sort((left, right) => right.score - left.score);
    const best = ranked[0];

    if (!best || best.score < 70) {
      suggestions.push({
        typeKey: fieldType.key,
        typeLabel: fieldType.label,
        sourcePath: null,
        confidence: 'unmapped',
        reason: 'nenhum bloco equivalente foi reconhecido',
      });
      continue;
    }

    fieldMappings.push({
      jsonPath: best.node.path,
      fieldTypeKey: fieldType.key,
      label: fieldType.label,
    });
    claimedPaths.add(best.node.path.replace(/\[\*\]$/g, ''));
    const reference =
      references.find(
        (item) => normalize(pathTail(item.path)) === normalize(best.node.tail),
      ) ?? references[0];
    typeItemFilters[fieldType.key] = cloneFilterConfig(
      reference?.consultation.typeItemFilters?.[fieldType.key],
      best.node.path,
    );
    suggestions.push({
      typeKey: fieldType.key,
      typeLabel: fieldType.label,
      sourcePath: best.node.path,
      confidence: best.score >= 88 ? 'high' : 'review',
      reason: reference
        ? `${best.reason} no produto ${reference.consultation.externalId}`
        : best.reason,
    });
  }

  const knownDiscriminators = new Set([
    'BASE I',
    'BASE II',
    'BASE III',
    'BASE 1',
    'BASE 2',
    'BASE 3',
    'SERASA',
    'SPC',
    'SPC BRASIL',
    'BOA VISTA',
    'SCPC',
  ]);
  const discriminatorPaths = new Set<string>();
  const seenDiscriminatorTypes = new Set<string>();

  for (const node of nodes) {
    if (!Array.isArray(node.value)) continue;
    const records = node.value.filter(
      (item): item is Record<string, unknown> =>
        item !== null && typeof item === 'object' && !Array.isArray(item),
    );
    if (records.length === 0) continue;
    const looksLikeDebtOccurrence = records.some((record) =>
      ['VALOR', 'VALOR_DIVIDA', 'CREDOR', 'CONTRATO', 'DATA_VENCIMENTO'].some(
        (field) => record[field] !== undefined,
      ),
    );
    if (!looksLikeDebtOccurrence) continue;
    const values = [
      ...new Set(
        records
          .map((record) => record.INFORMANTE ?? record.PROVEDOR ?? record.BASE)
          .filter((value): value is string => typeof value === 'string')
          .map((value) => value.trim())
          .filter(Boolean),
      ),
    ];

    for (const value of values) {
      const normalizedValue = normalize(value);
      const debtTypeKey = ['BASE_IV', 'BASE_4', 'QUOD'].includes(normalizedValue)
        ? 'DIVIDAS_QUOD'
        : `DIVIDAS_${normalizedValue}`;
      if (
        knownDiscriminators.has(normalizedValue.replace(/_/g, ' ')) ||
        seenDiscriminatorTypes.has(debtTypeKey)
      ) {
        continue;
      }
      const cleanPath = node.path.replace(/\[\*\]$/g, '');
      const provisional = provisionalTypeForBlock(
        { ...node, path: cleanPath },
        debtTypeKey,
      );
      provisional.config.groups = [
        {
          id: `draft-filter-${normalizedValue.toLowerCase()}`,
          joinOperator: 'and',
          rules: [
            {
              id: `draft-rule-${normalizedValue.toLowerCase()}`,
              field: records[0]?.INFORMANTE !== undefined
                ? 'INFORMANTE'
                : records[0]?.PROVEDOR !== undefined
                  ? 'PROVEDOR'
                  : 'BASE',
              op: 'eq',
              value,
            },
          ],
        },
      ];
      discoveredFieldTypes.push(provisional.fieldType);
      fieldMappings.push({
        jsonPath: cleanPath,
        fieldTypeKey: provisional.fieldType.key,
        label: provisional.fieldType.label,
      });
      typeItemFilters[provisional.fieldType.key] = provisional.config;
      suggestions.push({
        typeKey: provisional.fieldType.key,
        typeLabel: provisional.fieldType.label,
        sourcePath: cleanPath,
        confidence: 'new',
        reason: `nova base encontrada pelo valor “${value}”`,
      });
      discriminatorPaths.add(cleanPath);
      claimedPaths.add(cleanPath);
      seenDiscriminatorTypes.add(debtTypeKey);
    }
  }

  const blockCandidates = nodes.filter((node) => {
    const cleanPath = node.path.replace(/\[\*\]$/g, '');
    if (cleanPath !== node.path) return false;
    const depth = cleanPath.split('.').length;
    if (depth === 2) return true;
    if (depth !== 1) return false;
    return !nodes.some(
      (candidate) =>
        candidate.path.startsWith(`${cleanPath}.`) &&
        candidate.path.replace(/\[\*\]$/g, '').split('.').length === 2,
    );
  });

  for (const node of blockCandidates) {
    const cleanPath = node.path.replace(/\[\*\]$/g, '');
    const alreadyCovered = [...claimedPaths].some(
      (path) =>
        cleanPath === path ||
        cleanPath.startsWith(`${path}.`) ||
        path.startsWith(`${cleanPath}.`),
    );
    if (alreadyCovered || discriminatorPaths.has(cleanPath)) continue;
    const provisional = provisionalTypeForBlock({ ...node, path: cleanPath });
    if (provisional.fieldType.reportFieldConfig?.fields.length === 0) continue;

    discoveredFieldTypes.push(provisional.fieldType);
    fieldMappings.push({
      jsonPath: cleanPath,
      fieldTypeKey: provisional.fieldType.key,
      label: provisional.fieldType.label,
    });
    typeItemFilters[provisional.fieldType.key] = provisional.config;
    suggestions.push({
      typeKey: provisional.fieldType.key,
      typeLabel: provisional.fieldType.label,
      sourcePath: cleanPath,
      confidence: 'new',
      reason: 'estrutura inédita catalogada integralmente como tipo provisório',
    });
    claimedPaths.add(cleanPath);
  }

  const declaredCapabilities = nodes.filter(
    (node) => normalize(node.tail) === 'DADOS_RETORNADOS',
  );
  for (const capabilityNode of declaredCapabilities) {
    if (
      capabilityNode.value === null ||
      typeof capabilityNode.value !== 'object' ||
      Array.isArray(capabilityNode.value)
    ) {
      continue;
    }
    for (const [capability, enabled] of Object.entries(
      capabilityNode.value as Record<string, unknown>,
    )) {
      if (!['1', 'TRUE', 'SIM'].includes(String(enabled).toUpperCase())) continue;
      const normalizedCapability = normalize(capability);
      const alreadyRepresented = suggestions.some(
        (suggestion) =>
          normalize(suggestion.typeKey).includes(normalizedCapability) ||
          normalize(suggestion.sourcePath ?? '').includes(normalizedCapability),
      );
      if (alreadyRepresented) continue;
      const typeKey = `PREVISTO_${normalizedCapability}`;
      discoveredFieldTypes.push({
        id: `draft-type-${typeKey.toLowerCase()}`,
        key: typeKey,
        label: `Previsto · ${capability.replace(/_/g, ' ')}`,
        description:
          'Recurso declarado pela Sollos, mas sem estrutura comprovada nesta amostra.',
        color: '#eab308',
        icon: 'circle-help',
        reportFieldConfig: { version: 1, fields: [] },
      });
      suggestions.push({
        typeKey,
        typeLabel: `Previsto · ${capability.replace(/_/g, ' ')}`,
        sourcePath: `${capabilityNode.path}.${capability}`,
        confidence: 'review',
        reason:
          'a Sollos declarou este recurso, mas o documento testado não trouxe dados para mapear os campos',
      });
    }
  }

  const now = new Date().toISOString();
  const totalLeafPaths = collectLeafPaths(original).length;
  return {
    consultation: {
      id: `draft-${params.productCode}`,
      providerId: params.providerId,
      name: params.productName
        ? `${params.productName} · rascunho`
        : `Produto Sollos ${params.productCode} · rascunho`,
      externalId: params.productCode,
      endpoint: '/json/homologa.aspx',
      method: 'POST',
      cost: 0,
      consultationPrice: 0,
      fieldMappings,
      typeItemFilters,
      sampleResponse: params.rawJson,
      updatedAt: now,
      status: 'inactive',
    },
    suggestions,
    fieldTypes: [...params.fieldTypes, ...discoveredFieldTypes],
    coverage: {
      totalLeafPaths,
      coveredLeafPaths: totalLeafPaths,
      newTypeCount: discoveredFieldTypes.length,
    },
  };
}
