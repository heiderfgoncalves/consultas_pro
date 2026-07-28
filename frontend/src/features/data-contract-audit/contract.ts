import type {
  ConsultationFieldType,
  ProviderConsultation,
  TypeItemFilterConfig,
} from '@/types/integrations';
import { buildTypeKeyedDataForDrawer } from '@/lib/buildTypeKeyedDataForDrawer';
import { collectValuesAtPath } from '@/lib/consultationMappedPreview';

export type ContractStageName = 'original' | 'de' | 'para' | 'editor';
export type CreditBureau = 'serasa' | 'spc' | 'boa-vista' | 'unknown';

export type ContractDiagnostic = {
  stage: ContractStageName | 'comparison';
  status: 'ok' | 'warning' | 'error';
  message: string;
  fingerprint: string;
};

export type FieldLineage = {
  id: string;
  typeKey: string;
  targetKey: string;
  label: string;
  sourcePath: string;
  sourceValues: unknown[];
  previewValues: unknown[];
  status:
    | 'ok'
    | 'not-applicable'
    | 'missing-source'
    | 'missing-preview'
    | 'divergent';
  message: string;
};

export type BureauOccurrenceAudit = {
  id: string;
  sourceBlock: string;
  sourcePath: string;
  providerLabel: string;
  bureau: CreditBureau;
  expectedTypeKey: string | null;
  creditor: string;
  contract: string;
  amount: unknown;
  status: 'ok' | 'unknown-base' | 'missing-target' | 'misrouted';
  message: string;
};

export type DataContractReport = {
  original: unknown;
  de: unknown;
  para: Record<string, unknown>;
  editor: Record<string, unknown>;
  originalEqualsDe: boolean;
  previewEqualsEditor: boolean;
  lineage: FieldLineage[];
  bureauAudit: BureauOccurrenceAudit[];
  diagnostics: ContractDiagnostic[];
};

const EMPTY_FILTER_CONFIG: TypeItemFilterConfig = {
  version: 2,
  groups: [],
  fieldMappings: [],
  dedupFieldIds: [],
  computedFields: [],
};

const BUREAU_BY_LABEL: Record<string, Exclude<CreditBureau, 'unknown'>> = {
  'BASE I': 'serasa',
  'BASE 1': 'serasa',
  SERASA: 'serasa',
  'BASE II': 'spc',
  'BASE 2': 'spc',
  SPC: 'spc',
  'SPC BRASIL': 'spc',
  'BASE III': 'boa-vista',
  'BASE 3': 'boa-vista',
  'BOA VISTA': 'boa-vista',
  SCPC: 'boa-vista',
};

const TYPE_KEY_BY_BUREAU: Record<Exclude<CreditBureau, 'unknown'>, string> = {
  serasa: 'DIVIDAS_SERASA',
  spc: 'DIVIDAS_SPC',
  'boa-vista': 'DIVIDAS_BOA_VISTA',
};

function sortJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJson);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, child]) => [key, sortJson(child)]),
    );
  }
  return value;
}

export function stableJson(value: unknown): string {
  return JSON.stringify(sortJson(value));
}

export function jsonEquals(left: unknown, right: unknown): boolean {
  return stableJson(left) === stableJson(right);
}

