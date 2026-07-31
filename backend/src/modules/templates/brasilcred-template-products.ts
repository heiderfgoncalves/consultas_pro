export type BrasilCredTemplatePersonType = 'PF' | 'PJ' | 'PF_PJ';

export type BrasilCredTemplateProduct = {
  productId: string;
  productName: string;
  personType: BrasilCredTemplatePersonType;
  endpointPath: string;
  /** Produto assincrono: responde 202 e exige polling em GET /consultations/{id}. */
  async: boolean;
};

/**
 * Escopo fechado da colecao oficial de relatorios Brasil Cred.
 *
 * O contrato de dados e o schema neutro `RadarPronampeResult` entregue pela API
 * publica — 34 caminhos folha, whitelist-only, sem PII de terceiro. O dump
 * interno em `logs/radar_pronampe_brasilconsultas.json` (522 caminhos) NAO chega
 * por API e nao deve ser usado como fonte de mapeamento.
 */
export const BRASILCRED_TEMPLATE_PRODUCTS: readonly BrasilCredTemplateProduct[] =
  [
    {
      productId: 'radar-pronampe-pj',
      productName: 'Radar PRONAMPE (CNPJ)',
      personType: 'PJ',
      endpointPath: '/consult/radar-pronampe',
      async: true,
    },
  ];

export type BrasilCredFieldSpec = {
  /** Chave do campo dentro do tipo canonico. */
  key: string;
  /** Rotulo exibido ao cliente final. */
  label: string;
  /** Caminho no JSON de origem, relativo a raiz da resposta. */
  sourcePath: string;
  dataType: 'string' | 'number' | 'currency' | 'date' | 'boolean' | 'cnpj';
  /** Campo ausente em parte das amostras — a secao precisa se auto-ocultar. */
  optional?: boolean;
  /** Dicionario de traducao codigo -> texto exibido. */
  lookup?: Record<string, string>;
  /** Campo tecnico: fica no inventario de auditoria, fora do relatorio. */
  auditOnly?: boolean;
};

export type BrasilCredTypeSpec = {
  key: string;
  label: string;
  description: string;
  /** Origem do bloco no JSON; vazio = raiz. */
  sourcePath: string;
  isCollection: boolean;
  fields: BrasilCredFieldSpec[];
  /**
   * Produto que alimenta este bloco na consulta composta.
   * `radar-pronampe` = validado contra 7 amostras reais.
   * Demais = mapeados pelo schema publicado; aguardam amostra para validacao.
   */
  product?: 'radar-pronampe' | 'diagnostico-pj' | 'scr-bacen' | 'cadastro';
  /** false = contrato vindo da documentacao, ainda sem amostra real. */
  validatedAgainstSample?: boolean;
};

/** Porte da empresa — Receita Federal. Confirmado nos PDFs do painel. */
const PORTE_LOOKUP: Record<string, string> = {
  '01': 'Microempresa (ME)',
  '03': 'Empresa de Pequeno Porte (EPP)',
  '05': 'Demais',
};

/** Situacao cadastral — Receita Federal. "2" = ATIVA, confirmado nos PDFs. */
const SITUACAO_LOOKUP: Record<string, string> = {
  '1': 'Nula',
  '2': 'Ativa',
  '3': 'Suspensa',
  '4': 'Inapta',
  '8': 'Baixada',
};

const SIM_NAO_LOOKUP: Record<string, string> = {
  true: 'Sim',
  false: 'Não',
};

/**
 * Faixas de risco em ingles usadas por `score` e `credit_recommendation`.
 * `credit_portfolio.risk_level` ja vem em portugues e NAO usa este dicionario —
 * sao metricas distintas (risco da empresa x risco da carteira SCR).
 */
const RISK_LEVEL_LOOKUP: Record<string, string> = {
  low: 'Baixo',
  medium: 'Médio',
  high: 'Alto',
  very_high: 'Muito alto',
};

const CERTIDAO_LOOKUP: Record<string, string> = {
  issued: 'Emitida',
  not_issued: 'Não emitida',
};

const STATUS_LOOKUP: Record<string, string> = {
  success: 'Completa',
  partial: 'Parcial',
  error: 'Falha',
  processing: 'Em processamento',
};

