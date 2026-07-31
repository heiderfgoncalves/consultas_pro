import { AppError } from '../../core/errors';

/**
 * Politica de provedores habilitados na Fabrica de Templates.
 *
 * A Fabrica nasceu fechada na Sollos, com o endpoint de homologacao gravado no
 * codigo. Esta politica preserva exatamente aquela regra e permite registrar
 * novos provedores sem afrouxar a trava: cada provedor declara quais destinos
 * aceita, e nada fora da lista e catalogavel.
 */
export type FactoryProviderPolicy = {
  slug: string;
  label: string;
  /** Hosts permitidos para catalogacao. */
  allowedHosts: string[];
  /** Caminhos permitidos, em minusculas. Vazio = qualquer caminho do host. */
  allowedPaths: string[];
  /**
   * `exact` compara o pathname inteiro — usado onde a regra original ja era
   * exata. `suffix` aceita prefixo de gateway antes do caminho do produto,
   * necessario quando a baseUrl carrega um prefixo que `new URL` descarta.
   */
  pathMatch: 'exact' | 'suffix';
  /** Mensagem exibida quando o destino nao e permitido. */
  rejectionMessage: string;
  /** Produto assincrono (202 + polling) — exige integracao propria. */
  async: boolean;
};

export const FACTORY_PROVIDER_POLICIES: readonly FactoryProviderPolicy[] = [
  {
    slug: 'sollos',
    label: 'Sollos',
    allowedHosts: ['api.sollosconsultas.com.br'],
    allowedPaths: ['/json/homologa.aspx'],
    pathMatch: 'exact',
    rejectionMessage:
      'A Fábrica de Templates permite catalogar somente a homologação da Sollos',
    async: false,
  },
  {
    slug: 'brasil-cred',
    label: 'Brasil Cred',
    allowedHosts: ['sets.brasilcred.com.br'],
    allowedPaths: ['/consult/radar-pronampe'],
    pathMatch: 'suffix',
    rejectionMessage:
      'A Fábrica de Templates permite catalogar somente o Radar PRONAMPE da Brasil Cred',
    async: true,
  },
];

/** Resolve a politica pelo slug/nome do provedor. Null = provedor nao habilitado. */
export function findFactoryProviderPolicy(provider: {
  name: string;
  slug: string;
}): FactoryProviderPolicy | null {
  const slug = provider.slug.toLowerCase();
  const name = provider.name.toLowerCase();
  return (
    FACTORY_PROVIDER_POLICIES.find(
      (policy) =>
        slug === policy.slug ||
        slug.replace(/-/g, '') === policy.slug.replace(/-/g, '') ||
        name.includes(policy.label.toLowerCase()),
    ) ?? null
  );
}

export function assertFactoryProviderAllowed(provider: {
  name: string;
  slug: string;
}): FactoryProviderPolicy {
  const policy = findFactoryProviderPolicy(provider);
  if (!policy) {
    throw new AppError(
      400,
      'FACTORY_PROVIDER_NOT_ALLOWED',
      `A Fábrica de Templates ainda não está habilitada para o provedor ${provider.name}.`,
    );
  }
  return policy;
}

/** Reproduz a trava original: destino precisa ser HTTPS e estar na allowlist. */
export function assertFactoryEndpointAllowed(
  policy: FactoryProviderPolicy,
  baseUrl: string,
  endpointPath: string,
): void {
  const target = new URL(endpointPath, baseUrl);
  const pathname = target.pathname.toLowerCase();
  const safe =
    target.protocol === 'https:' &&
    policy.allowedHosts.includes(target.hostname) &&
    (policy.allowedPaths.length === 0 ||
      policy.allowedPaths.some((allowed) =>
        policy.pathMatch === 'exact'
          ? pathname === allowed
          : pathname === allowed || pathname.endsWith(allowed),
      ));

  if (!safe) {
    throw new AppError(400, 'HOMOLOGATION_ENDPOINT_REQUIRED', policy.rejectionMessage);
  }
}
