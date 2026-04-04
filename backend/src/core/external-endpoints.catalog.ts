/**
 * Catálogo canônico de endpoints HTTP expostos para integrações / white-label / Swagger.
 * Os `routeKey` seguem o padrão `api.<domínio>.<ação>` para alinhar com `ApiToken.scopes` no futuro.
 */
export type ExternalHttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type ExternalEndpointDefinition = {
  /** Chave estável usada na matriz de políticas e em escopos de token */
  routeKey: string;
  method: ExternalHttpMethod;
  /** Path Fastify (pode incluir `:param`) */
  path: string;
  group: string;
  label: string;
  description: string;
  /** Incluir em documentação OpenAPI futura quando aplicável */
  exposeInDocs: boolean;
};

/** Endpoints do módulo de consultas (API autenticada por JWT hoje). */
export const EXTERNAL_CONSULTATION_ENDPOINTS: ExternalEndpointDefinition[] = [
  {
    routeKey: 'api.consultations.create',
    method: 'POST',
    path: '/consultations',
    group: 'Consultas',
    label: 'Criar consulta',
    description: 'Inicia uma nova emissão de consulta (template, documento, produtos).',
    exposeInDocs: true,
  },
  {
    routeKey: 'api.consultations.list',
    method: 'GET',
    path: '/consultations',
    group: 'Consultas',
    label: 'Listar consultas',
    description: 'Lista consultas da empresa ou do usuário autenticado.',
    exposeInDocs: true,
  },
  {
    routeKey: 'api.consultations.get',
    method: 'GET',
    path: '/consultations/:id',
    group: 'Consultas',
    label: 'Obter consulta',
    description: 'Retorna uma consulta por id, com itens e execuções.',
    exposeInDocs: true,
  },
  {
    routeKey: 'api.consultations.mergePreview',
    method: 'POST',
    path: '/consultations/merge-preview',
    group: 'Consultas',
    label: 'Pré-visualizar merge',
    description: 'Consolida pré-visualização de payloads (execuções / test logs).',
    exposeInDocs: true,
  },
];

export const EXTERNAL_ENDPOINT_CATALOG: ExternalEndpointDefinition[] = [...EXTERNAL_CONSULTATION_ENDPOINTS];

export function getExternalCatalogRouteKeys(): string[] {
  return EXTERNAL_ENDPOINT_CATALOG.map((e) => e.routeKey);
}

export function isKnownExternalRouteKey(routeKey: string): boolean {
  return EXTERNAL_ENDPOINT_CATALOG.some((e) => e.routeKey === routeKey);
}
