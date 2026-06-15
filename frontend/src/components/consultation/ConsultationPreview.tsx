import React, { useMemo } from 'react';
import { type ConsultationBlock } from '@/stores/consultationStore';
import TemplateRenderer from './TemplateRenderer';
import type { TemplateDocument, TemplateNode } from '@/types/template-document';
import { buildExpressionContextFromConsultation } from '@/lib/templateSectionUtils';
import { useTheme } from '@/hooks/use-theme';
import { ZoomIn, ZoomOut } from 'lucide-react';

const LUCIDE_STYLE = `
  <style>
    .cpro-scope i[data-lucide] svg, 
    .cpro-scope svg.lucide { 
      width: 100% !important; 
      height: 100% !important; 
      display: inline-block; 
    }
  </style>
`;


interface ConsultationPreviewProps {
  blocks: ConsultationBlock[];
  document: string;
  onReorder?: (blocks: ConsultationBlock[]) => void;
  logo?: string | null;
  onLogoChange?: (logo: string | null) => void;
  clientName?: string;
  mode?: 'edit' | 'preview';
  realData?: Record<string, unknown>;
  layout?: TemplateDocument;
  rawItems?: any[];
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
  layout,
  rawItems,
}: ConsultationPreviewProps) {
  const [htmlOutput, setHtmlOutput] = React.useState<string | null>(null);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const [zoom, setZoom] = React.useState<number>(1.0);

  const handleZoomIn = () => setZoom(prev => Math.min(2.0, Number((prev + 0.1).toFixed(2))));
  const handleZoomOut = () => setZoom(prev => Math.max(0.5, Number((prev - 0.1).toFixed(2))));
  const handleResetZoom = () => setZoom(1.0);





  // Constrói o contexto da expressão a partir de dados reais ou mocks
  const expressionContext = useMemo(() => {
    const providerProduct = {
      id: 'preview',
      name: 'Consulta de Crédito',
      sampleResponse: realData ? JSON.stringify(realData) : null,
      cost: 0,
      consultationPrice: 0,
      fieldMappings: [],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    const ctx = buildExpressionContextFromConsultation(providerProduct);
    // injeta dados de CPF e Nome
    ctx.$json.cliente = {
      nome: clientName,
      documento: docInput,
    };
    return ctx;
  }, [clientName, docInput, realData]);

  // Constrói o layout dinamicamente ou usa o layout fornecido
  const templateDoc = useMemo(() => {
    if (layout) return layout;
    return buildDynamicDocument(blocks, 'Consulta Preview');
  }, [blocks, layout]);

  // Se for um layout moderno da templates drawer (tem frames), também usamos o renderizador HTML moderno
  const isModernLayout = useMemo(() => {
    return !!(layout && (layout as any).frames && (layout as any).frames.length > 0);
  }, [layout]);

  // Se tiver rawItems, usamos o motor novo (HTML)
  const isNewEngine = !!(rawItems && rawItems.length > 0);

  React.useEffect(() => {
    if (!isNewEngine && !isModernLayout) return;

    // Importamos dinamicamente para evitar ciclo ou usar diretamente
    import('@/features/templates-drawer/engine/renderTemplateToHtml').then(({ renderTemplateToHtml }) => {
      const mergedData = {
        ...(realData || {}),
        cliente: {
          nome: clientName || (realData as any)?.cliente?.nome || 'JULIANO CAMPOS PEREIRA',
          documento: docInput || (realData as any)?.cliente?.documento || '000.000.000-00',
        },
        clientName: clientName || (realData as any)?.clientName || (realData as any)?.cliente?.nome || 'JULIANO CAMPOS PEREIRA',
        clientCpf: docInput || (realData as any)?.clientCpf || (realData as any)?.cliente?.documento || '000.000.000-00',
        consultationDate: new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        protocol: docInput ? `PROT-${docInput.replace(/\D/g, '').slice(-6)}` : 'PROT-000000',
      };

      if (isModernLayout && layout) {
        const modernTemplate = layout as any;
        let html = LUCIDE_STYLE + `<div class="modern-report-container" style="display: flex; flex-direction: column; align-items: center; gap: 24px; padding: 12px 24px; max-width: 100%; overflow-x: auto;">`;
        
        modernTemplate.frames.forEach((f: any) => {
          try {
            const result = renderTemplateToHtml(modernTemplate, f.id, mergedData);
            const orient = f.preset?.endsWith("-l") ? "landscape" : "portrait";
            html += `
              <section class="page border border-slate-200 dark:border-slate-800" data-orient="${orient}" style="background: ${f.background || '#fff'}; box-shadow: 0 4px 12px rgba(15,23,42,0.06); position: relative; overflow: hidden; width: ${f.width}px; height: ${f.height}px; transform-origin: top center; margin: 0 auto; box-sizing: border-box; border-radius: 8px;">
                ${result.html}
              </section>
            `;
          } catch (err: any) {
            html += `<div class="p-4 border border-red-500 text-red-500 rounded-lg text-sm bg-white">Erro ao renderizar frame ${f.name || ''}: ${err.message}</div>`;
          }
        });

        html += `</div>`;
        setHtmlOutput(html);

        // Dispara a criação dos ícones do Lucide de forma segura após o render
        setTimeout(() => {
          if (typeof (window as any).lucide !== 'undefined') {
            (window as any).lucide.createIcons();
          }
        }, 150);
      } else if (isNewEngine && rawItems) {
        let html = LUCIDE_STYLE + `<div class="cpro-report-container" style="display: flex; flex-direction: column; gap: 1rem;">`;
        
        rawItems.forEach((item) => {
          const productLayout = item.providerProduct?.templateLayout;
          if (productLayout && productLayout.frames && productLayout.frames.length > 0) {
            try {
              const result = renderTemplateToHtml(productLayout, productLayout.frames[0].id, mergedData);
              html += `<div class="cpro-report-block" data-product-id="${item.providerProduct?.id}">\n${result.html}\n</div>`;
            } catch (err: any) {
              html += `<div class="p-4 border border-red-500 text-red-500 rounded-lg text-sm">Erro ao renderizar bloco ${item.providerProduct?.name || ''}: ${err.message}</div>`;
            }
          } else {
             html += `<div class="p-4 border border-border/50 bg-muted/10 rounded-lg text-muted-foreground text-sm text-center">Bloco ${item.providerProduct?.name || item.alias || 'Desconhecido'} sem layout configurado no Tipo.</div>`;
          }
        });

        html += `</div>`;
        setHtmlOutput(html);

        // Dispara a criação dos ícones do Lucide de forma segura após o render
        setTimeout(() => {
          if (typeof (window as any).lucide !== 'undefined') {
            (window as any).lucide.createIcons();
          }
        }, 150);
      }
    });
  }, [isNewEngine, isModernLayout, rawItems, layout, realData, clientName, docInput]);

  if (isNewEngine || isModernLayout) {
    if (htmlOutput === null) {
      return <div className="p-8 text-center text-muted-foreground animate-pulse">Renderizando visualização prévia...</div>;
    }

    const bgIframe = isDark ? '#0f172a' : '#f1f5f9';
    const colorIframe = isDark ? '#f8fafc' : '#0f172a';
    const pageShadow = isDark 
      ? '0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.4)' 
      : '0 10px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.08)';

    const iframeSrcDoc = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8"/>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Geist:wght@100..900&family=Geist+Mono:wght@100..900&family=Inter:wght@100..900&family=JetBrains+Mono:wght@100..900&display=swap" rel="stylesheet">
          <script src="https://cdn.jsdelivr.net/npm/lucide@0.462.0/dist/umd/lucide.min.js"></script>
          <style>
            * { box-sizing: border-box; }
            body { 
              margin: 0; 
              padding: 20px; 
              background: ${bgIframe}; 
              font-family: 'Geist', 'Inter', sans-serif; 
              color: ${colorIframe}; 
              display: flex;
              justify-content: center;
              min-height: 100vh;
              transition: background-color 0.3s, color 0.3s;
            }
            .stage-container {
              width: 100%;
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 20px;
            }
            i[data-lucide] svg, svg.lucide { 
              width: 100% !important; 
              height: 100% !important; 
              display: inline-block; 
            }
            /* Zoom dinâmico para se ajustarem à tela da prévia */
            .modern-report-container {
              zoom: ${zoom};
              transform-origin: top center;
            }
            .cpro-report-container {
              zoom: ${zoom};
              transform-origin: top center;
            }
            .modern-report-container section.page {
              box-shadow: ${pageShadow} !important;
              border-radius: 8px !important;
            }
          </style>
        </head>
        <body>
          <div class="stage-container">
            ${htmlOutput}
          </div>
          <script>
            if (typeof lucide !== "undefined") { 
              lucide.createIcons(); 
            }
          </script>
        </body>
      </html>
    `;

    return (
      <div className={`overflow-hidden w-full relative flex-1 h-full min-h-[400px] transition-colors duration-300 ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}>
        <iframe
          title="Prévia do Relatório"
          srcDoc={iframeSrcDoc}
          className={`w-full h-full border-0 transition-colors duration-300 ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}
        />
        
        {/* Controle de Zoom Flutuante Premium em Glassmorphism */}
        <div className="absolute bottom-5 right-5 z-10 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border shadow-lg backdrop-blur-md transition-all duration-300 bg-background/80 border-border/40 text-foreground hover:border-border/80">
          <button 
            onClick={handleZoomOut}
            className="p-1 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Diminuir Zoom"
            disabled={zoom <= 0.5}
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          
          <button 
            onClick={handleResetZoom}
            className="text-[10px] font-semibold px-2 min-w-[50px] text-center hover:text-primary transition-colors select-none"
            title="Redefinir Zoom para 100%"
          >
            {Math.round(zoom * 100)}%
          </button>
          
          <button 
            onClick={handleZoomIn}
            className="p-1 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Aumentar Zoom"
            disabled={zoom >= 2.0}
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl shadow-xs overflow-hidden">
      <TemplateRenderer
        document={templateDoc}
        mode="preview"
        capabilities={{
          showPreview: false,
          showSkeleton: true,
          showXml: false,
          showVariables: false,
          showConsole: false,
          canEditAdvanced: false,
        }}
        context={expressionContext}
        logo={logo}
        onLogoChange={onLogoChange}
      />
    </div>
  );
}
