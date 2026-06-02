import React, { useMemo } from 'react';
import { type ConsultationBlock } from '@/stores/consultationStore';
import TemplateRenderer from './TemplateRenderer';
import type { TemplateDocument, TemplateNode } from '@/types/template-document';
import { buildExpressionContextFromConsultation } from '@/lib/templateSectionUtils';

interface ConsultationPreviewProps {
  blocks: ConsultationBlock[];
  document: string;
  onReorder?: (blocks: ConsultationBlock[]) => void;
  logo?: string | null;
  onLogoChange?: (logo: string | null) => void;
  clientName?: string;
  mode?: 'edit' | 'preview';
  realData?: Record<string, unknown>;
}

// Constrói dinamicamente um TemplateDocument baseado nos blocos selecionados (Fase 5)
function buildDynamicDocument(blocks: ConsultationBlock[], name: string): TemplateDocument {
  const nodes: TemplateNode[] = [
    // Header
    {
      id: 'section-header',
      type: 'section',
      label: 'Cabeçalho',
      kind: 'header',
      children: [
        { id: 'f-company', type: 'field', label: 'Empresa', tag: 'label', binding: { expression: '{$template.company}' } },
        { id: 'f-title', type: 'field', label: 'Título do relatório', tag: 'text', binding: { expression: 'Relatório Analítico de Crédito' }, style: { fontSize: 14 } },
        { id: 'f-date', type: 'field', label: 'Data', tag: 'value', binding: { expression: '{$template.date}' } },
        { id: 'f-protocol', type: 'field', label: 'Protocolo', tag: 'value', binding: { expression: '{$template.protocol}' } },
      ],
    },
    // Dados Pessoais
    {
      id: 'section-client-info',
      type: 'section',
      label: 'Dados Pessoais',
      kind: 'personal-data',
      children: [
        { id: 'f-client-name', type: 'field', label: 'Cliente Analisado', tag: 'value', binding: { expression: '{$cliente.nome}' }, icon: 'User' },
        { id: 'f-client-doc', type: 'field', label: 'Documento', tag: 'value', binding: { expression: '{$cliente.documento}' }, icon: 'Hash' },
        { id: 'f-report-type', type: 'field', label: 'Tipo de Relatório', tag: 'value', binding: { expression: 'Padrão' }, icon: 'Tag' },
      ],
    },
    // Resumo Financeiro
    {
      id: 'section-financial-summary',
      type: 'section',
      label: 'Resumo Financeiro',
      kind: 'financial-summary',
      children: [
        { id: 'f-total-apontado', type: 'field', label: 'Total Apontado', tag: 'value', binding: { expression: 'R$ {$RESUMO_FINANCEIRO.totalApontado}' } },
        { id: 'f-total-deduzido', type: 'field', label: 'Total Deduzido', tag: 'value', binding: { expression: 'R$ {$RESUMO_FINANCEIRO.totalDeduzido}' } },
        { id: 'f-risco-bacen', type: 'field', label: 'Risco Bacen (Vencido)', tag: 'value', binding: { expression: 'R$ {$RESUMO_FINANCEIRO.riscoBacenVencido}' } },
      ],
    },
  ];

  // Adiciona seções com base nos blocos
  blocks.forEach((block) => {
    // Score de Crédito
    if (block.id === '5') {
      nodes.push({
        id: 'section-score',
        type: 'section',
        label: 'Score de Crédito',
        kind: 'score',
        icon: 'Gauge',
        children: [
          { id: 'sc-title', type: 'field', tag: 'text', binding: { expression: 'Como o mercado enxerga seu CPF hoje (e o que está travando seu crédito)' } },
          { id: 'sc-subtitle', type: 'field', tag: 'text', binding: { expression: 'Seu Score é uma estimativa de chance de pagar em dia nos próximos 6 meses. Quanto maior a pontuação, maior tende a ser a facilidade para conseguir crédito e melhores condições.' } },
          { id: 'sc-speedometer', type: 'speedometer', label: 'Velocímetro', binding: { expression: '{$SCORE.valor}' } },
          { id: 'sc-val', type: 'field', label: 'Score', tag: 'value', binding: { expression: '{$SCORE.valor}' }, icon: 'Gauge' },
          { id: 'sc-faixa', type: 'field', label: 'Faixa', tag: 'value', binding: { expression: '{$SCORE.faixa}' }, icon: 'Gauge', style: { color: '#ca8a04' } },
          { id: 'sc-chance', type: 'field', label: 'Chance de pagar (6 meses)', tag: 'value', binding: { expression: '{$SCORE.chancePagar}%' }, icon: 'CheckCircle' },
          { id: 'sc-inadimp', type: 'field', label: 'Probabilidade de inadimplência', tag: 'value', binding: { expression: '{$SCORE.probabilidadeInadimplencia}%' }, icon: 'AlertTriangle' },
          { id: 'sc-legend', type: 'field', tag: 'text', binding: { expression: 'Péssimo 0-200 | Ruim 201-400 | Regular 401-600 | Bom 601-800 | Ótimo 801-1000' } },
          { id: 'sc-interp', type: 'field', tag: 'text', binding: { expression: 'Hoje seu Score está em Regular (401 a 600) — isso geralmente indica que o mercado enxerga risco moderado. O objetivo aqui é identificar o que mais pesa na sua pontuação e montar o caminho mais rápido para destravar aprovações.' } },
          { id: 'sc-inf-title', type: 'field', tag: 'text', binding: { expression: 'O que mais influencia sua pontuação' } },
          { id: 'sc-inf-text', type: 'field', tag: 'text', binding: { expression: 'O Serasa Score é calculado por pilares. Os que mais pesam são hábitos de pagamento e experiência/relacionamento com o mercado — e dívidas negativadas também têm impacto alto, considerando inclusive o tempo desde a quitação.' } },
          { id: 'sc-bullet1', type: 'field', tag: 'text', binding: { expression: 'Pagamentos em dia (cartão, parcelas e contas) têm peso alto na pontuação.' } },
          { id: 'sc-bullet2', type: 'field', tag: 'text', binding: { expression: 'Dívidas negativadas costumam derrubar o Score e demoram a perder impacto sem regularização.' } },
          { id: 'sc-bullet3', type: 'field', tag: 'text', binding: { expression: 'Muitas consultas/simulações de crédito em pouco tempo podem pesar negativamente (busca por crédito).' } },
          { id: 'sc-help-title', type: 'field', tag: 'text', binding: { expression: 'Nós te ajudamos com tudo isso!' } },
          { id: 'sc-help-text', type: 'field', tag: 'text', binding: { expression: 'O que trava crédito quase sempre é simples: pendência/negativação + histórico recente. A boa notícia é que, com estratégia, dá pra acelerar sua reabilitação e voltar a ser aprovado com mais facilidade.' } },
          { id: 'sc-action-title', type: 'field', tag: 'text', binding: { expression: 'Plano de Ação — Seu Próximo Passo' } },
          { id: 'sc-disclaimer', type: 'field', tag: 'text', binding: { expression: 'Score e faixas são indicadores estatísticos e não garantem aprovação de crédito. A decisão final é do credor. O objetivo deste relatório é analisar os motivos de negativa e identificar o que está impactando no seu crédito.' } },
        ],
      });
    }

    // SPC (id 1) ou Serasa (id 2)
    if (block.id === '1' || block.id === '2') {
      const source = block.id === '1' ? 'DIVIDAS_SPC.registros' : 'DIVIDAS_SERASA.registros';
      nodes.push({
        id: `section-debts-${block.id}`,
        type: 'section',
        label: `${block.name} - Negativações`,
        kind: 'debt-table',
        icon: 'AlertTriangle',
        children: [
          {
            id: `table-debts-${block.id}`,
            type: 'table',
            source: source,
            children: [
              { id: `col-origem-${block.id}`, type: 'column', label: 'Credor / Origem', binding: { expression: '{$divida.credor}' } },
              { id: `col-contrato-${block.id}`, type: 'column', label: 'Contrato', binding: { expression: '{$divida.contrato}' } },
              { id: `col-valor-${block.id}`, type: 'column', label: 'Valor (R$)', binding: { expression: 'R$ {$divida.valor}' } },
            ],
          },
        ],
      });
    }

    // Registrato Bacen (id 10)
    if (block.id === '10') {
      nodes.push({
        id: 'section-bacen',
        type: 'section',
        label: 'Banco Central (SCR)',
        kind: 'debt-table',
        icon: 'Building2',
        children: [
          {
            id: 'table-bacen',
            type: 'table',
            source: 'BACEN.consolidado',
            children: [
              { id: 'col-bacen-cat', type: 'column', label: 'Categoria Consolidada', binding: { expression: '{$divida.credor}' } },
              { id: 'col-bacen-val', type: 'column', label: 'Valor', binding: { expression: 'R$ {$divida.valor}' } },
            ],
          },
        ],
      });
    }

    // Protestos (id 4)
    if (block.id === '4') {
      nodes.push({
        id: 'section-protests',
        type: 'section',
        label: 'Protestos',
        kind: 'custom',
        icon: 'FileWarning',
        children: [
          { id: 'f-protests-empty', type: 'field', label: 'Aviso', tag: 'value', binding: { expression: 'Nenhum protesto em cartório localizado.' } },
        ],
      });
    }

    // Outros blocos genéricos
    if (['1', '2', '4', '5', '10'].indexOf(block.id) === -1) {
      nodes.push({
        id: `section-generic-${block.id}`,
        type: 'section',
        label: block.name,
        kind: 'custom',
        icon: 'FileText',
        children: [
          { id: `f-generic-info-${block.id}`, type: 'field', label: 'Status da análise', tag: 'value', binding: { expression: 'Dados serão exibidos após emissão completa' } },
        ],
      });
    }
  });

  return {
    schemaVersion: 2,
    name,
    nodes,
  };
}

