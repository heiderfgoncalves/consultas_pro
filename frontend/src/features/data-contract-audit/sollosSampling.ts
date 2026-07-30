import type {
  SollosHomologationSample,
  SollosSampleExpectedStatus,
} from './sollosHomologationSamples';

export type SollosSampleExecution = {
  document: string;
  expectedStatus: SollosSampleExpectedStatus;
  success: boolean;
  payload: unknown | null;
  error?: string;
  discoveredPathCount: number;
  newPathCount: number;
};

export type SollosSamplingSummary = {
  attempted: number;
  succeeded: number;
  failed: number;
  uniquePathCount: number;
  stableTailCount: number;
  expectedStatuses: SollosSampleExpectedStatus[];
  canStopSafely: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function collectStructuralPaths(
  value: unknown,
  prefix = '',
): string[] {
  if (Array.isArray(value)) {
    const arrayPath = `${prefix}[]`;
    const nested = value.flatMap((item) =>
      collectStructuralPaths(item, arrayPath),
    );
    return [arrayPath, ...nested];
  }

  if (isRecord(value)) {
    return Object.entries(value).flatMap(([key, child]) =>
      collectStructuralPaths(child, prefix ? `${prefix}.${key}` : key),
    );
  }

  return prefix ? [prefix] : [];
}

export function collectSollosStructuralPaths(
  value: unknown,
  prefix = '',
): string[] {
  return [...new Set(collectStructuralPaths(value, prefix))];
}

export function collectSollosLeafPaths(
  value: unknown,
  prefix = '',
): string[] {
  if (Array.isArray(value)) {
    const arrayPath = `${prefix}[]`;
    return [
      ...new Set(
        value.flatMap((item) => collectSollosLeafPaths(item, arrayPath)),
      ),
    ];
  }
  if (isRecord(value)) {
    return [
      ...new Set(
        Object.entries(value).flatMap(([key, child]) =>
          collectSollosLeafPaths(child, prefix ? `${prefix}.${key}` : key),
        ),
      ),
    ];
  }
  return prefix ? [prefix] : [];
}

function arrayItemSignature(value: unknown): string {
  const discriminator = isRecord(value)
    ? String(value.INFORMANTE ?? value.PROVEDOR ?? value.BASE ?? '')
        .trim()
        .toLocaleUpperCase('pt-BR')
    : '';
  return `${discriminator}::${collectSollosStructuralPaths(value)
    .sort()
    .join('|')}`;
}

function mergePayloadValue(current: unknown, incoming: unknown): unknown {
  if (current === undefined || current === null || current === '') return incoming;
  if (incoming === undefined || incoming === null || incoming === '') return current;

  if (Array.isArray(current) && Array.isArray(incoming)) {
    const signatures = new Set(current.map(arrayItemSignature));
    const additions = incoming.filter((item) => {
      const signature = arrayItemSignature(item);
      if (signatures.has(signature)) return false;
      signatures.add(signature);
      return true;
    });
    return [...current, ...additions];
  }

  if (isRecord(current) && isRecord(incoming)) {
    const result: Record<string, unknown> = { ...current };
    for (const [key, value] of Object.entries(incoming)) {
      result[key] = mergePayloadValue(result[key], value);
    }
    return result;
  }

  if (current === '0' && incoming === '1') return incoming;

  return current;
}

export function buildRepresentativeSollosPayload(payloads: unknown[]): unknown {
  return payloads.reduce<unknown>(
    (representative, payload) =>
      mergePayloadValue(representative, payload),
    {},
  );
}

export function addSollosSampleExecution(
  current: SollosSampleExecution[],
  sample: SollosHomologationSample,
  result:
    | { success: true; payload: unknown }
    | { success: false; error: string },
): SollosSampleExecution[] {
  const knownPaths = new Set(
    current.flatMap((execution) =>
      execution.payload
        ? collectSollosStructuralPaths(execution.payload)
        : [],
    ),
  );
  const samplePaths =
    result.success && result.payload
      ? [...new Set(collectSollosStructuralPaths(result.payload))]
      : [];

  return [
    ...current,
    {
      document: sample.document,
      expectedStatus: sample.expectedStatus,
      success: result.success,
      payload: result.success ? result.payload : null,
      error: result.success ? undefined : result.error,
      discoveredPathCount: samplePaths.length,
      newPathCount: samplePaths.filter((path) => !knownPaths.has(path)).length,
    },
  ];
}

export function summarizeSollosSampling(
  executions: SollosSampleExecution[],
  minimumSamples: number,
  stableTailRequired: number,
): SollosSamplingSummary {
  const successful = executions.filter(
    (execution) => execution.success && execution.payload,
  );
  const paths = new Set(
    successful.flatMap((execution) =>
      collectSollosStructuralPaths(execution.payload),
    ),
  );
  let stableTailCount = 0;

  for (let index = executions.length - 1; index >= 0; index -= 1) {
    const execution = executions[index];
    if (!execution.success || execution.newPathCount > 0) break;
    stableTailCount += 1;
  }

  return {
    attempted: executions.length,
    succeeded: successful.length,
    failed: executions.length - successful.length,
    uniquePathCount: paths.size,
    stableTailCount,
    expectedStatuses: [
      ...new Set(successful.map((execution) => execution.expectedStatus)),
    ],
    canStopSafely:
      successful.length >= minimumSamples &&
      stableTailCount >= stableTailRequired,
  };
}
