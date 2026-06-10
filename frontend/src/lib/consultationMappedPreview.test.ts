import { describe, expect, it } from 'vitest';
import { buildComputedPreviewRows, buildTypeLinkedConsultationMappedPreview } from '@/lib/consultationMappedPreview';
import type { ConsultationFieldType, TypeItemFilterConfig } from '@/types/integrations';

describe('buildComputedPreviewRows desativado', () => {
  const mockFieldType: ConsultationFieldType = {
    id: 'ft_1',
    key: 'DIVIDAS',
    label: 'Dívidas',
    description: 'Dívidas',
    color: 'primary',
    icon: 'Tag',
    reportFieldConfig: {
      version: 1,
      fields: [
        {
          id: 'field_valor',
          key: 'valor',
          label: 'Valor',
          dataType: 'currency',
          sortOrder: 1,
          conditionalRules: [],
        },
      ],
    },
  };

  const mockFilterCfg: TypeItemFilterConfig = {
    version: 2,
    groups: [],
    fieldMappings: [
      {
        id: 'map_valor',
        reportFieldId: 'field_valor',
        reportFieldLabel: 'Valor',
        jsonPath: 'valor_divida',
      },
    ],
    dedupFieldIds: [],
    computedFields: [
      {
        id: 'comp_total_apontado',
        label: 'Total Apontado',
        key: 'totalapontado',
        dataType: 'currency',
        operator: 'sum',
        sourceReportFieldId: 'field_valor',
      },
    ],
  };

  const parsedParts = [
    { valor_divida: 105.31 },
  ];
  const partPaths = ['list[0]'];

  it('deve sempre retornar array vazio para campos calculados', () => {
    const result = buildComputedPreviewRows({
      fieldType: mockFieldType,
      filterCfg: mockFilterCfg,
      parsedParts,
      partPaths,
    });

    expect(result).toEqual([]);
  });
});

describe('buildTypeLinkedConsultationMappedPreview sem campos calculados', () => {
  const mockFieldType: ConsultationFieldType = {
    id: 'ft_1',
    key: 'DIVIDAS',
    label: 'Dívidas',
    description: 'Dívidas',
    color: 'primary',
    icon: 'Tag',
    reportFieldConfig: {
      version: 1,
      fields: [
        {
          id: 'field_valor',
          key: 'valor',
          label: 'Valor',
          dataType: 'currency',
          sortOrder: 1,
          conditionalRules: [],
        },
        {
          id: 'field_desc',
          key: 'descricao',
          label: 'Descrição',
          dataType: 'text',
          sortOrder: 2,
          conditionalRules: [],
        },
      ],
    },
  };

  it('deve estruturar o de-para sem totais calculados e retornar apenas array de linhas', () => {
    const sampleResponse = JSON.stringify({
      ocorrencias: [
        { valor_divida: '100,00', desc: 'A' },
        { valor_divida: '100,00', desc: 'B' },
        { valor_divida: '50,00', desc: 'C' },
      ],
    });

    const trechoMappings = [
      {
        jsonPath: 'ocorrencias',
        fieldTypeKey: 'DIVIDAS',
        label: 'Dívidas',
      },
    ];

    const typeItemFilterConfig: TypeItemFilterConfig = {
      version: 2,
      groups: [],
      fieldMappings: [
        {
          id: 'map_valor',
          reportFieldId: 'field_valor',
          reportFieldLabel: 'Valor',
          jsonPath: 'valor_divida',
          sourceTrechoPath: 'ocorrencias',
        },
        {
          id: 'map_desc',
          reportFieldId: 'field_desc',
          reportFieldLabel: 'Descrição',
          jsonPath: 'desc',
          sourceTrechoPath: 'ocorrencias',
        },
      ],
      dedupFieldIds: [],
      computedFields: [
        {
          id: 'comp_total_apontado',
          label: 'Total Apontado',
          key: 'totalapontado',
          dataType: 'currency',
          operator: 'sum',
          sourceReportFieldId: 'field_valor',
        },
      ],
    };

    const resultStr = buildTypeLinkedConsultationMappedPreview({
      sampleResponse,
      trechoMappings,
      fieldType: mockFieldType,
      typeItemFilterConfig,
    });

    const result = JSON.parse(resultStr);

    // Não deve haver o invólucro de totaisCalculados / linhas
    expect(result.totaisCalculados).toBeUndefined();
    expect(result.linhas).toBeUndefined();

    // Deve retornar o array de objetos planos mapeados diretamente
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(3);
    
    // Validar estrutura e conteúdo do de-para de forma robusta
    expect(result[0].ocorrencias).toBeDefined();
    expect(result[0].ocorrencias.desc).toBe('A');
    expect(result[0].ocorrencias.valor_divida).toContain('100,00');
  });
});
