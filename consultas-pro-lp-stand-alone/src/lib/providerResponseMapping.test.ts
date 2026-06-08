import { describe, expect, it } from 'vitest';
import {
  normalizeDedupFingerprintPart,
  buildByTypeWithGlobalDedupRemoved,
} from './providerResponseMapping';

describe('normalizeDedupFingerprintPart', () => {
  it('deve remover zeros à esquerda de strings puramente numéricas ou alfanuméricas', () => {
    // Casos numéricos com tamanhos de padding de zeros diferentes (ex: Serasa x Boa Vista)
    expect(normalizeDedupFingerprintPart('0000033240021171')).toBe('33240021171');
    expect(normalizeDedupFingerprintPart('0000000000033240021171')).toBe('33240021171');
    
    // Contratos puramente numéricos idênticos
    expect(normalizeDedupFingerprintPart('BBH02100062970699')).toBe('bbh02100062970699');
    
    // Contrato com zeros e letras
    expect(normalizeDedupFingerprintPart('000A123')).toBe('a123');
    
    // Valor vazio ou nulo
    expect(normalizeDedupFingerprintPart(null)).toBe('');
    expect(normalizeDedupFingerprintPart(undefined)).toBe('');
    expect(normalizeDedupFingerprintPart('000000')).toBe('0');
  });

  it('deve normalizar valores monetários e formatados de forma idêntica', () => {
    expect(normalizeDedupFingerprintPart('R$ 231,19')).toBe('231.19');
    expect(normalizeDedupFingerprintPart('R$ 231,19')).toBe('231.19'); // Espaço non-breaking space
    expect(normalizeDedupFingerprintPart('231.19')).toBe('23119');
  });

  it('deve manter datas de ocorrência intactas sem colidir com números normais', () => {
    expect(normalizeDedupFingerprintPart('01/10/2025')).toBe('01/10/2025');
  });
});

describe('buildByTypeWithGlobalDedupRemoved', () => {
  it('deve remover linhas duplicadas entre diferentes seções/tipos considerando prioridade em typeKeysInOrder', () => {
    const byType = {
      DIVIDAS_SPC: [
        { contrato: 'BBH02100062970699', valor: 'R$ 231,19', data_ocorrencia: '01/10/2025' },
      ],
      DIVIDAS_SERASA: [
        { contrato: 'BBH02100062970699', valor: 'R$ 231,19', data_ocorrencia: '01/10/2025' },
        { contrato: '0000033240021171', valor: 'R$ 630,23', data_ocorrencia: '01/09/2021' },
      ],
      DIVIDAS_BOA_VISTA: [
        { contrato: '0000000000033240021171', valor: 'R$ 630,23', data_ocorrencia: '25/12/2025' }, // não colide no cross-type se data ocorrência for diferente e fizer parte do dedup, mas colidiria se dedup usasse apenas contrato e valor
      ],
    };

    const typeKeysInOrder = ['DIVIDAS_SPC', 'DIVIDAS_SERASA', 'DIVIDAS_BOA_VISTA'];

    const rowInfo = new Map();
    // SPC dedup por contrato e valor
    rowInfo.set('DIVIDAS_SPC', {
      rows: byType.DIVIDAS_SPC,
      dedupKeys: ['contrato', 'valor'],
      dedupKeyToCanonical: new Map([
        ['contrato', 'contrato'],
        ['valor', 'valor'],
      ]),
    });
    // Serasa dedup por contrato e valor
    rowInfo.set('DIVIDAS_SERASA', {
      rows: byType.DIVIDAS_SERASA,
      dedupKeys: ['contrato', 'valor'],
      dedupKeyToCanonical: new Map([
        ['contrato', 'contrato'],
        ['valor', 'valor'],
      ]),
    });
    // Boa Vista dedup por contrato e valor
    rowInfo.set('DIVIDAS_BOA_VISTA', {
      rows: byType.DIVIDAS_BOA_VISTA,
      dedupKeys: ['contrato', 'valor'],
      dedupKeyToCanonical: new Map([
        ['contrato', 'contrato'],
        ['valor', 'valor'],
      ]),
    });

    const result = buildByTypeWithGlobalDedupRemoved(byType, typeKeysInOrder, rowInfo);

    // O SPC deve manter seu registro pois é o primeiro da ordem de prioridade
    expect(result.DIVIDAS_SPC).toHaveLength(1);

    // O Serasa deve remover a linha duplicada com o SPC (contrato BBH02100062970699) e manter apenas a outra (contrato 33240021171)
    expect(result.DIVIDAS_SERASA).toHaveLength(1);
    const serasaRows = result.DIVIDAS_SERASA as Array<Record<string, unknown>>;
    expect(serasaRows[0].contrato).toBe('0000033240021171');

    // O Boa Vista deve ter a linha com o contrato '0000000000033240021171' removida pois colide com o Serasa em contrato e valor (mesmo com número de zeros à esquerda diferente!)
    expect(result.DIVIDAS_BOA_VISTA).toHaveLength(0);
  });
});
