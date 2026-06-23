export interface DefaultCanonicalSectionField {
  pathKey: string;
  label: string;
  description?: string;
}

/** Tipos canônicos globais exibidos na aba Tipos do admin. */
export const DEFAULT_CANONICAL_SECTION_FIELDS: DefaultCanonicalSectionField[] = [
  { pathKey: 'DADOS_PESSOAIS', label: 'Dados Pessoais', description: 'Nome, CPF, data de nascimento, endereço' },
  { pathKey: 'DIVIDAS_SPC', label: 'Dívidas SPC', description: 'Registros de inadimplência no SPC Brasil' },
  { pathKey: 'DIVIDAS_SERASA', label: 'Dívidas Serasa', description: 'Registros de negativação Serasa Experian' },
  { pathKey: 'DIVIDAS_BOA_VISTA', label: 'Dívidas Boa Vista', description: 'Apontamentos SCPC Boa Vista' },
  { pathKey: 'SCORE', label: 'Score de Crédito', description: 'Pontuação de risco 0-1000' },
  { pathKey: 'PROTESTO_CARTORIO', label: 'Protestos em Cartório', description: 'Títulos protestados em cartórios' },
  { pathKey: 'APONTAMENTOS_BACEN', label: 'Apontamentos Bacen', description: 'Dados do Banco Central (Registrato)' },
  { pathKey: 'CHEQUES_DEVOLVIDOS', label: 'Cheques Devolvidos', description: 'Cheques sem fundo devolvidos' },
  { pathKey: 'PARTICIPACAO_SOCIETARIA', label: 'Participação Societária', description: 'Empresas vinculadas ao documento' },
  { pathKey: 'RENDA_PRESUMIDA', label: 'Renda Presumida', description: 'Estimativa de renda com base em dados de mercado' },
  { pathKey: 'CAPACIDADE_PAGAMENTO', label: 'Capacidade de Pagamento', description: 'Análise de capacidade de pagamento mensal' },
  { pathKey: 'RATING', label: 'Rating de Crédito', description: 'Classificação por letras (AAA a D)' },
];
