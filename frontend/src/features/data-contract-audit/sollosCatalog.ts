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

export type SollosHomologationAudit = {
  auditedAt: string;
  samples: number;
  failedSamples: number;
  uniquePaths: number;
  mappedPaths?: number;
  totalMappablePaths?: number;
  validatedFields: number;
  validatedOccurrences: number;
  blocked: boolean;
  result: 'ready-for-manual-review' | 'cataloged-and-revalidated';
};

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
  audit: SollosHomologationAudit;
};

export const SOLLOS_CATALOG_VERSION = 3;

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

const SOLLOS_HOMOLOGATION_AUDITS: Readonly<
  Record<string, SollosHomologationAudit>
> = {
  '2451': { auditedAt: '2026-07-30', samples: 20, failedSamples: 0, uniquePaths: 484, mappedPaths: 471, totalMappablePaths: 471, validatedFields: 355, validatedOccurrences: 18, blocked: false, result: 'ready-for-manual-review' },
  '2391': { auditedAt: '2026-07-30', samples: 7, failedSamples: 0, uniquePaths: 337, mappedPaths: 331, totalMappablePaths: 331, validatedFields: 250, validatedOccurrences: 0, blocked: false, result: 'ready-for-manual-review' },
  '2392': { auditedAt: '2026-07-30', samples: 5, failedSamples: 0, uniquePaths: 347, mappedPaths: 340, totalMappablePaths: 340, validatedFields: 224, validatedOccurrences: 1, blocked: false, result: 'ready-for-manual-review' },
  '2450': { auditedAt: '2026-07-30', samples: 20, failedSamples: 0, uniquePaths: 455, mappedPaths: 442, totalMappablePaths: 442, validatedFields: 370, validatedOccurrences: 17, blocked: false, result: 'ready-for-manual-review' },
  '723': { auditedAt: '2026-07-30', samples: 20, failedSamples: 0, uniquePaths: 397, mappedPaths: 387, totalMappablePaths: 387, validatedFields: 306, validatedOccurrences: 60, blocked: false, result: 'ready-for-manual-review' },
  '1723': { auditedAt: '2026-07-30', samples: 20, failedSamples: 0, uniquePaths: 287, mappedPaths: 284, totalMappablePaths: 284, validatedFields: 230, validatedOccurrences: 0, blocked: false, result: 'ready-for-manual-review' },
  '2502': { auditedAt: '2026-07-30', samples: 12, failedSamples: 0, uniquePaths: 274, mappedPaths: 271, totalMappablePaths: 271, validatedFields: 217, validatedOccurrences: 0, blocked: false, result: 'ready-for-manual-review' },
  '708': { auditedAt: '2026-07-30', samples: 20, failedSamples: 0, uniquePaths: 731, mappedPaths: 692, totalMappablePaths: 692, validatedFields: 594, validatedOccurrences: 41, blocked: false, result: 'ready-for-manual-review' },
  '1080': { auditedAt: '2026-07-30', samples: 20, failedSamples: 0, uniquePaths: 322, mappedPaths: 314, totalMappablePaths: 314, validatedFields: 236, validatedOccurrences: 0, blocked: false, result: 'ready-for-manual-review' },
  '756': { auditedAt: '2026-07-30', samples: 20, failedSamples: 0, uniquePaths: 782, mappedPaths: 750, totalMappablePaths: 750, validatedFields: 642, validatedOccurrences: 25, blocked: false, result: 'ready-for-manual-review' },
  '1076': { auditedAt: '2026-07-30', samples: 20, failedSamples: 0, uniquePaths: 369, mappedPaths: 360, totalMappablePaths: 360, validatedFields: 279, validatedOccurrences: 29, blocked: false, result: 'ready-for-manual-review' },
  '1264': { auditedAt: '2026-07-30', samples: 20, failedSamples: 0, uniquePaths: 435, mappedPaths: 425, totalMappablePaths: 425, validatedFields: 336, validatedOccurrences: 25, blocked: false, result: 'ready-for-manual-review' },
  '1266': { auditedAt: '2026-07-30', samples: 20, failedSamples: 0, uniquePaths: 655, mappedPaths: 623, totalMappablePaths: 623, validatedFields: 533, validatedOccurrences: 36, blocked: false, result: 'ready-for-manual-review' },
  '707': { auditedAt: '2026-07-30', samples: 20, failedSamples: 0, uniquePaths: 383, mappedPaths: 373, totalMappablePaths: 373, validatedFields: 284, validatedOccurrences: 38, blocked: false, result: 'ready-for-manual-review' },
  '2259': { auditedAt: '2026-07-30', samples: 20, failedSamples: 0, uniquePaths: 396, mappedPaths: 386, totalMappablePaths: 386, validatedFields: 305, validatedOccurrences: 21, blocked: false, result: 'ready-for-manual-review' },
  '1083': { auditedAt: '2026-07-30', samples: 20, failedSamples: 0, uniquePaths: 627, mappedPaths: 598, totalMappablePaths: 598, validatedFields: 473, validatedOccurrences: 33, blocked: false, result: 'ready-for-manual-review' },
  '1078': { auditedAt: '2026-07-30', samples: 20, failedSamples: 0, uniquePaths: 364, mappedPaths: 355, totalMappablePaths: 355, validatedFields: 266, validatedOccurrences: 40, blocked: false, result: 'ready-for-manual-review' },
  '1079': { auditedAt: '2026-07-30', samples: 20, failedSamples: 0, uniquePaths: 395, validatedFields: 27, validatedOccurrences: 59, blocked: false, result: 'cataloged-and-revalidated' },
  '680': { auditedAt: '2026-07-30', samples: 16, failedSamples: 0, uniquePaths: 302, mappedPaths: 298, totalMappablePaths: 298, validatedFields: 233, validatedOccurrences: 0, blocked: false, result: 'ready-for-manual-review' },
  '1721': { auditedAt: '2026-07-30', samples: 20, failedSamples: 0, uniquePaths: 594, mappedPaths: 566, totalMappablePaths: 566, validatedFields: 476, validatedOccurrences: 25, blocked: false, result: 'ready-for-manual-review' },
  '699': { auditedAt: '2026-07-30', samples: 20, failedSamples: 0, uniquePaths: 600, mappedPaths: 581, totalMappablePaths: 581, validatedFields: 483, validatedOccurrences: 25, blocked: false, result: 'ready-for-manual-review' },
  '700': { auditedAt: '2026-07-30', samples: 20, failedSamples: 0, uniquePaths: 681, mappedPaths: 655, totalMappablePaths: 655, validatedFields: 557, validatedOccurrences: 38, blocked: false, result: 'ready-for-manual-review' },
  '676': { auditedAt: '2026-07-30', samples: 20, failedSamples: 0, uniquePaths: 570, mappedPaths: 546, totalMappablePaths: 546, validatedFields: 430, validatedOccurrences: 50, blocked: false, result: 'ready-for-manual-review' },
  '1082': { auditedAt: '2026-07-30', samples: 20, failedSamples: 0, uniquePaths: 733, mappedPaths: 700, totalMappablePaths: 700, validatedFields: 611, validatedOccurrences: 25, blocked: false, result: 'ready-for-manual-review' },
  '1077': { auditedAt: '2026-07-30', samples: 20, failedSamples: 0, uniquePaths: 641, mappedPaths: 619, totalMappablePaths: 619, validatedFields: 503, validatedOccurrences: 25, blocked: false, result: 'ready-for-manual-review' },
  '724': { auditedAt: '2026-07-30', samples: 20, failedSamples: 0, uniquePaths: 364, mappedPaths: 355, totalMappablePaths: 355, validatedFields: 266, validatedOccurrences: 47, blocked: false, result: 'ready-for-manual-review' },
  '863': { auditedAt: '2026-07-30', samples: 20, failedSamples: 0, uniquePaths: 372, mappedPaths: 364, totalMappablePaths: 364, validatedFields: 256, validatedOccurrences: 25, blocked: false, result: 'ready-for-manual-review' },
  '747': { auditedAt: '2026-07-30', samples: 20, failedSamples: 0, uniquePaths: 697, mappedPaths: 667, totalMappablePaths: 667, validatedFields: 586, validatedOccurrences: 25, blocked: false, result: 'ready-for-manual-review' },
  '697': { auditedAt: '2026-07-30', samples: 20, failedSamples: 0, uniquePaths: 394, mappedPaths: 384, totalMappablePaths: 384, validatedFields: 268, validatedOccurrences: 25, blocked: false, result: 'ready-for-manual-review' },
  '753': { auditedAt: '2026-07-30', samples: 20, failedSamples: 0, uniquePaths: 494, mappedPaths: 475, totalMappablePaths: 475, validatedFields: 386, validatedOccurrences: 4, blocked: false, result: 'ready-for-manual-review' },
};

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
        audit: SOLLOS_HOMOLOGATION_AUDITS[productId],
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
