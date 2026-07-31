import type { ReportTemplate } from '../../lib/template-engine/template';
import type { ConsultasProBrandReference } from './consultas-pro-report-builder.service';
import {
  composeReport,
  type ComposerSection,
} from './consultas-pro-1079-composer';

/**
 * Relatorio do Radar PRONAMPE no padrao 1079.
 *
 * O acabamento vem inteiro do compositor da matriz: cabecalho, bloco de
 * identidade, cartoes, cabecalhos de secao e tabelas sao os mesmos componentes
 * do 1079. O que muda aqui e apenas QUAIS secoes existem e para onde as
 * formulas apontam — o contrato de dados do produto.
 */
export function buildRadarPronampeReport(
  brandReference: ConsultasProBrandReference,
): ReportTemplate {
  const sections: ComposerSection[] = [
    {
      kind: 'kpis',
      title: 'RESUMO FINANCEIRO',
      icon: 'Wallet',
      items: [
        {
          label: 'Limite recomendado',
          value: '{{toCurrency $PRONAMPE_RECOMENDACAO_RISCO_CREDITO.limite_recomendado}}',
          hint: 'Exposição sugerida',
        },
        {
          label: 'Capacidade mensal',
          value: '{{toCurrency $PRONAMPE_CAPACIDADE_PAGAMENTO.capacidade_mensal}}',
          hint: 'Pagamento suportado',
        },
        {
          label: 'Carteira no SCR',
          value: '{{toCurrency $PRONAMPE_CARTEIRA_SCR_BACEN.valor_total}}',
          hint: 'Endividamento bancário',
        },
      ],
    },
    // Secao de score clonada da matriz: medidor em arco, pontuacao colorida,
    // legenda de faixas e textos de apoio, apontando para a fonte do produto.
    {
      kind: 'score-block',
      scoreExpression: '$PRONAMPE_SCORE_CREDITO.pontuacao',
    },
    {
      kind: 'fields',
      title: 'RATING BANCÁRIO',
      icon: 'Award',
      items: [
        { label: 'Nota', value: '{{safeText $PRONAMPE_RATING_BANCARIO_RISCO.nota}}' },
        { label: 'Classificação', value: '{{safeText $PRONAMPE_RATING_BANCARIO_RISCO.classificacao}}' },
        { label: 'Risco da operação', value: '{{safeText $PRONAMPE_RECOMENDACAO_RISCO_CREDITO.faixa_risco}}' },
      ],
    },
    {
      kind: 'fields',
      title: 'RECOMENDAÇÃO',
      icon: 'Target',
      items: [
        {
          label: 'Orientação de venda',
          value: '{{safeText $PRONAMPE_RECOMENDACAO_RISCO_CREDITO.orientacao_venda}}',
        },
        {
          label: 'Faturamento estimado',
          value: '{{toCurrency $PRONAMPE_FATURAMENTO_CAPACIDADE.faturamento_estimado}}',
        },
        {
          label: 'Gasto estimado',
          value: '{{toCurrency $PRONAMPE_CAPACIDADE_PAGAMENTO.gasto_estimado}}',
        },
      ],
    },
    {
      kind: 'table',
      table: {
        title: 'FATORES DO RATING',
        icon: 'ListChecks',
        arrayPath: '$PRONAMPE_FATORES_RATING_RISCO',
        emptyMessage: 'Nenhum fator informado nesta consulta.',
        columns: [
          { label: 'Fator', path: 'fator', width: '44%' },
          { label: 'Apurado', path: 'valor', width: '34%' },
          { label: 'Impacto', path: 'impacto', width: '22%' },
        ],
      },
    },
    {
      kind: 'table',
      table: {
        title: 'RESTRIÇÕES E ANOTAÇÕES',
        icon: 'AlertTriangle',
        arrayPath: '$PRONAMPE_RESTRICOES_ANOTACOES',
        emptyMessage: 'Nenhuma restrição localizada nesta consulta.',
        columns: [
          { label: 'Tipo', path: 'tipo', width: '18%' },
          { label: 'Credor', path: 'credor', width: '34%' },
          { label: 'Valor (R$)', path: 'valor', format: 'currency', width: '20%' },
          { label: 'Data', path: 'data', format: 'date', width: '16%' },
          { label: 'Situação', path: 'situacao', width: '12%' },
        ],
      },
    },
    {
      kind: 'fields',
      title: 'SITUAÇÃO FISCAL',
      icon: 'ShieldCheck',
      items: [
        { label: 'Dívida ativa da União', value: '{{safeText $PRONAMPE_DIVIDA_ATIVA_UNIAO.possui_divida}}' },
        { label: 'Inscrições', value: '{{safeText $PRONAMPE_DIVIDA_ATIVA_UNIAO.quantidade}}' },
        { label: 'Certidão', value: '{{safeText $PRONAMPE_CERTIDAO_REGULARIDADE.situacao}}' },
        { label: 'Contratos ativos', value: '{{safeText $PRONAMPE_CARTEIRA_SCR_BACEN.contratos_ativos}}' },
        { label: 'Valor vencido', value: '{{toCurrency $PRONAMPE_CARTEIRA_SCR_BACEN.valor_vencido}}' },
        { label: 'Risco da carteira', value: '{{safeText $PRONAMPE_CARTEIRA_SCR_BACEN.faixa_risco_carteira}}' },
      ],
    },
    {
      kind: 'fields',
      title: 'CADASTRO RECEITA',
      icon: 'Building2',
      items: [
        { label: 'Porte', value: '{{safeText $PRONAMPE_CADASTRO_RECEITA.porte}}' },
        { label: 'Situação cadastral', value: '{{safeText $PRONAMPE_CADASTRO_RECEITA.situacao_cadastral}}' },
        { label: 'Abertura', value: '{{safeText $PRONAMPE_CADASTRO_RECEITA.data_abertura}}' },
        { label: 'Capital social', value: '{{toCurrency $PRONAMPE_CADASTRO_RECEITA.capital_social}}' },
        { label: 'CNAE principal', value: '{{safeText $PRONAMPE_CADASTRO_RECEITA.cnae_principal}}' },
        { label: 'Optante Simples', value: '{{safeText $PRONAMPE_CADASTRO_RECEITA.optante_simples}}' },
      ],
    },
    {
      kind: 'table',
      table: {
        title: 'QUADRO SOCIETÁRIO',
        icon: 'Users',
        arrayPath: '$PRONAMPE_QUADRO_SOCIETARIO',
        emptyMessage: 'Quadro societário não informado nesta consulta.',
        columns: [
          { label: 'Documento', path: 'documento_mascarado', width: '58%' },
          { label: 'Possui restrições', path: 'possui_restricoes', width: '42%' },
        ],
      },
    },
  ];

  return composeReport({
    templateId: 'brasilcred-template-radar-pronampe-composta',
    productName: 'Radar PRONAMPE — Análise Completa',
    reportKind: 'Radar PRONAMPE',
    identity: {
      nameExpression: '{{safeText $PRONAMPE_IDENTIFICACAO_EMPRESA.razao_social}}',
      documentExpression: '{{formatCpfCnpj $PRONAMPE_IDENTIFICACAO_EMPRESA.documento}}',
    },
    sections,
    brandReference,
    metadata: {
      provider: 'brasil-cred',
      product: 'radar-pronampe',
      composition: ['radar-pronampe', 'diagnostico-pj'],
    },
  });
}
