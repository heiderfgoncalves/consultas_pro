import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { 
  RefreshCcw, Save, Sliders, Layers3, Play, 
  Terminal, CheckCircle2, AlertTriangle, Eye, HelpCircle, FileText, SearchCode, Database
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

// Importando utilitários do editor v2 e motor de renderização
import { renderTemplateToHtml } from '@/features/templates-drawer/engine/renderTemplateToHtml';
import { resolveExpression } from '@/features/templates-drawer/engine/resolveExpression';
import { useEditorStore } from '@/features/templates-drawer/store/editor.store';
import { createSampleTemplate } from '@/features/templates-drawer/templates/sample-report';

import type {
  MvpDocumentType,
  MvpTemplateKey,
  ProviderConsultation,
  TemplateMvpConfig,
  TemplateMvpPoolItem,
} from '@/types/integrations';
import {
  getTemplateMvpConfigApi,
  getTemplateMvpPoolApi,
  importTemplateMvpPoolApi,
  previewTemplateMvpApi,
  putTemplateMvpConfigApi,
  getTemplatesApi,
} from '@/api/admin-integrations';

const TEMPLATE_LABELS: Record<MvpTemplateKey, string> = {
  DIVIDAS_SIMPLES: 'Consulta de dívidas simples',
  BACEN_SIMPLES: 'Consulta Bacen Simples',
  PREMIUM: 'Consulta Premium (Dívidas + Bacen)',
};

function ApurationPopover({
  previewData,
  compiledTemplateResult,
  testExpression,
  setTestExpression,
  evaluatedExpressionResult,
  children,
}: {
  previewData: any;
  compiledTemplateResult: any;
  testExpression: string;
  setTestExpression: (v: string) => void;
  evaluatedExpressionResult: string;
  children: React.ReactNode;
}) {
  const [activeTab, setActiveTab] = useState<'console' | 'logs' | 'pool'>('console');

  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="end"
        className="w-[380px] sm:w-[460px] p-0 bg-popover text-popover-foreground border border-border shadow-2xl rounded-xl overflow-hidden z-50 flex flex-col h-[400px]"
      >
        {/* Header com título */}
        <div className="p-1 bg-slate-100/50 dark:bg-slate-900/40 border-b border-border text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3 py-2 flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-bold">
            <Terminal className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
            Central de Apuração & Homologação
          </span>
          <Badge variant="outline" className="text-[9px] font-mono border-dashed bg-card/50">
            {previewData ? 'CONECTADO' : 'SEM DADOS'}
          </Badge>
        </div>

        {/* Abas Estilo Ribbon/Header */}
        <div className="flex border-b border-border text-[11px] bg-slate-100/40 dark:bg-slate-900/30">
          {(
            [
              { id: 'console', label: 'Console Path' },
              { id: 'logs', label: `Bindings (${compiledTemplateResult?.logs?.length || 0})` },
              { id: 'pool', label: 'Visualizar Pool' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={cn(
                "flex-1 h-9 text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 cursor-pointer transition-all duration-150 border-b-2 border-transparent",
                activeTab === t.id &&
                  "bg-white dark:bg-slate-950 border-l border-r border-t -mb-px text-slate-900 dark:text-slate-100 font-bold rounded-t-lg shadow-sm border-b-transparent",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Conteúdo das Abas */}
        <div className="flex-1 overflow-auto p-4 flex flex-col min-h-0 bg-background/50 backdrop-blur-sm [scrollbar-width:thin]">
          {activeTab === 'console' && (
            <div className="flex-1 flex flex-col min-h-0 space-y-3">
              <p className="text-[11px] text-muted-foreground leading-snug">
                Teste e valide expressões JSON Path em tempo real contra os dados reais da consulta simulada.
              </p>

              {/* Input do Console */}
              <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-2 rounded-lg border border-slate-800 shadow-inner group focus-within:border-indigo-500/50 transition-colors shrink-0">
                <span className="text-slate-500 font-mono text-xs select-none">{`>`}</span>
                <input
                  type="text"
                  value={testExpression}
                  onChange={(e) => setTestExpression(e.target.value)}
                  placeholder="Ex: cliente.nome, dividas[0].valor"
                  className="flex-1 bg-transparent border-0 outline-none text-slate-100 font-mono text-xs focus:ring-0 p-0"
                />
                <SearchCode className="w-4 h-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
              </div>

              {/* Pre de Saída de Dados */}
              <div className="flex-1 bg-slate-950 rounded-lg p-2.5 overflow-auto font-mono text-[10px] text-slate-300 border border-slate-800/85 shadow-inner">
                <pre className="whitespace-pre-wrap leading-relaxed break-all">
                  {evaluatedExpressionResult}
                </pre>
              </div>
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="flex-1 overflow-y-auto space-y-1.5 min-h-0">
              {!previewData ? (
                <div className="text-center py-12 text-[11px] text-muted-foreground border border-dashed border-border rounded-lg bg-muted/10">
                  Nenhuma variável compilada no momento.
                </div>
              ) : compiledTemplateResult?.logs?.length === 0 ? (
                <div className="text-center py-12 text-[11px] text-muted-foreground border border-dashed border-border rounded-lg bg-muted/10">
                  Nenhum binding de variável {"{{...}}"} encontrado nesta página do template.
                </div>
              ) : (
                compiledTemplateResult?.logs.map((log: any, idx: number) => {
                  const isMissing = log.reason === 'missing';
                  return (
                    <div 
                      key={idx} 
                      className={`flex flex-col gap-1 rounded-lg border p-2 text-[11px] transition-colors ${
                        isMissing 
                          ? 'border-amber-500/20 bg-amber-500/5' 
                          : 'border-border bg-muted/30 hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <code className="font-mono text-[10px] font-bold text-foreground truncate max-w-[200px]" title={log.expression}>
                          {`{{${log.expression}}}`}
                        </code>
                        <Badge 
                          variant="outline" 
                          className={`h-4 text-[9px] font-semibold flex items-center gap-1 border-0 ${
                            isMissing 
                              ? 'text-amber-500 bg-amber-500/10' 
                              : 'text-emerald-500 bg-emerald-500/10'
                          }`}
                        >
                          {isMissing ? (
                            <>
                              <AlertTriangle className="w-2.5 h-2.5" />
                              Ausente
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              Válido
                            </>
                          )}
                        </Badge>
                      </div>
                      
                      <div className="flex items-start gap-1 font-mono text-[10px] text-muted-foreground">
                        <span className="shrink-0 text-slate-400 uppercase text-[9px]">Valor:</span>
                        <span className="truncate text-foreground font-semibold" title={isMissing ? 'N/A' : String(log.resolved)}>
                          {isMissing ? (
                            <span className="italic text-amber-500/80 font-normal">Retornou fallback</span>
                          ) : (
                            String(log.resolved)
                          )}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {activeTab === 'pool' && (
            <div className="flex-1 flex flex-col min-h-0 space-y-2">
              <p className="text-[11px] text-muted-foreground leading-snug">
                Dados brutos da pool de homologação disponíveis nesta simulação:
              </p>
              <div className="flex-1 bg-slate-950 rounded-lg p-2.5 overflow-auto font-mono text-[10px] text-slate-300 border border-slate-800/85 shadow-inner">
                {previewData ? (
                  <pre className="whitespace-pre leading-relaxed break-all">
                    {JSON.stringify(previewData, null, 2)}
                  </pre>
                ) : (
                  <div className="text-center py-12 text-[11px] text-muted-foreground">
                    Aguardando dados simulados...
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

type TemplatesMvpTabProps = {
  accessToken: string | null;
  consultations: ProviderConsultation[];
};

export default function TemplatesMvpTab({ accessToken, consultations }: TemplatesMvpTabProps) {
  // Controle de Abas / Seletores Principais
  const [templateKey, setTemplateKey] = useState<MvpTemplateKey>('DIVIDAS_SIMPLES');
  const [documentType, setDocumentType] = useState<MvpDocumentType>('CPF');
  const [localConfig, setLocalConfig] = useState<TemplateMvpConfig | null>(null);
  const [poolSelectionByStageId, setPoolSelectionByStageId] = useState<Record<string, string>>({});

  // Seletores do Novo Renderizador Estratégico (Drawer v2)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('draft');
  const draftTemplate = useEditorStore((s) => s.template);
  const sampleTemplate = useMemo(() => createSampleTemplate(), []);

  // Query de templates salvos no banco (idêntico ao TitleBar)
  const templatesQuery = useQuery({
    queryKey: ['production-templates-integration'],
    queryFn: () => getTemplatesApi(accessToken),
    enabled: !!accessToken,
  });

  const activeTemplate = useMemo(() => {
    if (selectedTemplateId === 'draft') return draftTemplate;
    if (selectedTemplateId === 'sample') return sampleTemplate;

    // Buscar nos templates salvos do banco
    const found = templatesQuery.data?.find((t) => t.id === selectedTemplateId);
    if (found && found.layout) {
      try {
        const parsed = typeof found.layout === "string" ? JSON.parse(found.layout) : found.layout;
        if (parsed && typeof parsed === "object" && Array.isArray(parsed.frames)) {
          return parsed;
        }
      } catch (err) {
        console.error("Erro ao analisar layout do template do banco:", err);
      }
    }
    return sampleTemplate; // fallback
  }, [selectedTemplateId, draftTemplate, sampleTemplate, templatesQuery.data]);

  // Sincroniza página/frame ativa do template selecionado
  const [activeFrameId, setActiveFrameId] = useState<string | null>(null);
  useEffect(() => {
    if (activeTemplate?.frames?.length > 0) {
      setActiveFrameId(activeTemplate.frames[0].id);
    } else {
      setActiveFrameId(null);
    }
  }, [activeTemplate]);

  // Console interativo de testes de expressão
  const [testExpression, setTestExpression] = useState('cliente.nome');
  
  // Queries e Mutações de API Legadas (Preservando Back-End)
  const configQuery = useQuery({
    queryKey: ['templates-mvp-config', templateKey, documentType],
    queryFn: () => getTemplateMvpConfigApi(accessToken, templateKey, documentType),
    enabled: !!accessToken,
  });

  const poolQuery = useQuery({
    queryKey: ['templates-mvp-pool'],
    queryFn: () => getTemplateMvpPoolApi(accessToken),
    enabled: !!accessToken,
  });

  useEffect(() => {
    if (configQuery.data) setLocalConfig(configQuery.data);
  }, [configQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!localConfig) return null;
      return putTemplateMvpConfigApi(accessToken, {
        templateKey: localConfig.templateKey,
        documentType: localConfig.documentType,
        displayName: localConfig.displayName,
        stages: localConfig.stages,
      });
    },
    onSuccess: (data) => {
      if (data) setLocalConfig(data);
      toast.success('Configuração salva com sucesso!');
      void configQuery.refetch();
    },
    onError: (e: Error) => toast.error(e.message || 'Erro ao salvar configuração'),
  });

  const importMutation = useMutation({
    mutationFn: async () => importTemplateMvpPoolApi(accessToken),
    onSuccess: (res) => {
      toast.success(`Pool de homologação importada (${res.imported} registros)`);
      void poolQuery.refetch();
    },
    onError: (e: Error) => toast.error(e.message || 'Erro ao importar pool'),
  });

  const previewMutation = useMutation({
    mutationFn: async () => {
      if (!localConfig) throw new Error('Configuração não carregada');
      return previewTemplateMvpApi(accessToken, {
        templateKey: localConfig.templateKey,
        documentType: localConfig.documentType,
        stageSelections: localConfig.stages.map((stage) => ({
          stageId: stage.id,
          providerProductId: stage.providerProductId ?? undefined,
          productCode: stage.productCode,
          enabled: stage.enabled,
          selectedPoolId: stage.id ? poolSelectionByStageId[stage.id] : undefined,
        })),
      });
    },
    onSuccess: () => {
      toast.success('Preview estratégico montado!');
    },
    onError: (e: Error) => toast.error(e.message || 'Erro ao montar preview'),
  });

  const poolByProduct = useMemo(() => {
    const rows = poolQuery.data ?? [];
    return rows.reduce<Record<string, TemplateMvpPoolItem[]>>((acc, row) => {
      const key = row.providerProductId;
      if (!acc[key]) acc[key] = [];
      acc[key]!.push(row);
      return acc;
    }, {});
  }, [poolQuery.data]);

  const consultationById = useMemo(
    () => new Map(consultations.map((c) => [c.id, c])),
    [consultations],
  );

  const sortedConsultations = useMemo(() => {
    const byDoc = consultations.filter((c) => {
      if (documentType === 'CPF') return c.externalId !== '676' || c.name.toLowerCase().includes('cpf');
      return true;
    });
    return [...byDoc].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [consultations, documentType]);

  const rawPreviewData = previewMutation.data?.preview;

  // Adaptador de Dados de Homologação para renderização e apuração de variáveis
  const previewData = useMemo(() => {
    if (!rawPreviewData) return null;
    
    // Mapeador Inteligente que extrai dívidas da resposta do bureau para o formato que os templates esperam
    const debtsList: any[] = [];
    if (rawPreviewData.byBureau) {
      Object.entries(rawPreviewData.byBureau).forEach(([bureauName, bureauInfo]: [string, any]) => {
        if (bureauInfo && Array.isArray(bureauInfo.debts)) {
          bureauInfo.debts.forEach((debt: any) => {
            debtsList.push({
              credor: debt.credor || bureauName.toUpperCase(),
              valor: debt.valor ?? 0,
              data: debt.data || 'N/A',
              status: debt.status || 'Pendente',
            });
          });
        }
      });
    }

    const scoreVal = rawPreviewData.score ?? 580;

    // Calcular faixa de score dinamicamente
    let bandColor = "#ca8a04"; // Amarelo (Regular)
    let bandLabel = "Regular";
    let bandSlug = "regular";
    let bandRange = "401 a 600";
    let faixaDescription = "Risco moderado. Valide renda e estabilidade.";
    let fraseInterpretacao = `Hoje seu Score está em Regular (${scoreVal}) — isso geralmente indica que o mercado enxerga risco moderado. O objetivo aqui é identificar o que mais pesa na sua pontuação e montar o caminho mais rápido para destravar aprovações.`;

    if (scoreVal <= 200) {
      bandColor = "#dc2626"; // Vermelho (Péssimo)
      bandLabel = "Péssimo";
      bandSlug = "pessimo";
      bandRange = "0 a 200";
      faixaDescription = "Risco de inadimplência muito alto. Atenção rigorosa.";
      fraseInterpretacao = `Hoje seu Score está em Péssimo (${scoreVal}) — isso geralmente indica que o mercado enxerga risco muito alto. O objetivo aqui é identificar o que mais pesa na sua pontuação e montar o caminho mais rápido para destravar aprovações.`;
    } else if (scoreVal <= 400) {
      bandColor = "#ea580c"; // Laranja (Ruim)
      bandLabel = "Ruim";
      bandSlug = "ruim";
      bandRange = "201 a 400";
      faixaDescription = "Risco de inadimplência alto. Recomenda-se cautela.";
      fraseInterpretacao = `Hoje seu Score está em Ruim (${scoreVal}) — isso geralmente indica que o mercado enxerga risco alto. O objetivo aqui é identificar o que mais pesa na sua pontuação e montar o caminho mais rápido para destravar aprovações.`;
    } else if (scoreVal <= 600) {
      bandColor = "#ca8a04"; // Amarelo (Regular)
      bandLabel = "Regular";
      bandSlug = "regular";
      bandRange = "401 a 600";
      faixaDescription = "Risco moderado. Valide renda e estabilidade.";
      fraseInterpretacao = `Hoje seu Score está em Regular (${scoreVal}) — isso geralmente indica que o mercado enxerga risco moderado. O objetivo aqui é identificar o que mais pesa na sua pontuação e montar o caminho mais rápido para destravar aprovações.`;
    } else if (scoreVal <= 800) {
      bandColor = "#65a30d"; // Verde claro (Bom)
      bandLabel = "Bom";
      bandSlug = "bom";
      bandRange = "601 a 800";
      faixaDescription = "Risco baixo. Boas chances de aprovação.";
      fraseInterpretacao = `Hoje seu Score está em Bom (${scoreVal}) — isso indica que o mercado enxerga baixo risco e boa propensão a pagamentos.`;
    } else {
      bandColor = "#16a34a"; // Verde escuro (Ótimo)
      bandLabel = "Ótimo";
      bandSlug = "otimo";
      bandRange = "801 a 1000";
      faixaDescription = "Excelente perfil. Altamente recomendado para crédito.";
      fraseInterpretacao = `Hoje seu Score está em Ótimo (${scoreVal}) — excelente perfil de crédito com as melhores taxas do mercado.`;
    }

    // Calcular o scorePointer
    const theta = Math.PI - (scoreVal / 1000) * Math.PI;
    const pointerX = 100 + 80 * Math.cos(theta);
    const pointerY = 90 - 80 * Math.sin(theta);

    return {
      empresa: {
        nome: "CONSULTAS PRO S.A.",
        cnpj: "12.345.678/0001-90",
        contato: "suporte@consultaspro.com.br",
      },
      consulta: {
        protocolo: `PROT-${rawPreviewData.document ? rawPreviewData.document.replace(/\D/g, '').slice(-6) : '482910'}`,
        data: new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        totalDividas: rawPreviewData.totals?.uniqueTotal ?? 0,
        totals: {
          grossTotal: rawPreviewData.totals?.grossTotal ?? 0,
          uniqueTotal: rawPreviewData.totals?.uniqueTotal ?? 0,
        }
      },
      cliente: {
        nome: rawPreviewData.clientName || 'Cliente de Teste',
        cpf: rawPreviewData.document || '000.000.000-00',
        cnpj: rawPreviewData.document || '000.000.000-00',
        score: scoreVal,
        risco: scoreVal > 700 ? 'Baixo' : scoreVal > 400 ? 'Médio' : 'Alto',
        situacao: 'REGULAR',
      },
      dividas: debtsList,
      byBureau: rawPreviewData.byBureau || {},
      hasBacen: rawPreviewData.hasBacen ?? false,

      // Informações do cliente no nível raiz para compatibilidade do motor canônico do HTML original
      clientName: rawPreviewData.clientName || 'Cliente de Teste',
      clientCpf: rawPreviewData.document || '000.000.000-00',
      consultationDate: new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      protocol: rawPreviewData.document ? `PROT-${rawPreviewData.document.replace(/\D/g, '').slice(-6)}` : 'PROT-000000',

      // Propriedades dinâmicas de score
      hasScore: true,
      score: scoreVal,
      scorePointer: {
        x: pointerX,
        y: pointerY,
      },
      scoreBandRange: bandRange,
      scoreBandLabel: bandLabel,
      scoreBandSlug: bandSlug,
      scoreBandColor: bandColor,
      scoreProbabilityPayment: (scoreVal / 10).toFixed(2),
      scoreProbabilityDefault: (100 - scoreVal / 10).toFixed(2),
      scoreMetricDescription: "Quanto maior, melhor a predisposição ao crédito.",
      scoreFaixaDescription: faixaDescription,
      scoreProbPaymentDescription: "Estimativa de adimplência nos próximos 6 meses.",
      scoreProbDefaultDescription: "Estimativa de inadimplência — use como apoio à decisão.",
      scoreHeadline: "Como o mercado enxerga seu CPF hoje (e o que está travando seu crédito)",
      scoreSubtitulo: "Seu Score é uma estimativa de chance de pagar em dia nos próximos 6 meses. Quanto maior a pontuação, maior tende a ser a facilidade para conseguir crédito e melhores condições.",
      scoreFraseInterpretacao: fraseInterpretacao,
      scoreInfluenciaTitulo: "O que mais influencia sua pontuação",
      scoreInfluenciaTexto: "O Serasa Score é calculado por pilares. Os que mais pesam são hábitos de pagamento e experiência/relacionamento com o mercado — e dívidas negativadas também têm impacto alto, considerando inclusive o tempo desde a quitação.",
      scoreInfluenciaLista: [
        "Pagamentos em dia (cartão, parcelas e contas) têm peso alto na pontuação.",
        "Dívidas negativadas costumam derrubar o Score e demoram a perder impacto sem regularização.",
        "Muitas consultas/simulações de crédito em pouco tempo podem pesar negativamente (busca por crédito).",
      ],
      scoreDiagnosticoTitulo: "Nós te ajudamos com tudo isso!",
      scoreDiagnosticoTexto: "O que trava crédito quase sempre é simples: pendência/negativação + histórico recente. A boa notícia é que, com estratégia, dá pra acelerar sua reabilitação e voltar a ser aprovado com mais facilidade.",

      // Fontes de dados legítimas e canônicas na raiz
      refinPefin: rawPreviewData.byBureau?.refinPefin || [],
      serasaPremium: rawPreviewData.byBureau?.refinPefin || [],
      spc: rawPreviewData.byBureau?.spc || [],
      scpc: rawPreviewData.byBureau?.scpc || [],
      protesto: rawPreviewData.byBureau?.protesto || [],
      bacen: rawPreviewData.byBureau?.bacen || null,
      Bacen: rawPreviewData.byBureau?.bacen || null,
    };
  }, [rawPreviewData]);

  // Resolver expressão do console interativo
  const evaluatedExpressionResult = useMemo(() => {
    if (!previewData) return 'Aguardando dados de homologação...';
    try {
      const res = resolveExpression(testExpression, previewData);
      if (res === undefined) return 'undefined (Expressão não encontrada)';
      return JSON.stringify(res, null, 2);
    } catch (e: any) {
      return `Erro ao avaliar: ${e.message}`;
    }
  }, [testExpression, previewData]);

  // Compilar o template ativo em tempo real
  const compiledTemplateResult = useMemo(() => {
    if (!activeTemplate || !activeFrameId || !previewData) return null;
    try {
      return renderTemplateToHtml(activeTemplate, activeFrameId, previewData);
    } catch (err: any) {
      console.error(err);
      return { html: `<div style="padding:20px;color:red">Erro na compilação: ${err.message}</div>`, logs: [] };
    }
  }, [activeTemplate, activeFrameId, previewData]);

  return (
    <div className="space-y-4">
      {/* 1. BARRA DE CONTROLE PRINCIPAL */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card/60 backdrop-blur-md p-4 shadow-card">
        <div className="flex flex-wrap items-center gap-3">
          {/* Seletor de regras MVP */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Regra MVP:</span>
            <Select value={templateKey} onValueChange={(v) => setTemplateKey(v as MvpTemplateKey)}>
              <SelectTrigger className="h-9 w-[240px] font-medium"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(TEMPLATE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key} className="text-xs">{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Documento:</span>
            <Select value={documentType} onValueChange={(v) => setDocumentType(v as MvpDocumentType)}>
              <SelectTrigger className="h-9 w-[90px] font-medium"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="CPF" className="text-xs">CPF</SelectItem>
                <SelectItem value="CNPJ" className="text-xs">CNPJ</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="h-6 w-px bg-border hidden sm:block" />

          {/* Seletor de Template para Teste */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Visual:</span>
            <Select value={selectedTemplateId} onValueChange={(v) => setSelectedTemplateId(v)}>
              <SelectTrigger className="h-9 w-[220px] font-medium text-indigo-500 border-indigo-500/20 bg-indigo-500/5 hover:bg-indigo-500/10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft" className="text-xs font-medium">Editor Visual (Draft)</SelectItem>
                <SelectItem value="sample" className="text-xs">Template Exemplo A4</SelectItem>
                {templatesQuery.isLoading ? (
                  <SelectItem value="__loading__" disabled className="text-xs text-slate-400">
                    Carregando templates...
                  </SelectItem>
                ) : (
                  templatesQuery.data?.map((t) => (
                    <SelectItem key={t.id} value={t.id} className="text-xs">
                      {t.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            size="sm" 
            variant="outline" 
            className="h-9 font-medium" 
            onClick={() => importMutation.mutate()} 
            disabled={importMutation.isPending}
          >
            <RefreshCcw className={`mr-1.5 h-3.5 w-3.5 ${importMutation.isPending ? 'animate-spin' : ''}`} /> 
            Importar Pool
          </Button>

          <Button 
            size="sm" 
            variant="outline" 
            className="h-9 border-green-500/20 text-green-500 hover:bg-green-500/10" 
            onClick={() => saveMutation.mutate()} 
            disabled={saveMutation.isPending || !localConfig}
          >
            <Save className="mr-1.5 h-3.5 w-3.5" /> 
            Salvar Regras
          </Button>

          <Button 
            size="sm" 
            className="h-9 gradient-primary text-primary-foreground font-semibold shadow-glow shrink-0" 
            onClick={() => previewMutation.mutate()} 
            disabled={previewMutation.isPending || !localConfig}
          >
            <Play className="mr-1.5 h-3.5 w-3.5 fill-current" /> 
            Gerar Preview
          </Button>
        </div>
      </div>

      {/* 2. ÁREA DE TRABALHO DE DUAS COLUNAS REDIMENSIONÁVEIS */}
      <div className="h-[750px] rounded-xl overflow-hidden border border-border bg-card/30 backdrop-blur-md shadow-card">
        <ResizablePanelGroup direction="horizontal">
          
          {/* COLUNA 1: PIPELINE DE CONSULTAS */}
          <ResizablePanel defaultSize={40} minSize={25} id="pipeline-panel">
            <section className="h-full flex flex-col p-4 space-y-3 overflow-hidden bg-card/50">
              <div className="flex items-center justify-between border-b border-border pb-3 shrink-0">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-primary animate-pulse" />
                  <h3 className="text-sm font-bold text-foreground">1. Pipeline de Consultas</h3>
                </div>
                <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-wider">Configuração</Badge>
              </div>

              <div className="flex-1 overflow-y-auto scrollbar-thin pr-1 space-y-3">
                {localConfig?.stages.map((stage, index) => {
                  const product = stage.providerProductId ? consultationById.get(stage.providerProductId) : null;
                  const pools = stage.providerProductId ? (poolByProduct[stage.providerProductId] ?? []) : [];
                  const poolValue = (stage.id && poolSelectionByStageId[stage.id]) || '__none__';

                  return (
                    <div key={stage.id ?? `${stage.productCode}-${index}`} className="relative rounded-xl border border-border bg-muted/20 p-3 transition-all hover:bg-muted/30 hover:border-border-hover">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`chk-${stage.id}`}
                            checked={stage.enabled}
                            onCheckedChange={(v) => setLocalConfig((cur) => cur ? ({
                              ...cur,
                              stages: cur.stages.map((s, i) => i === index ? { ...s, enabled: v === true } : s),
                            }) : cur)}
                          />
                          <label htmlFor={`chk-${stage.id}`} className="text-xs font-bold text-foreground cursor-pointer flex flex-col">
                            <span>{stage.stageName}</span>
                            <span className="text-[10px] text-muted-foreground font-mono">{stage.productCode} · {stage.role}</span>
                          </label>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {/* Botão de Apuração flutuante do Pipeline */}
                          <ApurationPopover
                            previewData={previewData}
                            compiledTemplateResult={compiledTemplateResult}
                            testExpression={testExpression}
                            setTestExpression={setTestExpression}
                            evaluatedExpressionResult={evaluatedExpressionResult}
                          >
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-6 w-6 text-muted-foreground hover:text-indigo-500 hover:bg-indigo-500/10 rounded-md transition-colors cursor-pointer"
                              title="Abrir Central de Apuração"
                            >
                              <Terminal className="h-3.5 w-3.5" />
                            </Button>
                          </ApurationPopover>
                          <Badge variant="outline" className="text-[10px] font-mono border-dashed bg-card shrink-0">Fila {stage.priority}</Badge>
                        </div>
                      </div>

                      <div className="space-y-2 mt-3">
                        {/* Vínculo de Produto do Provedor */}
                        <div className="space-y-1">
                          <span className="text-[10px] font-semibold text-muted-foreground uppercase">Consulta Associada</span>
                          <Select
                            value={stage.providerProductId ?? '__none__'}
                            onValueChange={(v) => {
                              const product = sortedConsultations.find((c) => c.id === v);
                              setLocalConfig((cur) => cur ? ({
                                ...cur,
                                stages: cur.stages.map((s, i) => i === index ? {
                                  ...s,
                                  providerProductId: v === '__none__' ? null : v,
                                  productCode: product?.externalId || s.productCode,
                                } : s),
                              }) : cur);
                            }}
                          >
                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione consulta" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__" className="text-xs">Sem vínculo (Ignorar etapa)</SelectItem>
                              {sortedConsultations.map((c) => (
                                <SelectItem key={c.id} value={c.id} className="text-xs">{c.name} ({c.externalId})</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Configuração de Homologação (Documento de Teste) */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-semibold text-muted-foreground uppercase">Mock da Base (Pool)</span>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <HelpCircle className="w-3.5 h-3.5 text-muted-foreground/60 hover:text-muted-foreground cursor-pointer" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs text-xs">
                                  Selecione qual CPF/CNPJ de teste simulado na pool de homologação deve rodar nesta etapa.
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                          
                          <Select
                            value={poolValue}
                            onValueChange={(v) => {
                              if (!stage.id) return;
                              setPoolSelectionByStageId((cur) => ({ ...cur, [stage.id!]: v === '__none__' ? '' : v }));
                            }}
                            disabled={!stage.providerProductId}
                          >
                            <SelectTrigger className="h-8 text-xs font-mono"><SelectValue placeholder="Sem documento simulado" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__" className="text-xs">Nenhum (Retornar Vazio)</SelectItem>
                              {pools.map((p) => (
                                <SelectItem key={p.id} value={p.id} className="text-xs font-mono">
                                  {p.document} · {p.hasDebt ? 'Com dívidas' : 'Limpo'}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Tratar Erros */}
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <div className="space-y-1">
                            <span className="text-[9px] font-semibold text-muted-foreground uppercase">Falha (onFailure)</span>
                            <Input
                              value={stage.onFailure || ''}
                              onChange={(e) => setLocalConfig((cur) => cur ? ({
                                ...cur,
                                stages: cur.stages.map((s, i) => i === index ? { ...s, onFailure: e.target.value } : s),
                              }) : cur)}
                              className="h-7 text-xs font-mono"
                            />
                          </div>
                          <div className="space-y-1">
                            <span className="text-[9px] font-semibold text-muted-foreground uppercase">Prioridade</span>
                            <Input
                              value={String(stage.priority)}
                              onChange={(e) => {
                                const n = Number(e.target.value);
                                setLocalConfig((cur) => cur ? ({
                                  ...cur,
                                  stages: cur.stages.map((s, i) => i === index ? { ...s, priority: Number.isFinite(n) ? n : s.priority } : s),
                                }) : cur);
                              }}
                              className="h-7 text-xs font-mono"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </ResizablePanel>

          <ResizableHandle withHandle className="w-1.5 bg-border/60 hover:bg-primary/40 transition-colors" />

          {/* COLUNA 2: PREVIEW DO RELATÓRIO RENDERIZADO */}
          <ResizablePanel defaultSize={60} minSize={35} id="preview-panel">
            <section className="h-full flex flex-col p-4 bg-muted/5">
              <div className="flex items-center justify-between border-b border-border pb-3 mb-4 shrink-0">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-bold text-foreground">2. Preview Estratégico</h3>
                </div>
                
                <div className="flex items-center gap-2">
                  {/* Botão de Apuração flutuante no topo do Preview */}
                  <ApurationPopover
                    previewData={previewData}
                    compiledTemplateResult={compiledTemplateResult}
                    testExpression={testExpression}
                    setTestExpression={setTestExpression}
                    evaluatedExpressionResult={evaluatedExpressionResult}
                  >
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="h-8 text-xs font-bold gap-1 border-indigo-500/20 text-indigo-500 hover:bg-indigo-500/10 cursor-pointer shadow-sm transition-all"
                    >
                      <Terminal className="w-3.5 h-3.5 animate-pulse" />
                      Apuração & Logs
                    </Button>
                  </ApurationPopover>

                  <Badge variant="outline" className="text-[10px] text-indigo-500 border-indigo-500/30 bg-indigo-500/5 font-mono uppercase">
                    {activeTemplate?.name || 'Sem nome'}
                  </Badge>
                </div>
              </div>

              {/* Renderizador de Iframe */}
              <div className="flex-1 flex flex-col min-h-0 bg-slate-900 rounded-xl border border-slate-800/80 p-3 relative shadow-inner">
                {!previewData ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-3">
                    <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
                      <FileText className="w-6 h-6 text-slate-400" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-200">Aguardando Execução</h4>
                      <p className="text-[11px] text-slate-400 max-w-xs mt-1 leading-relaxed">
                        Selecione um documento na coluna 1 e clique em <strong className="text-primary">"Gerar Preview"</strong> acima para renderizar os dados de apuração no template visual.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col min-h-0 space-y-2">
                    {/* Seletor de páginas caso o template tenha múltiplos frames */}
                    {activeTemplate?.frames?.length > 1 && (
                      <div className="flex items-center gap-1.5 shrink-0 bg-slate-800/50 p-1.5 rounded-lg border border-slate-700/50 overflow-x-auto">
                        <span className="text-[10px] text-slate-400 font-bold shrink-0 px-1">PÁGINAS:</span>
                        {activeTemplate.frames.map((frame, idx) => (
                          <button
                            key={frame.id}
                            type="button"
                            onClick={() => setActiveFrameId(frame.id)}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                              activeFrameId === frame.id
                                ? 'bg-primary text-primary-foreground'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                            }`}
                          >
                            {frame.name || `Pág ${idx + 1}`}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Canvas do Iframe */}
                    <div className="flex-1 relative rounded-lg overflow-hidden border border-slate-700">
                      <iframe
                        title="Apuração de Template"
                        srcDoc={`
                          <!DOCTYPE html>
                          <html>
                              <link rel="preconnect" href="https://fonts.googleapis.com">
                              <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                              <link href="https://fonts.googleapis.com/css2?family=Geist:wght@100..900&family=Geist+Mono:wght@100..900&family=Inter:wght@100..900&family=JetBrains+Mono:wght@100..900&display=swap" rel="stylesheet">
                              <script src="https://cdn.jsdelivr.net/npm/lucide@0.462.0/dist/umd/lucide.min.js"></script>
                              <style>
                                body {
                                  margin: 0;
                                  padding: 24px;
                                  background: #f1f5f9;
                                  display: flex;
                                  justify-content: center;
                                  align-items: flex-start;
                                  min-height: 100vh;
                                  font-family: 'Geist', 'Inter', sans-serif;
                                  box-sizing: border-box;
                                }
                                i[data-lucide] svg, svg.lucide {
                                  width: 100%;
                                  height: 100%;
                                }
                                /* Placeholder para render de Ícones Lucide (fallback offline) */
                                i[data-lucide]:empty::after {
                                  content: "✦";
                                  font-size: 16px;
                                  color: #6366f1;
                                  font-weight: bold;
                                }
                              </style>
                            </head>
                            <body>
                              <div style="zoom: 0.52; transform-origin: top center; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1); border-radius: 8px;">
                                ${compiledTemplateResult?.html || '<div style="background:#fff;padding:40px;text-align:center">Nenhum conteúdo compilado</div>'}
                              </div>
                              <script>
                                if (typeof lucide !== 'undefined') {
                                  lucide.createIcons();
                                }
                              </script>
                            </body>
                          </html>
                        `}
                        className="w-full h-full bg-slate-950 border-0"
                      />
                    </div>
                  </div>
                )}
              </div>
            </section>
          </ResizablePanel>

        </ResizablePanelGroup>
      </div>
    </div>
  );
}
