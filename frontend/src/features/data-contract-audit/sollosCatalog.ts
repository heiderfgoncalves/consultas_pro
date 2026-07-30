import { getSollosOfficialSamples } from './sollosHomologationSamples';

export type SollosCatalogEvidence =
  | 'documentation'
  | 'homologation-response'
  | 'cataloged-product';

export type SollosCatalogStatus =
  | 'documented'
  | 'sampling'
  | 'ready-for-review'
  | 'approved';

export type SollosProductCatalogEntry = {
  key: string;
  name: string;
  productId: string;
  personType: 'PF' | 'PJ' | 'PF_PJ';
  status: SollosCatalogStatus;
  evidence: SollosCatalogEvidence[];
  expectedCapabilities: string[];
  officialSampleCount: number;
  sampleCoverage: 'sufficient' | 'limited';
};

export const SOLLOS_CATALOG_VERSION = 2;

export const SOLLOS_ADAPTIVE_SAMPLING_POLICY = {
  minimumSamples: 10,
  targetSamples: 20,
  maximumSamples: 30,
  consecutiveStableSamplesToStop: 5,
  concurrency: 1,
  homologationOnly: true,
  automaticCataloging: false,
} as const;

type CatalogSeed = readonly [
  key: string,
  name: string,
  productId: string,
  personType: SollosProductCatalogEntry['personType'],
  expectedCapabilities?: readonly string[],
];