/**
 * De-para completo do Radar PRONAMPE: 34 caminhos folha da API para tipos
 * canonicos do Consultas PRO. As chaves foram nomeadas para cair nas categorias
 * corretas de `classifyType`, preservando o agrupamento por assunto de negocio
 * do padrao CONSULTAS_PRO_1079.
 *
 * A ordem reproduz a narrativa editorial dos relatorios oficiais do painel
 * Brasil Cred: veredicto primeiro, evidencia depois.
 */
export const BRASILCRED_RADAR_PRONAMPE_TYPES: readonly BrasilCredTypeSpec[] = [
  {
    key: 'PRONAMPE_IDENTIFICACAO',
    label: 'Identificação da consulta',
    description: 'Protocolo, documento consultado e momento da apuração',
    sourcePath: '',
    isCollection: false,
    fields: [
      { key: 'protocolo', label: 'Protocolo', sourcePath: 'consultation_id', dataType: 'string' },
      { key: 'documento', label: 'CNPJ consultado', sourcePath: 'document', dataType: 'cnpj' },
      { key: 'data_consulta', label: 'Data da consulta', sourcePath: 'queried_at', dataType: 'date' },
      { key: 'produto', label: 'Produto', sourcePath: 'product_name', dataType: 'string' },
      { key: 'situacao_apuracao', label: 'Situação da apuração', sourcePath: 'status', dataType: 'string', lookup: STATUS_LOOKUP },
      { key: 'produto_codigo', label: 'Código do produto', sourcePath: 'product', dataType: 'string', auditOnly: true },
      { key: 'origem_dados', label: 'Origem dos dados', sourcePath: 'data_source', dataType: 'string', auditOnly: true },
      { key: 'registro_localizado', label: 'Registro localizado', sourcePath: 'result.found', dataType: 'boolean', lookup: SIM_NAO_LOOKUP, auditOnly: true },
    ],
  },
  {
    key: 'PRONAMPE_SCORE_CREDITO',
    label: 'Score de crédito',
    description: 'Pontuação de crédito da empresa e faixa de risco',
    sourcePath: 'score',
    isCollection: false,
    fields: [
      { key: 'pontuacao', label: 'Score', sourcePath: 'score.value', dataType: 'number', optional: true },
      { key: 'faixa_risco', label: 'Faixa de risco', sourcePath: 'score.risk_level', dataType: 'string', optional: true, lookup: RISK_LEVEL_LOOKUP },
      { key: 'escala_minima', label: 'Escala mínima', sourcePath: 'score.range_min', dataType: 'number', optional: true },
      { key: 'escala_maxima', label: 'Escala máxima', sourcePath: 'score.range_max', dataType: 'number', optional: true },
    ],
  },
  {
    key: 'PRONAMPE_RECOMENDACAO_RISCO_CREDITO',
    label: 'Recomendação de crédito',
    description: 'Limite recomendado, orientação de venda e risco associado',
    sourcePath: 'credit_recommendation',
    isCollection: false,
    fields: [
      { key: 'limite_recomendado', label: 'Limite recomendado', sourcePath: 'credit_recommendation.recommended_limit_brl', dataType: 'currency' },
      { key: 'orientacao_venda', label: 'Orientação de venda', sourcePath: 'credit_recommendation.sale_recommendation', dataType: 'string' },
      { key: 'faixa_risco', label: 'Risco da operação', sourcePath: 'credit_recommendation.risk_level', dataType: 'string', lookup: RISK_LEVEL_LOOKUP },
    ],
  },
  {
    key: 'PRONAMPE_CAPACIDADE_PAGAMENTO',
    label: 'Capacidade de pagamento',
    description: 'Capacidade mensal de pagamento e gasto estimado',
    sourcePath: 'payment_capacity',
    isCollection: false,
    fields: [
      { key: 'capacidade_mensal', label: 'Capacidade mensal de pagamento', sourcePath: 'payment_capacity.monthly_capacity_brl', dataType: 'currency', optional: true },
      { key: 'gasto_estimado', label: 'Gasto estimado', sourcePath: 'payment_capacity.estimated_spend_brl', dataType: 'currency', optional: true },
    ],
  },
  {
    key: 'PRONAMPE_DIVIDA_ATIVA_UNIAO',
    label: 'Dívida ativa da União',
    description: 'Restrições de dívida ativa federal (PGFN)',
    sourcePath: 'federal_debts',
    isCollection: false,
    fields: [
      { key: 'possui_divida', label: 'Possui dívida ativa', sourcePath: 'federal_debts.has_debt', dataType: 'boolean', lookup: SIM_NAO_LOOKUP },
      { key: 'quantidade', label: 'Quantidade de inscrições', sourcePath: 'federal_debts.count', dataType: 'number' },
    ],
  },
  {
    key: 'PRONAMPE_CERTIDAO_REGULARIDADE',
    label: 'Certidão de regularidade fiscal',
    description: 'Situação da certidão negativa de débitos',
    sourcePath: 'clearance_certificate',
    isCollection: false,
    fields: [
      { key: 'situacao', label: 'Situação da certidão', sourcePath: 'clearance_certificate.status', dataType: 'string', lookup: CERTIDAO_LOOKUP },
      { key: 'emitida', label: 'Certidão emitida', sourcePath: 'clearance_certificate.issued', dataType: 'boolean', lookup: SIM_NAO_LOOKUP },
    ],
  },
  {
    key: 'PRONAMPE_CARTEIRA_SCR_BACEN',
    label: 'Carteira de crédito — SCR Bacen',
    description: 'Endividamento bancário registrado no Sistema de Informações de Crédito',
    sourcePath: 'credit_portfolio',
    isCollection: false,
    fields: [
      { key: 'valor_total', label: 'Valor total da carteira', sourcePath: 'credit_portfolio.total_brl', dataType: 'currency', optional: true },
      { key: 'contratos_ativos', label: 'Contratos ativos', sourcePath: 'credit_portfolio.active_contracts', dataType: 'number' },
      { key: 'valor_vencido', label: 'Valor vencido', sourcePath: 'credit_portfolio.overdue_brl', dataType: 'currency', optional: true },
      { key: 'faixa_risco_carteira', label: 'Risco da carteira', sourcePath: 'credit_portfolio.risk_level', dataType: 'string' },
    ],
  },
  {
    key: 'PRONAMPE_CADASTRO_RECEITA',
    label: 'Cadastro na Receita Federal',
    description: 'Porte, situação cadastral, atividade principal e enquadramento tributário',
    sourcePath: 'company',
    isCollection: false,
    fields: [
      { key: 'porte', label: 'Porte', sourcePath: 'company.size', dataType: 'string', lookup: PORTE_LOOKUP },
      { key: 'situacao_cadastral', label: 'Situação cadastral', sourcePath: 'company.registration_status', dataType: 'string', lookup: SITUACAO_LOOKUP },
      { key: 'data_abertura', label: 'Data de abertura', sourcePath: 'company.opening_date', dataType: 'date' },
      { key: 'capital_social', label: 'Capital social', sourcePath: 'company.share_capital_brl', dataType: 'currency' },
      { key: 'cnae_principal', label: 'CNAE principal', sourcePath: 'company.main_activity_code', dataType: 'string' },
      { key: 'optante_simples', label: 'Optante pelo Simples', sourcePath: 'company.simples_optant', dataType: 'boolean', lookup: SIM_NAO_LOOKUP },
      { key: 'optante_mei', label: 'Optante pelo MEI', sourcePath: 'company.mei_optant', dataType: 'boolean', lookup: SIM_NAO_LOOKUP },
    ],
  },
  {
    key: 'PRONAMPE_QUADRO_SOCIETARIO',
    label: 'Quadro societário',
    description: 'Sócios com documento mascarado e indicação de restrições (LGPD)',
    sourcePath: 'partners',
    isCollection: true,
    fields: [
      { key: 'documento_mascarado', label: 'Documento', sourcePath: 'partners[*].document_masked', dataType: 'string' },
      { key: 'possui_restricoes', label: 'Possui restrições', sourcePath: 'partners[*].has_restrictions', dataType: 'boolean', lookup: SIM_NAO_LOOKUP },
    ],
  },
];

