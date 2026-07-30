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
    return [
      ...new Set(
        value.flatMap((item) =>
          item === null || item === undefined
            ? []
            : collectLeafPaths(item, path),
        ),
      ),
    ];
  }
  if (value === null || typeof value !== 'object') return path ? [path] : [];
  return [
    ...new Set(
      Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
        collectLeafPaths(child, path ? `${path}.${key}` : key),
      ),
    ),
  ];
}

type RoutedDebtBlock = {
  blockPath: string;
  occurrencePath: string;
  leafPaths: string[];
};

function collectRoutedDebtBlocks(
  value: unknown,
  path = '',
): RoutedDebtBlock[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => collectRoutedDebtBlocks(item, path));
  }
  if (value === null || typeof value !== 'object') return [];

  return Object.entries(value as Record<string, unknown>).flatMap(
    ([key, child]) => {
      const childPath = path ? `${path}.${key}` : key;
      const nested = collectRoutedDebtBlocks(child, childPath);
      if (
        !/^(PEND_FINANCEIRAS|PEND_REFIN|PEND_VENCIDAS)$/i.test(key) ||
        child === null ||
        typeof child !== 'object' ||
        Array.isArray(child)
      ) {
        return nested;
      }
      const occurrences = (
        child as Record<string, unknown>
      ).OCORRENCIAS;
      if (!Array.isArray(occurrences)) return nested;
      const occurrencePath = `${childPath}.OCORRENCIAS`;
      const leafPaths = collectLeafPaths(occurrences).map(
        (leafPath) => `${occurrencePath}.${leafPath}`,
      );
      return [
        {
          blockPath: childPath,
          occurrencePath,
          leafPaths,
        },
        ...nested,
      ];
    },
  );
}

function completeTypeForBlock(params: {
  node: JsonNode;
  typeKey: string;
  label: string;
  description: string;
  baseType?: ConsultationFieldType;
  baseConfig?: TypeItemFilterConfig;
  leafPaths?: string[];
}) {
  const {
    node,
    typeKey,
    label,
    description,
    baseType,
    baseConfig,
    leafPaths,
  } = params;
  const relativeLeafPaths = collectLeafPaths(node.value);
  const uniquePaths = [
    ...new Set(leafPaths ?? relativeLeafPaths),
  ].filter(Boolean);
  const existingFields = new Map(
    (baseType?.reportFieldConfig?.fields ?? []).map((field) => [field.id, field]),
  );
  const existingMappings = baseConfig?.fieldMappings ?? [];
  const existingByPath = new Map(
    existingMappings.map((mapping) => [normalize(mapping.jsonPath), mapping]),
  );
  const tailCounts = new Map<string, number>();
  for (const path of uniquePaths) {
    const tail = normalize(pathTail(path));
    tailCounts.set(tail, (tailCounts.get(tail) ?? 0) + 1);
  }
  const usedKeys = new Set<string>();
  const fields = uniquePaths.map((jsonPath, index) => {
    const existingMapping = existingByPath.get(normalize(jsonPath));
    const existingField = existingMapping
      ? existingFields.get(existingMapping.reportFieldId)
      : undefined;
    const normalizedTail = normalize(pathTail(jsonPath));
    const hasDuplicateTail =
      (tailCounts.get(normalizedTail) ?? 0) > 1 ||
      usedKeys.has(existingField?.key ?? normalizedTail.toLowerCase());
    const uniqueKeySource = hasDuplicateTail ? jsonPath : pathTail(jsonPath);
    const label = (hasDuplicateTail ? jsonPath : pathTail(jsonPath)).replace(
      /[._]/g,
      ' ',
    );
    const key = existingField?.key ?? normalize(uniqueKeySource).toLowerCase();
    usedKeys.add(key);
    return existingField
      ? { ...existingField, sortOrder: index }
      : {
      id: `${typeKey.toLowerCase()}-field-${normalize(jsonPath).toLowerCase()}`,
      key,
      label,
      sortOrder: index,
      dataType: 'text' as const,
      conditionalRules: [],
        };
  });
  const fieldType: ConsultationFieldType = {
    ...(baseType ?? {
      id: `draft-type-${typeKey.toLowerCase()}`,
      key: typeKey,
      label,
      color: '#f59e0b',
      icon: 'sparkles',
    }),
    key: typeKey,
    label,
    description,
    reportFieldConfig: {
      version: 1,
      fields,
    },
  };
  const config: TypeItemFilterConfig = {
    ...(baseConfig ?? {}),
    version: 2,
    groups: baseConfig?.groups ?? [],
    fieldMappings: fields.map((field, index) => {
      const jsonPath = uniquePaths[index]!;
      const existingMapping = existingByPath.get(normalize(jsonPath));
      return {
      id:
        existingMapping?.id ??
        `${typeKey.toLowerCase()}-mapping-${normalize(jsonPath).toLowerCase()}`,
      reportFieldId: field.id,
      reportFieldLabel: field.label,
      jsonPath,
      sourceTrechoPath: node.path.replace(/\[\*\]$/g, ''),
      };
    }),
    dedupFieldIds: (baseConfig?.dedupFieldIds ?? []).filter((fieldId) =>
      fields.some((field) => field.id === fieldId),
    ),
    computedFields: baseConfig?.computedFields ?? [],
  };
  return { fieldType, config };
}