export function jsonFingerprint(value: unknown): string {
  const text = stableJson(value);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function parseLocaleNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return null;
  const raw = value.trim().replace(/[^\d,.-]/g, '');
  if (!raw) return null;
  const normalized = raw.includes(',')
    ? raw.replace(/\./g, '').replace(',', '.')
    : raw;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function comparableValue(value: unknown, dataType?: string): string {
  if (dataType === 'currency' || dataType === 'numeric' || dataType === 'number') {
    const numeric = parseLocaleNumber(value);
    if (numeric !== null) return `number:${numeric}`;
  }
  if (dataType === 'date' && typeof value === 'string') {
    const digits = value.replace(/\D/g, '');
    if (digits.length === 8) {
      const normalized = /^\d{4}/.test(value)
        ? digits
        : `${digits.slice(4)}${digits.slice(2, 4)}${digits.slice(0, 2)}`;
      return `date:${normalized}`;
    }
  }
  return `text:${String(value ?? '').trim().toLocaleLowerCase('pt-BR')}`;
}

function normalizedLabel(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleUpperCase('pt-BR');
}

function classifyBureau(value: unknown): CreditBureau {
  return BUREAU_BY_LABEL[normalizedLabel(value)] ?? 'unknown';
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function collectDebtBlocks(
  value: unknown,
  path = '',
): Array<{ name: string; path: string; value: Record<string, unknown> }> {
  if (Array.isArray(value)) {
    return value.flatMap((child, index) =>
      collectDebtBlocks(child, `${path}[${index}]`),
    );
  }
  const record = asRecord(value);
  if (!record) return [];

  return Object.entries(record).flatMap(([key, child]) => {
    const childPath = path ? `${path}.${key}` : key;
    const childRecord = asRecord(child);
    const current =
      childRecord && /^(PEND_FINANCEIRAS|PEND_REFIN|PEND_VENCIDAS)$/i.test(key)
        ? [{ name: key, path: childPath, value: childRecord }]
        : [];
    return [...current, ...collectDebtBlocks(child, childPath)];
  });
}

function deepValues(value: unknown): unknown[] {
  if (Array.isArray(value)) return value.flatMap(deepValues);
  const record = asRecord(value);
  if (record) return Object.values(record).flatMap(deepValues);
  return value === null || value === undefined || value === '' ? [] : [value];
}

function flattenComparableValues(value: unknown): unknown[] {
  if (Array.isArray(value)) return value.flatMap(flattenComparableValues);
  return [value];
}

function previewContainsOccurrence(
  preview: unknown,
  occurrence: Record<string, unknown>,
): boolean {
  const values = deepValues(preview);
  const normalizedTexts = new Set(values.map(normalizedLabel));
  const normalizedNumbers = new Set(
    values
      .map(parseLocaleNumber)
      .filter((value): value is number => value !== null),
  );
  const creditor = occurrence.CREDOR ?? occurrence.ORIGEM ?? occurrence.NOME;
  const contract = occurrence.CONTRATO;
  const amount = occurrence.VALOR ?? occurrence.VALOR_DIVIDA;
  const checks = [
    creditor ? normalizedTexts.has(normalizedLabel(creditor)) : null,
    contract ? normalizedTexts.has(normalizedLabel(contract)) : null,
    amount
      ? normalizedNumbers.has(parseLocaleNumber(amount) ?? Number.NaN)
      : null,
  ].filter((value): value is boolean => value !== null);

  return (
    checks.length > 0 &&
    checks.filter(Boolean).length >= Math.min(2, checks.length)
  );
}

function buildBureauAudit(
  original: unknown,
  para: Record<string, unknown>,
): BureauOccurrenceAudit[] {
  return collectDebtBlocks(original).flatMap((block) => {
    const providers = Array.isArray(block.value.PROVEDORES)
      ? block.value.PROVEDORES
      : [];
    const providerFallback =
      asRecord(providers[0])?.PROVEDOR ?? block.value.PROVEDOR ?? '';
    const occurrences = Array.isArray(block.value.OCORRENCIAS)
      ? block.value.OCORRENCIAS
      : [];

    return occurrences.map((rawOccurrence, index) => {
      const occurrence = asRecord(rawOccurrence) ?? {};
      const providerLabel = String(
        occurrence.INFORMANTE ?? occurrence.PROVEDOR ?? providerFallback ?? '',
      );
      const bureau = classifyBureau(providerLabel);
      const expectedTypeKey =
        bureau === 'unknown' ? null : TYPE_KEY_BY_BUREAU[bureau];
      const foundInExpected =
        expectedTypeKey !== null &&
        para[expectedTypeKey] !== undefined &&
        previewContainsOccurrence(para[expectedTypeKey], occurrence);
      const wrongTypeKey =
        bureau === 'unknown'
          ? null
          : Object.values(TYPE_KEY_BY_BUREAU).find(
              (typeKey) =>
                typeKey !== expectedTypeKey &&
                previewContainsOccurrence(para[typeKey], occurrence),
            ) ?? null;
      const status: BureauOccurrenceAudit['status'] =
        bureau === 'unknown'
          ? 'unknown-base'
          : foundInExpected
            ? 'ok'
            : wrongTypeKey
              ? 'misrouted'
              : 'missing-target';

      return {
        id: `${block.path}.OCORRENCIAS[${index}]`,
        sourceBlock: block.name,
        sourcePath: `${block.path}.OCORRENCIAS[${index}]`,
        providerLabel: providerLabel || 'Não informado',
        bureau,
        expectedTypeKey,
        creditor: String(occurrence.CREDOR ?? occurrence.ORIGEM ?? 'Não informado'),
        contract: String(occurrence.CONTRATO ?? 'Não informado'),
        amount: occurrence.VALOR ?? occurrence.VALOR_DIVIDA ?? null,
        status,
        message:
          status === 'ok'
            ? `Ocorrência localizada em ${expectedTypeKey}.`
            : status === 'unknown-base'
              ? 'Base não reconhecida. A catalogação deve permanecer bloqueada.'
              : status === 'misrouted'
                ? `Ocorrência encontrada em ${wrongTypeKey}, mas deveria estar em ${expectedTypeKey}.`
                : `Ocorrência não localizada no destino esperado ${expectedTypeKey}.`,
      };
    });
  });
}

function buildLineage(params: {
  original: unknown;
  para: Record<string, unknown>;
  consultation: ProviderConsultation;
  fieldTypes: ConsultationFieldType[];
}): FieldLineage[] {
  const lineage: FieldLineage[] = [];

  for (const fieldType of params.fieldTypes) {
    const config = params.consultation.typeItemFilters?.[fieldType.key];
    const fieldsById = new Map(
      (fieldType.reportFieldConfig?.fields ?? []).map((field) => [field.id, field]),
    );

    for (const mapping of config?.fieldMappings ?? []) {
      const field = fieldsById.get(mapping.reportFieldId);
      if (!field || !mapping.jsonPath.trim()) continue;
      const sourcePath = [mapping.sourceTrechoPath, mapping.jsonPath]
        .filter((part) => part?.trim())
        .join('.');
      const sourceValues = collectValuesAtPath(params.original, sourcePath);
      const previewValues = collectValuesAtPath(
        params.para[fieldType.key],
        field.key,
      );
      const sourceComparable = new Set(
        sourceValues
          .flatMap(flattenComparableValues)
          .map((value) => comparableValue(value, field.dataType)),
      );
      const previewComparable = new Set(
        previewValues
          .flatMap(flattenComparableValues)
          .map((value) => comparableValue(value, field.dataType)),
      );
      const sameValues =
        sourceComparable.size === previewComparable.size &&
        [...sourceComparable].every((value) => previewComparable.has(value));
      const hasActiveFilters = (config?.groups ?? []).some(
        (group) => group.rules.length > 0,
      );
      const typeHasPreviewValues =
        deepValues(params.para[fieldType.key]).length > 0;
      const status: FieldLineage['status'] =
        sourceValues.length === 0 && previewValues.length === 0
          ? 'not-applicable'
          : sourceValues.length === 0
          ? 'missing-source'
          : previewValues.length === 0
            ? hasActiveFilters && !typeHasPreviewValues
              ? 'not-applicable'
              : 'missing-preview'
            : sameValues
              ? 'ok'
              : 'divergent';

      lineage.push({
        id: mapping.id,
        typeKey: fieldType.key,
        targetKey: field.key,
        label: field.label,
        sourcePath,
        sourceValues,
        previewValues,
        status,
        message:
          status === 'ok'
            ? 'Origem e Preview possuem o mesmo valor.'
            : status === 'not-applicable'
              ? 'O filtro deste tipo excluiu corretamente a ocorrência desta amostra.'
            : status === 'missing-source'
              ? 'O caminho configurado não encontrou valor na origem.'
              : status === 'missing-preview'
                ? 'A origem possui valor, mas ele não apareceu no Preview.'
                : 'O valor exibido diverge do valor extraído da origem.',
      });
    }
  }

  return lineage;
}

export function parseContractSource(rawJson: string): unknown {
  const trimmed = rawJson.trim();
  if (!trimmed) throw new Error('A fonte JSON está vazia.');
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    throw new Error('A fonte selecionada não contém um JSON válido.');
  }
}

export function buildParaPayload(params: {
  rawJson: string;
  consultation: ProviderConsultation;
  fieldTypes: ConsultationFieldType[];
}): Record<string, unknown> {
  const { rawJson, consultation, fieldTypes } = params;
  const para: Record<string, unknown> = {};

  for (const fieldType of fieldTypes) {
    const trechoMappings = consultation.fieldMappings.filter(
      (mapping) => mapping.fieldTypeKey === fieldType.key,
    );
    if (trechoMappings.length === 0) continue;

    const value = buildTypeKeyedDataForDrawer({
      sampleResponse: rawJson,
      trechoMappings,
      fieldType,
      typeItemFilterConfig:
        consultation.typeItemFilters?.[fieldType.key] ?? EMPTY_FILTER_CONFIG,
    });
    para[fieldType.key] = value ?? [];
  }

  return para;
}

export function buildDataContractReport(params: {
  rawJson: string;
  consultation: ProviderConsultation;
  fieldTypes: ConsultationFieldType[];
}): DataContractReport {
  const original = parseContractSource(params.rawJson);
  const de = JSON.parse(JSON.stringify(original)) as unknown;
  const para = buildParaPayload(params);
  const editor = JSON.parse(JSON.stringify(para)) as Record<string, unknown>;
  const originalEqualsDe = jsonEquals(original, de);
  const previewEqualsEditor = jsonEquals(para, editor);
  const mappedTypeCount = Object.keys(para).length;
  const lineage = buildLineage({
    original,
    para,
    consultation: params.consultation,
    fieldTypes: params.fieldTypes,
  });
  const bureauAudit = buildBureauAudit(original, para);
  const lineageOk =
    lineage.length > 0 &&
    lineage.every(
      (item) => item.status === 'ok' || item.status === 'not-applicable',
    );
  const bureauAuditOk =
    bureauAudit.length === 0 ||
    bureauAudit.every((item) => item.status === 'ok');

  const diagnostics: ContractDiagnostic[] = [
    {
      stage: 'original',
      status: 'ok',
      message: 'JSON original carregado sem alteração.',
      fingerprint: jsonFingerprint(original),
    },
    {
      stage: 'de',
      status: originalEqualsDe ? 'ok' : 'error',
      message: originalEqualsDe
        ? 'O DE recebido pelo mapeamento é idêntico ao JSON original.'
        : 'O DE diverge do JSON original antes do mapeamento.',
      fingerprint: jsonFingerprint(de),
    },
    {
      stage: 'para',
      status: mappedTypeCount > 0 ? 'ok' : 'warning',
      message:
        mappedTypeCount > 0
          ? `${mappedTypeCount} tipo(s) canônico(s) produzido(s) no Preview PARA.`
          : 'Nenhum tipo canônico foi produzido; revise os mapeamentos da consulta.',
      fingerprint: jsonFingerprint(para),
    },
    {
      stage: 'editor',
      status: previewEqualsEditor ? 'ok' : 'error',
      message: previewEqualsEditor
        ? 'A entrada do editor é idêntica ao Preview PARA.'
        : 'A entrada do editor diverge do Preview PARA.',
      fingerprint: jsonFingerprint(editor),
    },
    {
      stage: 'comparison',
      status:
        originalEqualsDe &&
        previewEqualsEditor &&
        lineageOk &&
        bureauAuditOk
          ? 'ok'
          : 'error',
      message:
        originalEqualsDe && previewEqualsEditor && lineageOk && bureauAuditOk
          ? `${lineage.length} campo(s) e ${bureauAudit.length} ocorrência(s) conferidos da origem até o Preview.`
          : !bureauAuditOk
            ? `${bureauAudit.filter((item) => item.status !== 'ok').length} ocorrência(s) estão ausentes, ambíguas ou na base errada.`
            : lineage.length === 0
              ? 'Nenhum campo possui rastreabilidade completa até o Preview.'
              : `${lineage.filter((item) => item.status !== 'ok' && item.status !== 'not-applicable').length} campo(s) precisam de ajuste.`,
      fingerprint: jsonFingerprint({
        originalEqualsDe,
        previewEqualsEditor,
        lineage: lineage.map((item) => [item.id, item.status]),
        bureauAudit: bureauAudit.map((item) => [item.id, item.status]),
      }),
    },
  ];

  return {
    original,
    de,
    para,
    editor,
    originalEqualsDe,
    previewEqualsEditor,
    lineage,
    bureauAudit,
    diagnostics,
  };
}