const CATALOG_SEEDS: readonly CatalogSeed[] = [
  ['quod-completo-pj-score', 'QUOD COMPLETO PJ + SCORE', '2451', 'PJ', ['QUOD', 'SCORE']],
  ['quod-restritivo-acoes-pf', 'QUOD RESTRITIVO + AÇÕES PF', '2391', 'PF', ['QUOD', 'AÇÕES CÍVEIS']],
  ['quod-restritivo-acoes-pj', 'QUOD RESTRITIVO + AÇÕES PJ', '2392', 'PJ', ['QUOD', 'AÇÕES CÍVEIS']],
  ['quod-completo-pf-score', 'QUOD COMPLETO PF + SCORE', '2450', 'PF', ['QUOD', 'SCORE']],
  ['max-brasil-avancado-cpf', 'MAX BRASIL AVANÇADO CPF', '723', 'PF'],
  ['protesto-nacional', 'PROTESTO NACIONAL', '1723', 'PF_PJ', ['PROTESTO_SINTETICO']],
  ['protesto-nacional-provedor-2', 'PROTESTO NACIONAL PROVEDOR 2', '2502', 'PF_PJ'],
  [
    'realtime-premium-scr-bacen',
    'REALTIME PREMIUM + SCR BACEN',
    '708',
    'PF_PJ',
    [
      'DADOS_RECEITA_FEDERAL',
      'PROTESTO_ANALITICO',
      'PENDENCIAS_FINANCEIRAS',
      'CCF_BACEN',
      'CCF_VAREJO',
      'SCORE',
      'RELATORIO_SCR',
    ],
  ],
  ['scr-bacen-premium-score', 'SCR BACEN PREMIUM + SCORE', '1080', 'PF_PJ', ['RELATORIO_SCR', 'SCORE']],
  ['top-plus', 'TOP +', '756', 'PF_PJ'],
  [
    'top-brasil',
    'TOP BRASIL',
    '1076',
    'PF_PJ',
    [
      'DADOS_RECEITA_FEDERAL',
      'PROTESTO_SINTETICO',
      'QUADRO_SOCIETARIO',
      'PENDENCIAS_FINANCEIRAS',
      'CCF_BACEN',
      'SCORE',
      'PENDENCIAS_REFIN',
      'PENDENCIAS_VENCIDAS',
    ],
  ],
  [
    'relatorio-simples-pf-pj',
    'RELATÓRIO SIMPLES - PF/PJ',
    '1264',
    'PF_PJ',
    [
      'DADOS_RECEITA_FEDERAL',
      'PROTESTO_ANALITICO',
      'PENDENCIAS_FINANCEIRAS',
      'CCF_BACEN',
      'RECHEQUE',
      'CONTUMACIA',
    ],
  ],
  ['realtime-bvs-score-pf-pj', 'REALTIME + BVS + SCORE PF/PJ', '1266', 'PF_PJ', ['PENDENCIAS_FINANCEIRAS', 'CCF_BACEN', 'CCF_VAREJO', 'SCORE']],
  ['realtime-score-oficial-pf-pj', 'REALTIME + SCORE OFICIAL PF/PJ', '707', 'PF_PJ', ['SCORE']],
  ['realtime-premium-pf-pj', 'REALTIME PREMIUM PF/PJ', '2259', 'PF_PJ'],
  ['check-up-credito', 'CHECK-UP CRÉDITO', '1083', 'PF_PJ', ['PROTESTO_ANALITICO', 'PENDENCIAS_FINANCEIRAS', 'CCF_BACEN', 'SCORE']],
  ['completa-brasil-score-cnpj', 'COMPLETA BRASIL + SCORE CNPJ', '1078', 'PJ', ['SCORE']],
  ['completa-brasil-score-cpf', 'COMPLETA BRASIL + SCORE CPF', '1079', 'PF', ['DADOS_RECEITA_FEDERAL', 'PENDENCIAS_FINANCEIRAS', 'PASSAGENS_COMERCIAIS']],
  ['cenprot-ccf-bacen', 'CENPROT + CCF BACEN', '680', 'PF_PJ', ['PROTESTO_SINTETICO', 'CCF_BACEN']],
  ['boa-vista-acerta-define-score', 'BOA VISTA ACERTA/DEFINE + SCORE', '1721', 'PF_PJ', ['PENDENCIAS_FINANCEIRAS', 'CCF_BACEN', 'CCF_VAREJO', 'SCORE']],
  ['capacidade-credito-rating-pf-pj', 'CAPACIDADE CRÉDITO RATING PF/PJ', '699', 'PF_PJ', ['DADOS_RECEITA_FEDERAL', 'CADIN']],
  ['capacidade-credito-rating-premium-scr-bacen', 'CAPACIDADE CRÉDITO RATING PREMIUM + SCR BACEN', '700', 'PF_PJ', ['DADOS_RECEITA_FEDERAL', 'CADIN', 'RELATORIO_SCR']],
  ['completa-brasil-premium-pf-pj', 'COMPLETA BRASIL PREMIUM PF/PJ', '676', 'PF_PJ', ['PROTESTO_ANALITICO', 'PENDENCIAS_FINANCEIRAS', 'CCF_BACEN', 'CCF_VAREJO', 'SCORE']],
  ['completa-plus-score-pf-pj', 'COMPLETA PLUS + SCORE PF/PJ', '1082', 'PF_PJ', ['SCORE']],
  ['completa-plus-premium', 'COMPLETA PLUS PREMIUM', '1077', 'PF_PJ'],
  ['max-brasil-avancado-cnpj', 'MAX BRASIL AVANÇADO CNPJ', '724', 'PJ'],
  ['completa-plus-bvs-acoes-24h-cpf', 'COMPLETA PLUS + BVS + AÇÕES 24H CPF', '863', 'PF', ['PENDENCIAS_FINANCEIRAS', 'PASSAGENS_COMERCIAIS', 'ACOES_CIVEIS']],
  ['completa-plus', 'COMPLETA PLUS', '747', 'PF_PJ'],
  ['completa-plus-acoes-24h', 'COMPLETA PLUS + AÇÕES 24H', '697', 'PF_PJ', ['PENDENCIAS_FINANCEIRAS', 'PASSAGENS_COMERCIAIS', 'ACOES_CIVEIS']],
  ['completa-plus-bvs-acoes-24h-cnpj', 'COMPLETA PLUS + BVS + AÇOES 24H CNPJ', '753', 'PJ', ['PROTESTO_ANALITICO', 'PENDENCIAS_FINANCEIRAS', 'CCF_BACEN', 'CCF_VAREJO', 'SCORE', 'ACOES_CIVEIS']],
] as const;

export const SOLLOS_TARGET_PRODUCTS: SollosProductCatalogEntry[] =
  CATALOG_SEEDS.map(
    ([key, name, productId, personType, expectedCapabilities = []]) => {
      const officialSampleCount = getSollosOfficialSamples(productId).length;
      const approved = productId === '1079';

      return {
        key,
        name,
        productId,
        personType,
        status: approved ? 'approved' : 'documented',
        evidence: approved
          ? ['documentation', 'homologation-response', 'cataloged-product']
          : ['documentation'],
        expectedCapabilities: [...expectedCapabilities],
        officialSampleCount,
        sampleCoverage:
          officialSampleCount >= SOLLOS_ADAPTIVE_SAMPLING_POLICY.minimumSamples
            ? 'sufficient'
            : 'limited',
      };
    },
  );

export function findSollosCatalogProductById(productId: string) {
  const normalized = productId.replace(/\D/g, '');
  return (
    SOLLOS_TARGET_PRODUCTS.find((product) => product.productId === normalized) ??
    null
  );
}
