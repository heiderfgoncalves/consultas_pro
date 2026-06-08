import type { ExpressionContext } from './expressionEngine';

export const MOCK_EXPRESSION_CONTEXT: ExpressionContext = {
  $json: {
    DIVIDAS_SPC: {
      included: true,
      totaisCalculados: { total: 2186.67, quantidade: 4 },
      registros: [
        { dtOcorr: '09/11/2025', contrato: 'FAT37521061', valor: 942.07, credor: 'MOGI GUACU/SP' },
        { dtOcorr: '01/09/2025', contrato: '00000000000000018330', valor: 116.66, credor: 'BRASILIA/DF' },
        { dtOcorr: '02/07/2025', contrato: '6505699953889900', valor: 302.70, credor: 'SÃO PAULO/SP' },
        { dtOcorr: '20/04/2025', contrato: 'F104071978', valor: 825.24, credor: 'CURITIBA/PR' },
      ],
    },
    DIVIDAS_SERASA: {
      included: true,
      totaisCalculados: { total: 91167.62, quantidade: 7 },
    },
    DIVIDAS_BOA_VISTA: {
      included: false,
      totaisCalculados: { total: 0, quantidade: 0 },
    },
    SCORE: {
      included: true,
      valor: 596,
      faixa: 'Regular',
      faixaMin: 401,
      faixaMax: 600,
      chancePagar: 59.60,
      probabilidadeInadimplencia: 40.40,
    },
    PROTESTOS: {
      included: true,
      totaisCalculados: { total: 0, quantidade: 0 },
    },
    BACEN: {
      included: true,
      consolidado: {
        carteiraAtiva: 44139.00,
        vencido: 20347.00,
        prejuizo: 0,
        limiteCredito: 2420.00,
      },
      relacionamento: {
        dataInicio: '29/07/2019',
        instituicoes: 5,
        operacoes: 9,
      },
    },
    RESUMO_FINANCEIRO: {
      totalApontado: 190828.59,
      totalDeduzido: 98654.57,
      riscoBacenVencido: 20347.00,
    },
  },
  $template: {
    protocol: 'CP-20848865',
    date: '05/04/2026',
    company: 'Consultas PRO',
  },
  $block: {
    id: '1',
    name: 'SPC',
    type: 'DIVIDAS_SPC',
  },
};