export default function ConsultationPreview({
  blocks,
  document: docInput,
  logo,
  onLogoChange,
  clientName = 'JULIANO CAMPOS PEREIRA',
  realData,
}: ConsultationPreviewProps) {
  // Constrói o contexto da expressão a partir de dados reais ou mocks
  const expressionContext = useMemo(() => {
    const providerProduct = {
      id: 'preview',
      name: 'Consulta de Crédito',
      sampleResponse: realData ? JSON.stringify(realData) : null,
      cost: 0,
      consultationPrice: 0,
      fieldMappings: [],
    } as any;

    const ctx = buildExpressionContextFromConsultation(providerProduct);
    // injeta dados de CPF e Nome
    ctx.$json.cliente = {
      nome: clientName,
      documento: docInput,
    };
    return ctx;
  }, [clientName, docInput, realData]);

  // Constrói o layout dinamicamente
  const templateDoc = useMemo(() => {
    return buildDynamicDocument(blocks, 'Consulta Preview');
  }, [blocks]);

  return (
    <div className="bg-card rounded-xl shadow-xs overflow-hidden">
      <TemplateRenderer
        document={templateDoc}
        mode="preview"
        context={expressionContext}
        logo={logo}
        onLogoChange={onLogoChange}
      />
    </div>
  );
}
