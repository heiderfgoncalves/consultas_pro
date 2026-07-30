export type SollosTemplatePersonType = 'PF' | 'PJ' | 'PF_PJ';

export type SollosTemplateProduct = {
  productId: string;
  productName: string;
  personType: SollosTemplatePersonType;
  preserveExistingTemplate?: boolean;
};

/**
 * Escopo fechado da primeira colecao oficial de relatorios Sollos.
 *
 * A ordem acompanha a lista aprovada para facilitar a conferencia humana.
 * O produto 1079 e somente uma referencia: seu template existente nao pode
 * ser recriado nem alterado pelo gerador.
 */
export const SOLLOS_TEMPLATE_PRODUCTS: readonly SollosTemplateProduct[] = [
  { productId: '2451', productName: 'QUOD COMPLETO PJ + SCORE', personType: 'PJ' },
  { productId: '2391', productName: 'QUOD RESTRITIVO + AÇÕES PF', personType: 'PF' },
  { productId: '2392', productName: 'QUOD RESTRITIVO + AÇÕES PJ', personType: 'PJ' },
  { productId: '2450', productName: 'QUOD COMPLETO PF + SCORE', personType: 'PF' },
  { productId: '723', productName: 'MAX BRASIL AVANÇADO CPF', personType: 'PF' },
  { productId: '1723', productName: 'PROTESTO NACIONAL', personType: 'PF_PJ' },
  {
    productId: '2502',
    productName: 'PROTESTO NACIONAL PROVEDOR 2',
    personType: 'PF_PJ',
  },
  {
    productId: '708',
    productName: 'REALTIME PREMIUM + SCR BACEN',
    personType: 'PF_PJ',
  },
  {
    productId: '1080',
    productName: 'SCR BACEN PREMIUM + SCORE',
    personType: 'PF_PJ',
  },
  { productId: '756', productName: 'TOP +', personType: 'PF_PJ' },
  { productId: '1076', productName: 'TOP BRASIL', personType: 'PF_PJ' },
  {
    productId: '1264',
    productName: 'RELATÓRIO SIMPLES - PF/PJ',
    personType: 'PF_PJ',
  },
  {
    productId: '1266',
    productName: 'REALTIME + BVS + SCORE PF/PJ',
    personType: 'PF_PJ',
  },
  {
    productId: '707',
    productName: 'REALTIME + SCORE OFICIAL PF/PJ',
    personType: 'PF_PJ',
  },
  {
    productId: '2259',
    productName: 'REALTIME PREMIUM PF/PJ',
    personType: 'PF_PJ',
  },
  { productId: '1083', productName: 'CHECK-UP CRÉDITO', personType: 'PF_PJ' },
  {
    productId: '1078',
    productName: 'COMPLETA BRASIL + SCORE CNPJ',
    personType: 'PJ',
  },
  {
    productId: '1079',
    productName: 'COMPLETA BRASIL + SCORE CPF',
    personType: 'PF',
    preserveExistingTemplate: true,
  },
  { productId: '680', productName: 'CENPROT + CCF BACEN', personType: 'PF_PJ' },
  {
    productId: '1721',
    productName: 'BOA VISTA ACERTA/DEFINE + SCORE',
    personType: 'PF_PJ',
  },
  {
    productId: '699',
    productName: 'CAPACIDADE CRÉDITO RATING PF/PJ',
    personType: 'PF_PJ',
  },
  {
    productId: '700',
    productName: 'CAPACIDADE CRÉDITO RATING PREMIUM + SCR BACEN',
    personType: 'PF_PJ',
  },
  {
    productId: '676',
    productName: 'COMPLETA BRASIL PREMIUM PF/PJ',
    personType: 'PF_PJ',
  },
  {
    productId: '1082',
    productName: 'COMPLETA PLUS + SCORE PF/PJ',
    personType: 'PF_PJ',
  },
  {
    productId: '1077',
    productName: 'COMPLETA PLUS PREMIUM',
    personType: 'PF_PJ',
  },
  { productId: '724', productName: 'MAX BRASIL AVANÇADO CNPJ', personType: 'PJ' },
  {
    productId: '863',
    productName: 'COMPLETA PLUS + BVS + AÇÕES 24H CPF',
    personType: 'PF',
  },
  { productId: '747', productName: 'COMPLETA PLUS', personType: 'PF_PJ' },
  {
    productId: '697',
    productName: 'COMPLETA PLUS + AÇÕES 24H',
    personType: 'PF_PJ',
  },
  {
    productId: '753',
    productName: 'COMPLETA PLUS + BVS + AÇÕES 24H CNPJ',
    personType: 'PJ',
  },
] as const;
