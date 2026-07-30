import assert from 'node:assert/strict';
import test from 'node:test';
import { renderTemplateToHtml } from '../../lib/template-engine/renderTemplateToHtml';
import {
  buildSollosReportTemplate,
  mergeReportFieldConfigs,
  validateSollosReportTemplate,
} from './sollos-template-builder.service';
import { SOLLOS_TEMPLATE_PRODUCTS } from './sollos-template-products';

const fieldTypes = [
  {
    id: 'dados',
    key: 'DADOS_PESSOAIS',
    label: 'Dados Pessoais',
    description: 'Identificação',
    color: '#14b8a6',
    icon: 'user',
    reportFieldConfig: {
      version: 1 as const,
      fields: [
        {
          id: 'nome',
          key: 'nome',
          label: 'Nome',
          sortOrder: 0,
          dataType: 'text' as const,
          conditionalRules: [],
        },
        {
          id: 'documento',
          key: 'documento',
          label: 'Documento',
          sortOrder: 1,
          dataType: 'document' as const,
          conditionalRules: [],
        },
      ],
    },
  },
  {
    id: 'quod',
    key: 'DIVIDAS_QUOD',
    label: 'Dívidas Quod',
    description: 'Base IV',
    color: '#7c3aed',
    icon: 'landmark',
    reportFieldConfig: {
      version: 1 as const,
      fields: [
        {
          id: 'credor',
          key: 'credor',
          label: 'Credor',
          sortOrder: 0,
          dataType: 'text' as const,
          conditionalRules: [],
        },
        {
          id: 'contrato',
          key: 'contrato',
          label: 'Contrato',
          sortOrder: 1,
          dataType: 'text' as const,
          conditionalRules: [],
        },
        {
          id: 'valor',
          key: 'valor',
          label: 'Valor',
          sortOrder: 2,
          dataType: 'currency' as const,
          conditionalRules: [],
        },
      ],
    },
  },
  {
    id: 'controle',
    key: 'NOVO_HEADER_CONTROLE',
    label: 'Controle da consulta',
    description: 'Metadados técnicos',
    color: '#64748b',
    icon: 'settings',
    reportFieldConfig: {
      version: 1 as const,
      fields: [
        {
          id: 'servico',
          key: 'servico',
          label: 'Serviço',
          sortOrder: 0,
          dataType: 'text' as const,
          conditionalRules: [],
        },
      ],
    },
  },
];

const mappedData = {
  protocol: 'REQ-12345678',
  template: {
    protocol: 'REQ-12345678',
    date: '30/07/2026',
    company: 'Consultas PRO',
  },
  cliente: {
    nome: 'CLIENTE HOMOLOGAÇÃO',
    documento: '30298981807',
  },
  DADOS_PESSOAIS: {
    nome: 'CLIENTE HOMOLOGAÇÃO',
    documento: '30298981807',
  },
  DIVIDAS_QUOD: [
    {
      credor: 'COOPERATIVA EXEMPLO',
      contrato: '580408',
      valor: '664,48',
    },
  ],
  NOVO_HEADER_CONTROLE: {
    servico: 'CONSULTA CONCLUÍDA',
  },
};

test('mantém exatamente os 30 produtos Sollos alvo', () => {
  assert.equal(SOLLOS_TEMPLATE_PRODUCTS.length, 30);
  assert.equal(new Set(SOLLOS_TEMPLATE_PRODUCTS.map((item) => item.productId)).size, 30);
  assert.equal(
    SOLLOS_TEMPLATE_PRODUCTS.find((item) => item.productId === '1079')?.preserveExistingTemplate,
    true,
  );
});

test('gera relatório completo, temático e sem perder campos', () => {
  const layout = buildSollosReportTemplate({
    productId: '2451',
    productName: 'QUOD COMPLETO PJ + SCORE',
    personType: 'PJ',
    fieldTypes,
    mappedData,
    samplingEvidence: {
      validSamples: 30,
      totalSamples: 30,
      coveredLeafPathCount: 471,
      totalLeafPathCount: 471,
      draftUpdatedAt: '2026-07-30T04:47:43.229Z',
    },
  });

  const audit = validateSollosReportTemplate(layout, fieldTypes);
  assert.equal(audit.valid, true, audit.errors.join('\n'));
  assert.equal(audit.typeCount, 3);
  assert.equal(audit.fieldCount, 6);
  assert.ok(layout.frames.length >= 3);
  assert.equal(layout.elements.length, 0);
  assert.equal(
    (layout.metadata?.sollosTemplate as { publicationStatus: string }).publicationStatus,
    'READY_FOR_MANUAL_REVIEW',
  );

  const html = layout.frames
    .map((frame) => renderTemplateToHtml(layout, frame.id, mappedData).html)
    .join('\n');

  assert.match(html, /QUOD COMPLETO PJ \+ SCORE/);
  assert.match(html, /CLIENTE HOMOLOGAÇÃO/);
  assert.match(html, /COOPERATIVA EXEMPLO/);
  assert.match(html, /R\$\s*664,48/);
  assert.match(html, /CONSULTA CONCLUÍDA/);
  assert.doesNotMatch(html, /\{\{[^}]+\}\}/);
  assert.doesNotMatch(JSON.stringify(layout), /data:image\//);

  const unsafeHtml = layout.frames
    .map(
      (frame) =>
        renderTemplateToHtml(layout, frame.id, {
          ...mappedData,
          DADOS_PESSOAIS: {
            ...mappedData.DADOS_PESSOAIS,
            nome: '<img src=x onerror=alert(1)>',
          },
        }).html,
    )
    .join('\n');
  assert.match(unsafeHtml, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.doesNotMatch(unsafeHtml, /<img src=x onerror=alert\(1\)>/);
});

test('mescla campos canônicos reaproveitados sem apagar o contrato anterior', () => {
  const merged = mergeReportFieldConfigs(
    {
      version: 1,
      fields: [
        {
          id: 'nome',
          key: 'nome',
          label: 'Nome',
          sortOrder: 0,
          dataType: 'text',
          conditionalRules: [],
        },
      ],
    },
    {
      version: 1,
      fields: [
        {
          id: 'nome',
          key: 'nome',
          label: 'Nome completo',
          sortOrder: 0,
          dataType: 'text',
          conditionalRules: [],
        },
        {
          id: 'documento',
          key: 'documento',
          label: 'Documento',
          sortOrder: 1,
          dataType: 'document',
          conditionalRules: [],
        },
      ],
    },
  );

  assert.deepEqual(
    merged.fields.map((field) => field.id),
    ['nome', 'documento'],
  );
  assert.equal(merged.fields[0]?.label, 'Nome');
});
