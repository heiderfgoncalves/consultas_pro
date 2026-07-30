import { describe, expect, it } from 'vitest';
import { buildAutomaticDraftMapping } from './draftMapping';
import {
  validateSollosSampleBatch,
} from './sollosBatchValidation';
import {
  buildRepresentativeSollosPayload,
  type SollosSampleExecution,
} from './sollosSampling';

function successfulExecution(
  payload: unknown,
  index: number,
): SollosSampleExecution {
  return {
    document: String(index).padStart(11, '0'),
    expectedStatus: 'CONCLUIDO',
    success: true,
    payload,
    discoveredPathCount: 0,
    newPathCount: 0,
  };
}

describe('Sollos complete batch validation', () => {
  it('validates every sample and fields introduced by later responses', () => {
    const payloads = [
      {
        CREDCADASTRAL: {
          ACOES: [{ PROCESSO: '1', VALOR: '10,00' }],
        },
      },
      {
        CREDCADASTRAL: {
          ACOES: [
            { PROCESSO: '2', VALOR: '20,00', TRIBUNAL: 'TJSP' },
          ],
        },
      },
    ];
    const representative = buildRepresentativeSollosPayload(payloads);
    const draft = buildAutomaticDraftMapping({
      rawJson: JSON.stringify(representative),
      productCode: 'teste',
      providerId: 'sollos',
      consultations: [],
      fieldTypes: [],
    });
    const validation = validateSollosSampleBatch({
      executions: payloads.map(successfulExecution),
      consultation: draft.consultation,
      fieldTypes: draft.fieldTypes,
    });

    expect(validation).toMatchObject({
      attemptedSamples: 2,
      successfulSamples: 2,
      failedSamples: 0,
      validSamples: 2,
      invalidSamples: 0,
      coveredLeafPaths: 3,
      uncoveredLeafPaths: [],
      allValid: true,
    });
    expect(validation.observedLeafPaths).toEqual([
      'CREDCADASTRAL.ACOES.PROCESSO',
      'CREDCADASTRAL.ACOES.TRIBUNAL',
      'CREDCADASTRAL.ACOES.VALOR',
    ]);
  });

  it('blocks the batch when any observed leaf has no Preview destination', () => {
    const payload = { STATUS_RAIZ: '1' };
    const draft = buildAutomaticDraftMapping({
      rawJson: JSON.stringify(payload),
      productCode: 'teste',
      providerId: 'sollos',
      consultations: [],
      fieldTypes: [],
    });
    const rootConfig =
      draft.consultation.typeItemFilters?.NOVO_STATUS_RAIZ;
    if (!rootConfig) throw new Error('Configuração de raiz não criada');
    draft.consultation.typeItemFilters = {
      ...draft.consultation.typeItemFilters,
      NOVO_STATUS_RAIZ: {
        ...rootConfig,
        fieldMappings: [],
      },
    };
    const validation = validateSollosSampleBatch({
      executions: [successfulExecution(payload, 1)],
      consultation: draft.consultation,
      fieldTypes: draft.fieldTypes,
    });

    expect(validation.allValid).toBe(false);
    expect(validation.uncoveredLeafPaths).toEqual(['STATUS_RAIZ']);
    expect(validation.samples[0]).toMatchObject({
      valid: false,
      uncoveredLeafPaths: ['STATUS_RAIZ'],
    });
  });

  it('routes and validates every field of debt occurrences by Sollos base', () => {
    const payload = {
      CREDCADASTRAL: {
        PEND_REFIN: {
          PROVEDORES: [{ PROVEDOR: 'BASE IV' }],
          OCORRENCIAS: [
            {
              CREDOR: 'CREDOR QUOD',
              CONTRATO: 'Q-1',
              VALOR: '10,00',
              CAMPO_EXCLUSIVO: 'preservado',
            },
          ],
        },
      },
    };
    const draft = buildAutomaticDraftMapping({
      rawJson: JSON.stringify(payload),
      productCode: 'teste',
      providerId: 'sollos',
      consultations: [],
      fieldTypes: [],
    });
    const validation = validateSollosSampleBatch({
      executions: [successfulExecution(payload, 1)],
      consultation: draft.consultation,
      fieldTypes: draft.fieldTypes,
    });

    expect(validation).toMatchObject({
      allValid: true,
      coveredLeafPaths: 5,
      uncoveredLeafPaths: [],
      validatedOccurrenceCount: 1,
    });
    expect(validation.validatedFieldCount).toBeGreaterThanOrEqual(4);
  });
});