function provisionalTypeForBlock(
  node: JsonNode,
  keyOverride?: string,
  leafPaths?: string[],
) {
  const typeKey = keyOverride ?? `NOVO_${normalize(node.path)}`;
  return completeTypeForBlock({
    node,
    typeKey,
    label: keyOverride
      ? keyOverride.replace(/_/g, ' ')
      : `Novo · ${node.tail.replace(/_/g, ' ')}`,
    description: `Tipo provisório descoberto em ${node.path}`,
    leafPaths,
  });
}

function provisionalTypeForScalar(path: string) {
  const typeKey = `NOVO_${normalize(path)}`;
  const fieldId = `${typeKey.toLowerCase()}-field-value`;
  const fieldKey = normalize(pathTail(path)).toLowerCase();
  const fieldType: ConsultationFieldType = {
    id: `draft-type-${typeKey.toLowerCase()}`,
    key: typeKey,
    label: `Novo · ${pathTail(path).replace(/_/g, ' ')}`,
    description: `Valor de raiz descoberto em ${path}`,
    color: '#f59e0b',
    icon: 'sparkles',
    reportFieldConfig: {
      version: 1,
      fields: [
        {
          id: fieldId,
          key: fieldKey,
          label: pathTail(path).replace(/_/g, ' '),
          sortOrder: 0,
          dataType: 'text',
          conditionalRules: [],
        },
      ],
    },
  };
  const config: TypeItemFilterConfig = {
    version: 2,
    groups: [],
    fieldMappings: [
      {
        id: `${typeKey.toLowerCase()}-mapping-value`,
        reportFieldId: fieldId,
        reportFieldLabel: pathTail(path).replace(/_/g, ' '),
        jsonPath: '$',
        sourceTrechoPath: path,
      },
    ],
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
  const genericTails = new Set([
    'OCORRENCIAS',
    'STATUS_RETORNO',
    'PROVEDORES',
    'ITENS',
    'DADOS',
    'RESULTADO',
  ]);

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
    const referenceParent = normalize(
      referencePath.split('.').slice(0, -1).join('.'),
    );
    const candidateParent = normalize(
      candidate.path.split('.').slice(0, -1).join('.'),
    );
    if (candidatePath === referenceFull && score < 110) {
      score = 110;
      reason = 'mesmo caminho usado por produto já catalogado';
    } else if (
      candidateTail === referenceTail &&
      candidateParent === referenceParent &&
      score < 105
    ) {
      score = 105;
      reason = 'mesmo bloco e mesmo contexto do produto catalogado';
    } else if (
      candidateTail === referenceTail &&
      !genericTails.has(candidateTail) &&
      score < 88
    ) {
      score = 88;
      reason = 'mesmo bloco semântico usado por produto já catalogado';
    } else if (
      referenceTail.length >= 5 &&
      !genericTails.has(referenceTail) &&
      candidatePath.includes(referenceTail) &&
      score < 82
    ) {
      score = 82;
      reason = 'estrutura equivalente a produto já catalogado';
    }
  }

  return { score, reason };
}

