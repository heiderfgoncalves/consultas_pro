import { describe, expect, it } from 'vitest';
import {
  addSollosSampleExecution,
  buildRepresentativeSollosPayload,
  collectSollosLeafPaths,
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

  it('discovers fields that exist only in later array items', () => {
    const payload = {
      LISTA: [
        { ID: '1', NOME: 'Primeiro' },
        { ID: '2', NOME: 'Segundo', COMPLEMENTO: 'Campo tardio' },
      ],
    };

    expect(collectSollosStructuralPaths(payload)).toContain(
      'LISTA[].COMPLEMENTO',
    );
    expect(collectSollosLeafPaths(payload)).toEqual([
      'LISTA[].ID',
      'LISTA[].NOME',
      'LISTA[].COMPLEMENTO',
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

  it('keeps one representative per structure and debt-base discriminator', () => {
    expect(
      buildRepresentativeSollosPayload([
        {
          OCORRENCIAS: [
            { INFORMANTE: 'BASE I', CREDOR: 'A', VALOR: '10,00' },
          ],
        },
        {
          OCORRENCIAS: [
            { INFORMANTE: 'BASE I', CREDOR: 'B', VALOR: '20,00' },
            { INFORMANTE: 'BASE IV', CREDOR: 'C', VALOR: '30,00' },
          ],
        },
      ]),
    ).toEqual({
      OCORRENCIAS: [
        { INFORMANTE: 'BASE I', CREDOR: 'A', VALOR: '10,00' },
        { INFORMANTE: 'BASE IV', CREDOR: 'C', VALOR: '30,00' },
      ],
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
