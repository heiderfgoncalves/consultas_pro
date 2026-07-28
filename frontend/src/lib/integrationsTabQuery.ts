/** Chave de query na rota `/admin/integracoes` para abrir aba direta. */
export const INTEGRATIONS_TAB_QUERY_KEY = 'aba';

export type IntegrationsTab =
  | 'providers'
  | 'consultations'
  | 'types'
  | 'templates'
  | 'templates_plus'
  | 'data_contract'
  | 'settings';

const ABA_PARAM: Record<IntegrationsTab, string> = {
  providers: 'provedores',
  consultations: 'consultas',
  types: 'tipos',
  templates: 'templates',
  templates_plus: 'templates-plus',
  data_contract: 'fabrica-templates',
  settings: 'configuracoes',
};

export function parseIntegrationsTabFromSearch(
  params: URLSearchParams,
): IntegrationsTab | null {
  const raw = params.get(INTEGRATIONS_TAB_QUERY_KEY)?.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
  if (raw === ABA_PARAM.templates) return 'templates';
  if (raw === ABA_PARAM.templates_plus) return 'templates_plus';
  if (raw === ABA_PARAM.data_contract || raw === 'contrato-dados') return 'data_contract';
  if (raw === ABA_PARAM.types) return 'types';
  if (raw === ABA_PARAM.consultations) return 'consultations';
  if (raw === ABA_PARAM.providers) return 'providers';
  if (raw === ABA_PARAM.settings) return 'settings';
  return null;
}

export function tabToIntegrationsAbaParam(tab: IntegrationsTab): string {
  return ABA_PARAM[tab];
}

export function buildIntegrationsAdminUrl(tab: IntegrationsTab): string {
  const aba = encodeURIComponent(ABA_PARAM[tab]);
  return `/admin/integracoes?${INTEGRATIONS_TAB_QUERY_KEY}=${aba}`;
}
