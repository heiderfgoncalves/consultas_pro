import type {
  ConsultationFieldType,
  ProviderConsultation,
} from '@/types/integrations';
import {
  buildDataContractReport,
  jsonFingerprint,
} from './contract';
import {
  collectSollosLeafPaths,
  type SollosSampleExecution,
} from './sollosSampling';

export type SollosSampleValidation = {
  sampleNumber: number;
  expectedStatus: SollosSampleExecution['expectedStatus'];
  sourceFingerprint: string | null;
  observedLeafPathCount: number;
  coveredLeafPathCount: number;
  uncoveredLeafPaths: string[];
  validatedFieldCount: number;
  validatedOccurrenceCount: number;
  invalidFieldPaths: string[];
  invalidOccurrencePaths: string[];
  errors: string[];
  valid: boolean;
};

export type SollosBatchValidation = {
  attemptedSamples: number;
  successfulSamples: number;
  failedSamples: number;
  validSamples: number;
  invalidSamples: number;
  observedLeafPaths: string[];
  coveredLeafPaths: number;
  uncoveredLeafPaths: string[];
  validatedFieldCount: number;
  validatedOccurrenceCount: number;
  allValid: boolean;
  samples: SollosSampleValidation[];
};

function normalizePath(path: string) {
  return path
    .replace(/\[\*\]/g, '')
    .replace(/\[\]/g, '')
    .replace(/\.+/g, '.')
    .replace(/^\.+|\.+$/g, '');
}

function isAutomaticallyRoutedDebtPath(path: string) {
  return /(?:^|\.)(?:PEND_FINANCEIRAS|PEND_REFIN|PEND_VENCIDAS)\.OCORRENCIAS\./i.test(
    path,
  );
}

function compactDiagnosticValue(value: unknown) {
  const serialized = JSON.stringify(value);
  if (!serialized) return String(value);
  return serialized.length > 240
    ? `${serialized.slice(0, 237)}...`
    : serialized;
}

export function collectMappedSollosLeafPaths(
  consultation: ProviderConsultation,
): string[] {
  const paths = new Set<string>();

  for (const typeMapping of consultation.fieldMappings) {
    const config = consultation.typeItemFilters?.[typeMapping.fieldTypeKey];
    for (const fieldMapping of config?.fieldMappings ?? []) {
      const root =
        fieldMapping.sourceTrechoPath?.trim() || typeMapping.jsonPath.trim();
      const relative = fieldMapping.jsonPath.trim();
      if (!root || !relative) continue;
      paths.add(
        normalizePath(relative === '$' ? root : `${root}.${relative}`),
      );
    }
  }

  return [...paths].sort();
}

