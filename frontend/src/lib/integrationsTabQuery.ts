/** Chave de query na rota `/admin/integracoes` para abrir aba direta. */
export const INTEGRATIONS_TAB_QUERY_KEY = 'aba';

const ABA_PARAM: Record<'providers' | 'consultations' | 'types', string> = {
  providers: 'provedores',
  consultations: 'consultas',
  types: 'tipos',
};

export function parseIntegrationsTabFromSearch(
  params: URLSearchParams,
): 'providers' | 'consultations' | 'types' | null {
  const raw = params.get(INTEGRATIONS_TAB_QUERY_KEY)?.toLowerCase();
  if (raw === ABA_PARAM.types) return 'types';
  if (raw === ABA_PARAM.consultations) return 'consultations';
  if (raw === ABA_PARAM.providers) return 'providers';
  return null;
}

export function tabToIntegrationsAbaParam(tab: 'providers' | 'consultations' | 'types'): string {
  return ABA_PARAM[tab];
}

export function buildIntegrationsAdminUrl(tab: 'providers' | 'consultations' | 'types'): string {
  const aba = encodeURIComponent(ABA_PARAM[tab]);
  return `/admin/integracoes?${INTEGRATIONS_TAB_QUERY_KEY}=${aba}`;
}
