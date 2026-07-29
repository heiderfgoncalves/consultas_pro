import { describe, expect, it } from 'vitest';
import type {
  ConsultationFieldType,
  ProviderConsultation,
} from '@/types/integrations';
import { buildAutomaticDraftMapping } from './draftMapping';

const fieldTypes: ConsultationFieldType[] = [
  {
    id: 'type-1',
    key: 'DIVIDAS_SERASA',
    label: 'Dívidas Serasa',
    description: '',
    color: '',
    icon: '',
  },
  {
    id: 'type-2',
    key: 'DADOS_PESSOAIS',
    label: 'Dados pessoais',
    description: '',
    color: '',
    icon: '',
  },
];

const reference: ProviderConsultation = {
  id: 'known-product',
  providerId: 'sollos',
  name: 'Produto conhecido',
  externalId: '1079',
  endpoint: '/json/homologa.aspx',
  method: 'POST',
  cost: 0,
  consultationPrice: 0,
  fieldMappings: [
    {
      jsonPath: 'CREDCADASTRAL.DIVIDAS_SERASA',
      fieldTypeKey: 'DIVIDAS_SERASA',
      label: 'Dívidas Serasa',
    },
  ],
  typeItemFilters: {
    DIVIDAS_SERASA: {
      version: 2,
      groups: [],
      fieldMappings: [],
      dedupFieldIds: [],
      computedFields: [],
    },
  },
  updatedAt: '2026-01-01T00:00:00.000Z',
  status: 'active',
};

describe('buildAutomaticDraftMapping', () => {
  it('reconhece blocos de produto novo usando contratos já catalogados', () => {
    const result = buildAutomaticDraftMapping({
      rawJson: JSON.stringify({
        CREDCADASTRAL: {
          DIVIDAS_SERASA: [{ VALOR: '10,00' }],
        },
      }),
      productCode: '676',
      consultations: [reference],
      fieldTypes,
    });

    expect(result.consultation.externalId).toBe('676');
    expect(result.consultation.fieldMappings).toContainEqual(
      expect.objectContaining({
        jsonPath: 'CREDCADASTRAL.DIVIDAS_SERASA',
        fieldTypeKey: 'DIVIDAS_SERASA',
      }),
    );
    expect(
      result.suggestions.find((item) => item.typeKey === 'DIVIDAS_SERASA'),
    ).toEqual(
      expect.objectContaining({
        confidence: 'high',
        sourcePath: 'CREDCADASTRAL.DIVIDAS_SERASA',
      }),
    );
  });

  it('marca como não mapeado quando não existe correspondência segura', () => {
    const result = buildAutomaticDraftMapping({
      rawJson: JSON.stringify({ HEADER: { STATUS: '1' } }),
      productCode: '676',
      consultations: [reference],
      fieldTypes,
    });

    expect(
      result.suggestions.find((item) => item.typeKey === 'DADOS_PESSOAIS'),
    ).toEqual(expect.objectContaining({ confidence: 'unmapped' }));
  });

  it('cria tipos provisórios para estruturas e bases inéditas', () => {
    const result = buildAutomaticDraftMapping({
      rawJson: JSON.stringify({
        CREDCADASTRAL: {
          ACOES_JUDICIAIS: [
            { PROCESSO: '123', VALOR: 'R$ 50,00', TRIBUNAL: 'TJSP' },
          ],
          PEND_FINANCEIRAS: {
            OCORRENCIAS: [
              {
                INFORMANTE: 'QUOD',
                CREDOR: 'EMPRESA',
                VALOR: '10,00',
              },
            ],
          },
        },
        HEADER: {
          CONTROLE: {
            DADOS_RETORNADOS: {
              RELATORIO_JURIDICO: '1',
            },
          },
        },
      }),
      productCode: '676',
      consultations: [reference],
      fieldTypes,
    });

    expect(result.coverage.coveredLeafPaths).toBe(
      result.coverage.totalLeafPaths,
    );
    expect(result.fieldTypes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'DIVIDAS_QUOD' }),
        expect.objectContaining({
          key: 'NOVO_CREDCADASTRAL_ACOES_JUDICIAIS',
        }),
        expect.objectContaining({ key: 'PREVISTO_RELATORIO_JURIDICO' }),
      ]),
    );
    expect(result.suggestions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          typeKey: 'DIVIDAS_QUOD',
          confidence: 'new',
        }),
      ]),
    );
  });
});
