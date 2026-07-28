import { describe, expect, it } from 'vitest';
import type {
  ConsultationFieldType,
  ProviderConsultation,
} from '@/types/integrations';
import {
  buildDataContractReport,
  jsonEquals,
  jsonFingerprint,
  stableJson,
} from './contract';
import {
  parseIntegrationsTabFromSearch,
  tabToIntegrationsAbaParam,
} from '@/lib/integrationsTabQuery';

const fieldTypes: ConsultationFieldType[] = [
  {
    id: 'type-1',
    key: 'DADOS',
    label: 'Dados',
    description: '',
    color: 'blue',
    icon: 'Database',
    reportFieldConfig: {
      version: 1,
      fields: [
        {
          id: 'field-name',
          key: 'nome',
          label: 'Nome',
          sortOrder: 0,
          dataType: 'text',
          conditionalRules: [],
        },
      ],
    },
  },
];

const consultation: ProviderConsultation = {
  id: 'product-1',
  providerId: 'provider-1',
  name: 'Sollos',
  externalId: '1079',
  endpoint: '/consulta',
  method: 'POST',
  cost: 0,
  consultationPrice: 0,
  fieldMappings: [
    {
      jsonPath: 'retorno',
      fieldTypeKey: 'DADOS',
      label: 'Retorno',
    },
  ],
  typeItemFilters: {
    DADOS: {
      version: 2,
      groups: [],
      dedupFieldIds: [],
      fieldMappings: [
        {
          id: 'map-name',
          reportFieldId: 'field-name',
          reportFieldLabel: 'Nome',
          sourceTrechoPath: 'retorno',
          jsonPath: 'nome',
        },
      ],
      computedFields: [],
    },
  },
  updatedAt: '',
  status: 'active',
};

describe('contrato DE–PARA', () => {
  it('preserva integralmente o JSON original na entrada DE', () => {
    const report = buildDataContractReport({
      rawJson: '{"retorno":{"nome":"Maria"}}',
      consultation,
      fieldTypes,
    });

    expect(report.originalEqualsDe).toBe(true);
    expect(report.original).toEqual(report.de);
  });

  it('entrega ao editor exatamente o mesmo JSON do Preview PARA', () => {
    const report = buildDataContractReport({
      rawJson: '{"retorno":{"nome":"Maria"}}',
      consultation,
      fieldTypes,
    });

    expect(report.para).toEqual({ DADOS: { nome: 'Maria' } });
    expect(report.previewEqualsEditor).toBe(true);
    expect(report.editor).toEqual(report.para);
    expect(report.lineage).toEqual([
      expect.objectContaining({
        sourcePath: 'retorno.nome',
        targetKey: 'nome',
        sourceValues: ['Maria'],
        previewValues: ['Maria'],
        status: 'ok',
      }),
    ]);
  });

  it('compara objetos sem depender da ordem das chaves', () => {
    expect(jsonEquals({ b: 2, a: 1 }, { a: 1, b: 2 })).toBe(true);
    expect(stableJson({ b: 2, a: 1 })).toBe('{"a":1,"b":2}');
    expect(jsonFingerprint({ b: 2, a: 1 })).toBe(
      jsonFingerprint({ a: 1, b: 2 }),
    );
  });

  it('sinaliza ausência de saída PARA quando não há mapeamento aplicável', () => {
    const report = buildDataContractReport({
      rawJson: '{"retorno":{"nome":"Maria"}}',
      consultation: { ...consultation, fieldMappings: [] },
      fieldTypes,
    });

    expect(report.para).toEqual({});
    expect(report.diagnostics.find((item) => item.stage === 'para')?.status).toBe(
      'warning',
    );
  });

  it('mantém uma URL direta e reversível para a nova entrada', () => {
    expect(tabToIntegrationsAbaParam('data_contract')).toBe('fabrica-templates');
    expect(
      parseIntegrationsTabFromSearch(
        new URLSearchParams('aba=fabrica-templates'),
      ),
    ).toBe('data_contract');
    expect(
      parseIntegrationsTabFromSearch(
        new URLSearchParams('aba=contrato-dados'),
      ),
    ).toBe('data_contract');
  });

  it('bloqueia BASE I quando a ocorrência é enviada ao SPC', () => {
    const debtFields: ConsultationFieldType[] = [
      {
        id: 'serasa',
        key: 'DIVIDAS_SERASA',
        label: 'Serasa',
        description: '',
        color: 'red',
        icon: 'AlertTriangle',
        reportFieldConfig: {
          version: 1,
          fields: [
            {
              id: 'serasa-creditor',
              key: 'credor',
              label: 'Credor',
              sortOrder: 0,
              dataType: 'text',
              conditionalRules: [],
            },
          ],
        },
      },
      {
        id: 'spc',
        key: 'DIVIDAS_SPC',
        label: 'SPC',
        description: '',
        color: 'red',
        icon: 'AlertTriangle',
        reportFieldConfig: {
          version: 1,
          fields: [
            {
              id: 'spc-creditor',
              key: 'credor',
              label: 'Credor',
              sortOrder: 0,
              dataType: 'text',
              conditionalRules: [],
            },
          ],
        },
      },
    ];
    const wrongConsultation: ProviderConsultation = {
      ...consultation,
      fieldMappings: [
        {
          jsonPath: 'CREDCADASTRAL.PEND_FINANCEIRAS.OCORRENCIAS',
          fieldTypeKey: 'DIVIDAS_SPC',
          label: 'Pendências',
        },
      ],
      typeItemFilters: {
        DIVIDAS_SPC: {
          version: 2,
          groups: [],
          dedupFieldIds: [],
          fieldMappings: [
            {
              id: 'spc-creditor-map',
              reportFieldId: 'spc-creditor',
              reportFieldLabel: 'Credor',
              sourceTrechoPath:
                'CREDCADASTRAL.PEND_FINANCEIRAS.OCORRENCIAS',
              jsonPath: 'CREDOR',
            },
          ],
          computedFields: [],
        },
      },
    };
    const report = buildDataContractReport({
      rawJson: JSON.stringify({
        CREDCADASTRAL: {
          PEND_FINANCEIRAS: {
            PROVEDORES: [{ PROVEDOR: 'BASE I' }],
            OCORRENCIAS: [
              {
                INFORMANTE: 'BASE I',
                CREDOR: 'LOJA TESTE',
                CONTRATO: 'ABC123',
                VALOR: '10,00',
              },
            ],
          },
        },
      }),
      consultation: wrongConsultation,
      fieldTypes: debtFields,
    });

    expect(report.bureauAudit).toEqual([
      expect.objectContaining({
        bureau: 'serasa',
        expectedTypeKey: 'DIVIDAS_SERASA',
        status: 'missing-target',
      }),
    ]);
    expect(
      report.diagnostics.find((item) => item.stage === 'comparison')?.status,
    ).toBe('error');
  });
});
