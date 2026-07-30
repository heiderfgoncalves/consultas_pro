import { describe, expect, it } from 'vitest';
import {
  addSollosSampleExecution,
  buildRepresentativeSollosPayload,
  collectSollosStructuralPaths,
  summarizeSollosSampling,
} from './sollosSampling';

describe('Sollos adaptive sampling', () => {
  it('tracks paths without depending on array order', () => {
    expect(
      collectSollosStructuralPaths({
        CREDCADASTRAL: {
          PEND_FINANCEIRAS: {
            OCORRENCIAS: [{ VALOR: '10,00' }],
          },
        },
      }),
    ).toEqual([
      'CREDCADASTRAL.PEND_FINANCEIRAS.OCORRENCIAS[]',
      'CREDCADASTRAL.PEND_FINANCEIRAS.OCORRENCIAS[].VALOR',
    ]);
  });

  it('builds a representative payload without discarding later structures', () => {
    expect(
      buildRepresentativeSollosPayload([
        { A: { X: '1', FLAG: '0' }, LISTA: [{ ID: '1' }] },
        { A: { Y: '2', FLAG: '1' }, LISTA: [{ ID: '2', EXTRA: true }] },
      ]),
    ).toEqual({
      A: { X: '1', Y: '2', FLAG: '1' },
      LISTA: [{ ID: '1' }, { ID: '2', EXTRA: true }],
    });
  });

  it('requires the minimum and a stable tail before stopping', () => {
    let executions = [];
    for (let index = 0; index < 10; index += 1) {
      executions = addSollosSampleExecution(
        executions,
        {
          document: String(index).padStart(11, '0'),
          expectedStatus: 'NADA_CONSTA',
        },
        { success: true, payload: { A: '1' } },
      );
    }

    const summary = summarizeSollosSampling(executions, 10, 5);
    expect(summary.succeeded).toBe(10);
    expect(summary.stableTailCount).toBe(9);
    expect(summary.canStopSafely).toBe(true);
  });
});