/** Total de caminhos folha cobertos pelo de-para. Trava de regressao. */
export const BRASILCRED_RADAR_PRONAMPE_LEAF_COUNT =
  BRASILCRED_RADAR_PRONAMPE_TYPES.reduce(
    (total, type) => total + type.fields.length,
    0,
  );

const IMPACTO_LOOKUP: Record<string, string> = {
  positivo: 'Positivo',
  negativo: 'Negativo',
  neutro: 'Neutro',
};

/** Rotulos legiveis para os fatores neutros do rating. */
const FATOR_LOOKUP: Record<string, string> = {
  credit_score: 'Score de crédito',
  alt_score: 'Score alternativo',
  secondary_score: 'Score secundário',
  central_bank_debt: 'Endividamento no Banco Central',
  protests: 'Protestos',
  negative_records: 'Registros negativos',
  bounced_checks: 'Cheques sem fundo',
};

const OCORRENCIA_LOOKUP: Record<string, string> = {
  debt: 'Dívida',
  collection: 'Cobrança',
  protest: 'Protesto',
  bounced_check: 'Cheque sem fundo',
  alt_registry: 'Registro alternativo',
  active: 'Ativa',
};

/**
 * Blocos complementares da consulta composta.
 *
 * O Radar PRONAMPE sozinho entrega ~25% do relatorio que o painel Brasil Cred
 * exibe. Estes produtos preenchem o restante usando a mesma API. O contrato foi
 * extraido do schema publicado; cada bloco fica marcado como nao validado ate
 * existir amostra real, exatamente como a Fabrica exige dos produtos Sollos.
 */
