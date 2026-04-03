/** Metadados de UI para seções do catálogo canônico (pathKey = chave da aba Tipos). */
export const UI_SECTION_PATH_KEYS = new Set([
  'DADOS_PESSOAIS',
  'DIVIDAS_SPC',
  'DIVIDAS_SERASA',
  'DIVIDAS_BOA_VISTA',
  'SCORE_CREDITO',
  'PROTESTO_CARTORIO',
  'APONTAMENTOS_BACEN',
  'CHEQUES_DEVOLVIDOS',
  'PARTICIPACAO_SOCIETARIA',
  'RENDA_PRESUMIDA',
  'CAPACIDADE_PAGAMENTO',
  'RATING_CREDITO',
]);

export const PATH_KEY_UI_META: Record<string, { color: string; icon: string }> = {
  DADOS_PESSOAIS: { color: 'primary', icon: 'User' },
  DIVIDAS_SPC: { color: 'destructive', icon: 'AlertTriangle' },
  DIVIDAS_SERASA: { color: 'destructive', icon: 'AlertTriangle' },
  DIVIDAS_BOA_VISTA: { color: 'destructive', icon: 'AlertTriangle' },
  SCORE_CREDITO: { color: 'warning', icon: 'Gauge' },
  PROTESTO_CARTORIO: { color: 'warning', icon: 'FileWarning' },
  APONTAMENTOS_BACEN: { color: 'info', icon: 'Building2' },
  CHEQUES_DEVOLVIDOS: { color: 'warning', icon: 'FileX' },
  PARTICIPACAO_SOCIETARIA: { color: 'info', icon: 'Users' },
  RENDA_PRESUMIDA: { color: 'success', icon: 'DollarSign' },
  CAPACIDADE_PAGAMENTO: { color: 'success', icon: 'TrendingUp' },
  RATING_CREDITO: { color: 'warning', icon: 'Award' },
};