export function validateSollosSampleBatch(params: {
  executions: SollosSampleExecution[];
  consultation: ProviderConsultation;
  fieldTypes: ConsultationFieldType[];
}): SollosBatchValidation {
  const mappedPaths = new Set(
    collectMappedSollosLeafPaths(params.consultation),
  );
  const allObservedPaths = new Set<string>();
  const samples = params.executions.map((execution, index) => {
    if (!execution.success || !execution.payload) {
      return {
        sampleNumber: index + 1,
        expectedStatus: execution.expectedStatus,
        sourceFingerprint: null,
        observedLeafPathCount: 0,
        coveredLeafPathCount: 0,
        uncoveredLeafPaths: [],
        validatedFieldCount: 0,
        validatedOccurrenceCount: 0,
        invalidFieldPaths: [],
        invalidOccurrencePaths: [],
        errors: [execution.error ?? 'A amostra não retornou um JSON válido.'],
        valid: false,
      } satisfies SollosSampleValidation;
    }

    const observedPaths = [
      ...new Set(
        collectSollosLeafPaths(execution.payload).map(normalizePath),
      ),
    ].sort();
    observedPaths.forEach((path) => allObservedPaths.add(path));
    const uncoveredLeafPaths = observedPaths.filter(
      (path) =>
        !mappedPaths.has(path) && !isAutomaticallyRoutedDebtPath(path),
    );
    const errors: string[] = [];
    let validatedFieldCount = 0;
    let validatedOccurrenceCount = 0;
    let invalidFieldPaths: string[] = [];
    let invalidOccurrencePaths: string[] = [];

    try {
      const report = buildDataContractReport({
        rawJson: JSON.stringify(execution.payload),
        consultation: params.consultation,
        fieldTypes: params.fieldTypes,
      });
      const invalidFields = report.lineage.filter(
        (item) =>
          item.status !== 'ok' && item.status !== 'not-applicable',
      );
      const invalidOccurrences = report.bureauAudit.filter(
        (item) => item.status !== 'ok',
      );
      invalidFieldPaths = invalidFields.map(
        (item) =>
          `${item.typeKey}.${item.targetKey} ← ${item.sourcePath} | origem=${compactDiagnosticValue(item.sourceValues)} | preview=${compactDiagnosticValue(item.previewValues)}`,
      );
      invalidOccurrencePaths = invalidOccurrences.map(
        (item) =>
          `${item.sourcePath} → ${item.expectedTypeKey ?? 'SEM_DESTINO'} | ${item.message}`,
      );
      validatedFieldCount = report.lineage.filter(
        (item) => item.status === 'ok',
      ).length +
        report.bureauAudit
          .filter((item) => item.status === 'ok')
          .reduce((total, item) => total + item.fieldCount, 0);
      validatedOccurrenceCount = report.bureauAudit.filter(
        (item) => item.status === 'ok',
      ).length;

      if (invalidFields.length > 0) {
        errors.push(
          `${invalidFields.length} campo(s) divergiram da origem.`,
        );
      }
      if (invalidOccurrences.length > 0) {
        errors.push(
          `${invalidOccurrences.length} ocorrência(s) ficaram ausentes ou na base errada.`,
        );
      }
      if (
        report.diagnostics.some((diagnostic) => diagnostic.status !== 'ok')
      ) {
        errors.push('A cadeia JSON → DE → PARA → Preview não fechou.');
      }
    } catch (error) {
      errors.push(
        error instanceof Error
          ? error.message
          : 'Não foi possível validar esta amostra.',
      );
    }

    if (uncoveredLeafPaths.length > 0) {
      errors.push(
        `${uncoveredLeafPaths.length} caminho(s) não possuem destino no Preview.`,
      );
    }

    return {
      sampleNumber: index + 1,
      expectedStatus: execution.expectedStatus,
      sourceFingerprint: jsonFingerprint(execution.payload),
      observedLeafPathCount: observedPaths.length,
      coveredLeafPathCount:
        observedPaths.length - uncoveredLeafPaths.length,
      uncoveredLeafPaths,
      validatedFieldCount,
      validatedOccurrenceCount,
      invalidFieldPaths,
      invalidOccurrencePaths,
      errors,
      valid: errors.length === 0,
    } satisfies SollosSampleValidation;
  });

  const uncoveredLeafPaths = [...allObservedPaths]
    .filter(
      (path) =>
        !mappedPaths.has(path) && !isAutomaticallyRoutedDebtPath(path),
    )
    .sort();
  const failedSamples = params.executions.filter(
    (execution) => !execution.success,
  ).length;
  const validSamples = samples.filter((sample) => sample.valid).length;
  const invalidSamples = samples.length - validSamples;

  return {
    attemptedSamples: params.executions.length,
    successfulSamples: params.executions.length - failedSamples,
    failedSamples,
    validSamples,
    invalidSamples,
    observedLeafPaths: [...allObservedPaths].sort(),
    coveredLeafPaths: allObservedPaths.size - uncoveredLeafPaths.length,
    uncoveredLeafPaths,
    validatedFieldCount: samples.reduce(
      (total, sample) => total + sample.validatedFieldCount,
      0,
    ),
    validatedOccurrenceCount: samples.reduce(
      (total, sample) => total + sample.validatedOccurrenceCount,
      0,
    ),
    allValid:
      samples.length > 0 &&
      failedSamples === 0 &&
      invalidSamples === 0 &&
      uncoveredLeafPaths.length === 0,
    samples,
  };
}