function cloneFilterConfig(
  config: TypeItemFilterConfig | undefined,
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
  return JSON.parse(JSON.stringify(config)) as TypeItemFilterConfig;
}

const CANONICAL_DEBT_TYPES = new Set([
  'DIVIDAS_SERASA',
  'DIVIDAS_SPC',
  'DIVIDAS_BOA_VISTA',
  'DIVIDAS_QUOD',
]);

function absoluteMappedLeafPaths(
  fieldMappings: FieldMapping[],
  typeItemFilters: Record<string, TypeItemFilterConfig>,
) {
  const paths = new Set<string>();
  for (const mapping of fieldMappings) {
    const config = typeItemFilters[mapping.fieldTypeKey];
    for (const fieldMapping of config?.fieldMappings ?? []) {
      const root = fieldMapping.sourceTrechoPath?.trim() || mapping.jsonPath;
      const relative = fieldMapping.jsonPath.trim();
      if (!root || !relative) continue;
      paths.add(
        (relative === '$' ? root : `${root}.${relative}`)
          .replace(/\[\*\]/g, '')
          .replace(/\[\]/g, ''),
      );
    }
  }
  return paths;
}

export type AutomaticDraftMapping = {
  consultation: ProviderConsultation;
  suggestions: DraftMappingSuggestion[];
  fieldTypes: ConsultationFieldType[];
  coverage: {
    totalLeafPaths: number;
    coveredLeafPaths: number;
    uncoveredLeafPaths: string[];
    newTypeCount: number;
  };
};