export const BRASILCRED_COMPOSICAO_TYPES: readonly BrasilCredTypeSpec[] = [
  {
    key: 'PRONAMPE_IDENTIFICACAO_EMPRESA',
    label: 'Identificação da empresa',
    description: 'Razão social e localização, vindas do Diagnóstico Financeiro',
    sourcePath: 'subject',
    isCollection: false,
    product: 'diagnostico-pj',
    validatedAgainstSample: false,
    fields: [
      { key: 'razao_social', label: 'Razão social', sourcePath: 'subject.name', dataType: 'string' },
      // O CNPJ acompanha a razao social: e o par que identifica a empresa no
      // cabecalho do relatorio. Vem da raiz, presente em ambos os produtos.
      { key: 'documento', label: 'CNPJ', sourcePath: 'document', dataType: 'cnpj' },
      { key: 'cidade', label: 'Cidade', sourcePath: 'subject.address.city', dataType: 'string', optional: true },
      { key: 'uf', label: 'UF', sourcePath: 'subject.address.state', dataType: 'string', optional: true },
      { key: 'cep', label: 'CEP', sourcePath: 'subject.address.zip', dataType: 'string', optional: true },
    ],
  },
  {
    key: 'PRONAMPE_RATING_BANCARIO_RISCO',
    label: 'Rating bancário',
    description: 'Nota A–F explicável, com parecer e nível de risco',
    sourcePath: 'rating',
    isCollection: false,
    product: 'diagnostico-pj',
    validatedAgainstSample: false,
    fields: [
      { key: 'nota', label: 'Nota', sourcePath: 'rating.grade', dataType: 'string' },
      { key: 'classificacao', label: 'Classificação', sourcePath: 'rating.description', dataType: 'string' },
      { key: 'pontuacao', label: 'Pontuação do rating', sourcePath: 'rating.score', dataType: 'number' },
      { key: 'faixa_risco', label: 'Nível de risco', sourcePath: 'rating.risk_level', dataType: 'string' },
      { key: 'parecer', label: 'Parecer executivo', sourcePath: 'rating.summary', dataType: 'string' },
    ],
  },
  {
    key: 'PRONAMPE_FATORES_RATING_RISCO',
    label: 'Fatores que sustentam o rating',
    description: 'Decomposição da nota em fatores positivos, neutros e negativos',
    sourcePath: 'rating.factors',
    isCollection: true,
    product: 'diagnostico-pj',
    validatedAgainstSample: false,
    fields: [
      { key: 'fator', label: 'Fator', sourcePath: 'rating.factors[*].factor', dataType: 'string', lookup: FATOR_LOOKUP },
      { key: 'valor', label: 'Valor apurado', sourcePath: 'rating.factors[*].value', dataType: 'string' },
      { key: 'impacto', label: 'Impacto', sourcePath: 'rating.factors[*].impact', dataType: 'string', lookup: IMPACTO_LOOKUP },
    ],
  },
  {
    key: 'PRONAMPE_RESTRICOES_ANOTACOES',
    label: 'Restrições e anotações',
    description: 'Dívidas, protestos, cheques e registros negativos consolidados',
    sourcePath: 'negative_records.items',
    isCollection: true,
    product: 'diagnostico-pj',
    validatedAgainstSample: false,
    fields: [
      { key: 'tipo', label: 'Tipo', sourcePath: 'negative_records.items[*].type', dataType: 'string', lookup: OCORRENCIA_LOOKUP },
      { key: 'credor', label: 'Credor', sourcePath: 'negative_records.items[*].creditor', dataType: 'string' },
      { key: 'valor', label: 'Valor', sourcePath: 'negative_records.items[*].amount_brl', dataType: 'currency' },
      { key: 'data', label: 'Data', sourcePath: 'negative_records.items[*].date', dataType: 'date' },
      { key: 'situacao', label: 'Situação', sourcePath: 'negative_records.items[*].status', dataType: 'string', lookup: OCORRENCIA_LOOKUP },
    ],
  },
  {
    key: 'PRONAMPE_RESTRICOES_RESUMO',
    label: 'Resumo das restrições',
    description: 'Quantidade e valor total das anotações negativas',
    sourcePath: 'negative_records',
    isCollection: false,
    product: 'diagnostico-pj',
    validatedAgainstSample: false,
    fields: [
      { key: 'quantidade', label: 'Quantidade de ocorrências', sourcePath: 'negative_records.total_count', dataType: 'number' },
      { key: 'valor_total', label: 'Valor total', sourcePath: 'negative_records.total_amount_brl', dataType: 'currency' },
    ],
  },
  {
    key: 'PRONAMPE_FATURAMENTO_CAPACIDADE',
    label: 'Faturamento estimado',
    description: 'Faturamento presumido e enquadramento econômico',
    sourcePath: 'income',
    isCollection: false,
    product: 'diagnostico-pj',
    validatedAgainstSample: false,
    fields: [
      { key: 'faturamento_estimado', label: 'Faturamento estimado', sourcePath: 'income.estimated_brl', dataType: 'currency' },
      { key: 'classe', label: 'Classe econômica', sourcePath: 'income.social_class', dataType: 'string', optional: true },
      { key: 'faixa', label: 'Faixa de faturamento', sourcePath: 'income.salary_range', dataType: 'string', optional: true },
    ],
  },
  {
    key: 'PRONAMPE_CARTEIRA_SCR_PREJUIZO',
    label: 'Prejuízo registrado no SCR',
    description: 'Perdas registradas na carteira bancária',
    sourcePath: 'credit_portfolio',
    isCollection: false,
    product: 'diagnostico-pj',
    validatedAgainstSample: false,
    fields: [
      { key: 'prejuizo', label: 'Prejuízo registrado', sourcePath: 'credit_portfolio.loss_brl', dataType: 'currency' },
    ],
  },
  {
    key: 'PRONAMPE_CONSULTAS_ANTERIORES',
    label: 'Consultas anteriores',
    description: 'Volume de consultas recentes ao documento',
    sourcePath: 'inquiries',
    isCollection: false,
    product: 'diagnostico-pj',
    validatedAgainstSample: false,
    fields: [
      { key: 'total', label: 'Total de consultas', sourcePath: 'inquiries.total', dataType: 'number' },
    ],
  },
];

/** Contrato completo da consulta composta: Radar PRONAMPE + complementos. */
export const BRASILCRED_COMPOSICAO_COMPLETA: readonly BrasilCredTypeSpec[] = [
  ...BRASILCRED_RADAR_PRONAMPE_TYPES.map((type) => ({
    ...type,
    product: 'radar-pronampe' as const,
    validatedAgainstSample: true,
  })),
  ...BRASILCRED_COMPOSICAO_TYPES,
];

export const BRASILCRED_COMPOSICAO_LEAF_COUNT =
  BRASILCRED_COMPOSICAO_COMPLETA.reduce(
    (total, type) => total + type.fields.length,
    0,
  );
