import { describe, expect, it } from 'vitest';
import { buildComputedPreviewRows, buildTypeLinkedConsultationMappedPreview } from '@/lib/consultationMappedPreview';
import type { ConsultationFieldType, TypeItemFilterConfig } from '@/types/integrations';

describe('buildComputedPreviewRows', () => {
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
      {
        id: 'comp_total_deduzido',
        label: 'Total Deduzido',
        key: 'totaldeduzido',
        dataType: 'currency',
        operator: 'sum',
        sourceReportFieldId: 'field_valor',
      },
    ],
  };

  // parsedParts representa o retorno JSON processado para cada trecho mapeado.
  // Neste teste:
  // - parsedParts (deduplicado): contém apenas ocorrências únicas de valor.
  // - parsedPartsUndeduplicated (com duplicidades): mantém todas as ocorrências originais.
  const parsedParts = [
    {
      valor_divida: 105.31,
    },
    {
      valor_divida: 398.81,
    },
    {
      valor_divida: 69.00,
    },
  ];

  const parsedPartsUndeduplicated = [
    {
      valor_divida: 105.31,
    },
    {
      valor_divida: 398.81,
    },
    {
      valor_divida: 69.00,
    },
    {
      valor_divida: 69.00,
    },
  ];

  const partPaths = ['list[0]', 'list[1]', 'list[2]', 'list[3]'];

  it('deve calcular soma com duplicidades se o campo calculado não estiver em dedupFieldIds', () => {
    // Configura dedupFieldIds sem comp_total_apontado (portanto calcula com duplicidade)
    const filterCfg = {
      ...mockFilterCfg,
      dedupFieldIds: [],
    };

    const result = buildComputedPreviewRows({
      fieldType: mockFieldType,
      filterCfg,
      parsedParts,
      parsedPartsUndeduplicated,
      partPaths,
    });

    const totalApontado = result.find((r) => r.reportFieldId === 'comp_total_apontado');
    expect(totalApontado).toBeDefined();
    // 105.31 + 398.81 + 69.00 + 69.00 = 642.12
    expect(totalApontado?.value as string).toContain('642,12');
    expect(totalApontado?.value as string).toContain('R$');
  });

  it('deve calcular soma sem duplicidades se o campo calculado estiver em dedupFieldIds', () => {
    // Configura dedupFieldIds com comp_total_deduzido (portanto calcula sem duplicidade)
    const filterCfg = {
      ...mockFilterCfg,
      dedupFieldIds: ['comp_total_deduzido'],
    };

    const result = buildComputedPreviewRows({
      fieldType: mockFieldType,
      filterCfg,
      parsedParts,
      parsedPartsUndeduplicated,
      partPaths,
    });

    const totalDeduzido = result.find((r) => r.reportFieldId === 'comp_total_deduzido');
    expect(totalDeduzido).toBeDefined();
    // 105.31 + 398.81 + 69.00 = 573.12
    expect(totalDeduzido?.value as string).toContain('573,12');
    expect(totalDeduzido?.value as string).toContain('R$');
  });

  it('deve funcionar com ambos os totais sendo computados com regras diferentes em paralelo', () => {
    const filterCfg = {
      ...mockFilterCfg,
      dedupFieldIds: ['comp_total_deduzido'], // Apenas o deduzido sem duplicidades
    };

    const result = buildComputedPreviewRows({
      fieldType: mockFieldType,
      filterCfg,
      parsedParts,
      parsedPartsUndeduplicated,
      partPaths,
    });

    const totalApontado = result.find((r) => r.reportFieldId === 'comp_total_apontado');
    const totalDeduzido = result.find((r) => r.reportFieldId === 'comp_total_deduzido');

    expect(totalApontado?.value as string).toContain('642,12'); // Com duplicidade
    expect(totalApontado?.value as string).toContain('R$');
    expect(totalDeduzido?.value as string).toContain('573,12'); // Sem duplicidade
    expect(totalDeduzido?.value as string).toContain('R$');
  });
});

describe('buildTypeLinkedConsultationMappedPreview', () => {
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

  it('deve deduplicar e calcular valores diferentes para campos de soma com e sem deduplicação', () => {
    const sampleResponse = JSON.stringify({
      ocorrencias: [
        { valor_divida: '100,00', desc: 'A' },
        { valor_divida: '100,00', desc: 'B' }, // duplicado
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
      dedupFieldIds: ['field_valor', 'comp_total_deduzido'], // Apenas o total deduzido deve deduplicar
      computedFields: [
        {
          id: 'comp_total_apontado',
          label: 'Total Apontado',
          key: 'totalapontado',
          dataType: 'currency',
          operator: 'sum',
          sourceReportFieldId: 'field_valor',
        },
        {
          id: 'comp_total_deduzido',
          label: 'Total Deduzido',
          key: 'totaldeduzido',
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

    // totalapontado (sem deduplicação) deve somar todos: 100 + 100 + 50 = 250
    // totaldeduzido (com deduplicação) deve remover duplicado: 100 + 50 = 150
    expect(result.totaisCalculados.totalapontado).toContain('250,00');
    expect(result.totaisCalculados.totaldeduzido).toContain('150,00');
  });
});

describe('buildComputedPreviewRows com recursão de campos calculados', () => {
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
          dataType: 'numeric',
          sortOrder: 1,
          conditionalRules: [],
        },
      ],
    },
  };

  it('deve calcular campo calculado que tem como fonte outro campo calculado', () => {
    const filterCfg: TypeItemFilterConfig = {
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
          dataType: 'numeric',
          operator: 'sum',
          sourceReportFieldId: 'field_valor',
        },
        {
          id: 'comp_global_dobro',
          label: 'Global Dobro',
          key: 'globaldobro',
          dataType: 'numeric',
          operator: 'sum',
          sourceReportFieldId: 'comp_total_apontado',
        },
      ],
    };

    const parsedParts = [
      { valor_divida: 10 },
      { valor_divida: 20 },
    ];
    const partPaths = ['list[0]', 'list[1]'];

    const result = buildComputedPreviewRows({
      fieldType: mockFieldType,
      filterCfg,
      parsedParts,
      parsedPartsUndeduplicated: parsedParts,
      partPaths,
    });

    const totalApontado = result.find((r) => r.reportFieldId === 'comp_total_apontado');
    const globalDobro = result.find((r) => r.reportFieldId === 'comp_global_dobro');

    expect(totalApontado).toBeDefined();
    expect(globalDobro).toBeDefined();

    expect(totalApontado?.value).toBe('30');
    expect(globalDobro?.value).toBe('30');
  });
});