export function buildAutomaticDraftMapping(params: {
  rawJson: string;
  productCode: string;
  productName?: string;
  providerId: string;
  consultations: ProviderConsultation[];
  fieldTypes: ConsultationFieldType[];
}): AutomaticDraftMapping {
  const original = JSON.parse(params.rawJson) as unknown;
  const nodes = collectJsonNodes(original);
  const fieldMappings: FieldMapping[] = [];
  const typeItemFilters: Record<string, TypeItemFilterConfig> = {};
  const suggestions: DraftMappingSuggestion[] = [];
  const discoveredFieldTypes: ConsultationFieldType[] = [];
  const expandedFieldTypes: ConsultationFieldType[] = [];
  const claimedPaths = new Set<string>();
  const routedDebtBlocks = collectRoutedDebtBlocks(original);
  const routedDebtLeafPaths = new Set(
    routedDebtBlocks.flatMap((block) => block.leafPaths),
  );

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
    const allowsSharedPath = CANONICAL_DEBT_TYPES.has(fieldType.key);
    const ranked = nodes
      .filter((node) => {
        const cleanPath = node.path.replace(/\[\*\]$/g, '');
        return allowsSharedPath || !claimedPaths.has(cleanPath);
      })
      .map((node) => ({
        node,
        ...matchScore(node, fieldType, referencePaths),
      }))
      .sort((left, right) => right.score - left.score);
    const best = ranked[0];

    if (!best || best.score < 70) {
      continue;
    }

    const cleanBestPath = best.node.path.replace(/\[\*\]$/g, '');
    const reference =
      references.find(
        (item) => normalize(pathTail(item.path)) === normalize(best.node.tail),
      ) ?? references[0];
    const complete = completeTypeForBlock({
      node: { ...best.node, path: cleanBestPath },
      typeKey: fieldType.key,
      label: fieldType.label,
      description:
        fieldType.description ||
        `Tipo reaproveitado e completado para ${cleanBestPath}`,
      baseType: fieldType,
      baseConfig: cloneFilterConfig(
        reference?.consultation.typeItemFilters?.[fieldType.key],
      ),
    });
    expandedFieldTypes.push(complete.fieldType);
    fieldMappings.push({
      jsonPath: cleanBestPath,
      fieldTypeKey: fieldType.key,
      label: fieldType.label,
    });
    claimedPaths.add(cleanBestPath);
    typeItemFilters[fieldType.key] = complete.config;
    suggestions.push({
      typeKey: fieldType.key,
      typeLabel: fieldType.label,
      sourcePath: cleanBestPath,
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
    const mappedPaths = absoluteMappedLeafPaths(
      fieldMappings,
      typeItemFilters,
    );
    const uncoveredRelativePaths = collectLeafPaths(node.value).filter(
      (path) =>
        !mappedPaths.has(`${cleanPath}.${path}`) &&
        !routedDebtLeafPaths.has(`${cleanPath}.${path}`),
    );
    if (uncoveredRelativePaths.length === 0) continue;
    const provisional = provisionalTypeForBlock(
      { ...node, path: cleanPath },
      undefined,
      uncoveredRelativePaths,
    );
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

  for (const block of routedDebtBlocks) {
    suggestions.push({
      typeKey: `ROTEAMENTO_DIVIDAS_${normalize(block.blockPath)}`,
      typeLabel: 'Roteamento canônico de dívidas',
      sourcePath: block.occurrencePath,
      confidence: 'high',
      reason:
        'cada ocorrência e todos os seus campos são separados automaticamente pela base Sollos (I Serasa, II SPC, III Boa Vista/SCPC e IV Quod)',
    });
  }

  if (original !== null && typeof original === 'object' && !Array.isArray(original)) {
    for (const [path, value] of Object.entries(
      original as Record<string, unknown>,
    )) {
      if (value !== null && typeof value === 'object') continue;
      const provisional = provisionalTypeForScalar(path);
      discoveredFieldTypes.push(provisional.fieldType);
      fieldMappings.push({
        jsonPath: path,
        fieldTypeKey: provisional.fieldType.key,
        label: provisional.fieldType.label,
      });
      typeItemFilters[provisional.fieldType.key] = provisional.config;
      suggestions.push({
        typeKey: provisional.fieldType.key,
        typeLabel: provisional.fieldType.label,
        sourcePath: path,
        confidence: 'new',
        reason: 'metadado de raiz preservado integralmente no Preview',
      });
    }
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
  const leafPaths = [...new Set(collectLeafPaths(original))];
  const mappedLeafPaths = absoluteMappedLeafPaths(
    fieldMappings,
    typeItemFilters,
  );
  const uncoveredLeafPaths = leafPaths.filter(
    (path) => !mappedLeafPaths.has(path) && !routedDebtLeafPaths.has(path),
  );
  const effectiveFieldTypes = new Map(
    params.fieldTypes.map((fieldType) => [fieldType.key, fieldType]),
  );
  for (const fieldType of [
    ...expandedFieldTypes,
    ...discoveredFieldTypes,
  ]) {
    effectiveFieldTypes.set(fieldType.key, fieldType);
  }
  const originalTypeKeys = new Set(
    params.fieldTypes.map((fieldType) => fieldType.key),
  );
  const newTypeCount = [
    ...new Set(
      discoveredFieldTypes
        .filter((fieldType) => !originalTypeKeys.has(fieldType.key))
        .map((fieldType) => fieldType.key),
    ),
  ].length;
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
    fieldTypes: [...effectiveFieldTypes.values()],
    coverage: {
      totalLeafPaths: leafPaths.length,
      coveredLeafPaths: leafPaths.length - uncoveredLeafPaths.length,
      uncoveredLeafPaths,
      newTypeCount,
    },
  };
}
