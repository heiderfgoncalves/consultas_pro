import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useEditorStore } from "../../store/editor.store";
import { useAuthStore } from "@/stores/authStore";
import { getProviders, mapApiProduct, getTestLogs, mapTestLogs } from "@/api/admin-integrations";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Database, Sliders, ArrowUp, ArrowDown, HelpCircle, AlertTriangle, 
  Loader2, Search 
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ManageSourcesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ManageSourcesDialog({ open, onOpenChange }: ManageSourcesDialogProps) {
  const { accessToken } = useAuthStore();

  const selectedConsultaIds = useEditorStore((s) => s.selectedConsultaIds);
  const setSelectedConsultaIds = useEditorStore((s) => s.setSelectedConsultaIds);
  const currentLayoutJson = useEditorStore((s) => s.template);
  const updateMetadata = useEditorStore((s) => s.updateMetadata);

  const [searchQuery, setSearchQuery] = useState<string>("");

  // 1. Obter todos os Provedores & Produtos cadastrados na Integração
  const providersQuery = useQuery({
    queryKey: ['admin-providers'],
    queryFn: () => getProviders(accessToken),
    enabled: !!accessToken && open,
  });

  // 2. Obter Logs de Teste das Integrações
  const testLogsQuery = useQuery({
    queryKey: ['admin-test-logs'],
    queryFn: () => getTestLogs(accessToken),
    enabled: !!accessToken && open,
  });

  const testLogs = useMemo(() => {
    return mapTestLogs(testLogsQuery.data ?? []);
  }, [testLogsQuery.data]);

  const consultations = useMemo(() => {
    const raw = providersQuery.data ?? [];
    const out: any[] = [];
    for (const p of raw) {
      for (const prod of p.products ?? []) {
        out.push(mapApiProduct(prod, p.id));
      }
    }
    return out;
  }, [providersQuery.data]);

  // Filtrar as integrações baseadas no campo de busca
  const filteredConsultations = useMemo(() => {
    if (!searchQuery.trim()) return consultations;
    const query = searchQuery.toLowerCase();
    return consultations.filter((c) => 
      c.name.toLowerCase().includes(query) || 
      (c.externalId && c.externalId.toLowerCase().includes(query))
    );
  }, [consultations, searchQuery]);

  // Carrega fontes ativas salvas nos metadados do layout
  const sourcesConfig = useMemo(() => {
    return (currentLayoutJson.metadata?.sourcesConfig as Record<string, any>) || {};
  }, [currentLayoutJson]);

  // Alterna a seleção de uma consulta
  const handleToggleSource = (id: string) => {
    let nextIds = [...selectedConsultaIds];
    if (selectedConsultaIds.includes(id)) {
      nextIds = nextIds.filter((x) => x !== id);
      // Remove o log selecionado para este produto ao desvinculá-lo
      const nextLogs = { ...(currentLayoutJson.metadata?.selectedTestLogs as Record<string, string> || {}) };
      delete nextLogs[id];
      updateMetadata({ selectedTestLogs: nextLogs });
    } else {
      nextIds.push(id);
    }
    setSelectedConsultaIds(nextIds);
    
    // Inicializa prioridade/fallback nos metadados
    const nextConfig = { ...sourcesConfig };
    if (!nextConfig[id]) {
      nextConfig[id] = { isFallback: false };
    }
    updateMetadata({ sourcesConfig: nextConfig });
  };

  // Reordena as fontes (prioridade)
  const handleMoveSource = (index: number, direction: -1 | 1) => {
    const nextIds = [...selectedConsultaIds];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= nextIds.length) return;

    // Swap
    [nextIds[index], nextIds[targetIndex]] = [nextIds[targetIndex], nextIds[index]];
    setSelectedConsultaIds(nextIds);
  };

  // Define se a fonte é fallback
  const handleToggleFallback = (id: string) => {
    const nextConfig = { ...sourcesConfig };
    if (!nextConfig[id]) {
      nextConfig[id] = { isFallback: false };
    }
    nextConfig[id].isFallback = !nextConfig[id].isFallback;
    updateMetadata({ sourcesConfig: nextConfig });
  };

  // Associa um log de teste específico à fonte de dados selecionada
  const handleSelectLogForSource = (productId: string, logId: string) => {
    const nextLogs = { ...(currentLayoutJson.metadata?.selectedTestLogs as Record<string, string> || {}) };
    if (logId === "__none__") {
      delete nextLogs[productId];
    } else {
      nextLogs[productId] = logId;
    }
    updateMetadata({ selectedTestLogs: nextLogs });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[850px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-0 shadow-2xl overflow-hidden flex flex-col text-slate-800 dark:text-slate-200">
        
        {/* Header */}
        <div className="bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 p-4 px-5 flex items-center justify-between">
          <DialogHeader className="p-0 flex-1">
            <DialogTitle className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <Database className="size-4 text-indigo-500" />
              <span>Gerenciamento de Fontes de Dados do Template</span>
            </DialogTitle>
            <DialogDescription className="hidden">
              Defina as integrações vinculadas e selecione os logs de retorno de simulação.
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Corpo Principal (Sem abas) */}
        <div className="flex-1 p-5 space-y-4 flex flex-col min-h-0">
          <div className="grid grid-cols-12 gap-5 flex-1 min-h-[420px] min-h-0">
            
            {/* Coluna Esquerda: Todas as Integrações Disponíveis */}
            <div className="col-span-6 flex flex-col min-h-0 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Todas as Integrações Cadastradas
                </span>
              </div>
              
              {/* Campo de Busca Rápida */}
              <div className="relative shrink-0">
                <Search className="absolute left-2.5 top-2.5 size-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar integrações por nome ou código..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 rounded-md outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition-colors text-xs font-medium shadow-3xs"
                />
              </div>

              <div className="flex-1 overflow-y-auto border border-slate-200 dark:border-slate-800/80 rounded-lg bg-white dark:bg-slate-950 p-2.5 space-y-1.5 scrollbar-thin">
                {providersQuery.isLoading ? (
                  <div className="flex items-center gap-2 justify-center py-12 text-xs text-slate-400">
                    <Loader2 className="size-4 animate-spin text-indigo-500" /> Carregando produtos do banco...
                  </div>
                ) : filteredConsultations.length === 0 ? (
                  <p className="text-xs italic text-slate-400 py-12 text-center">Nenhuma integração correspondente.</p>
                ) : (
                  filteredConsultations.map((c) => {
                    const isChecked = selectedConsultaIds.includes(c.id);
                    return (
                      <div 
                        key={c.id} 
                        className={cn(
                          "flex items-start gap-3 p-2 rounded-lg border transition-all cursor-pointer",
                          isChecked 
                            ? "bg-indigo-50/20 dark:bg-indigo-950/10 border-indigo-500/30" 
                            : "border-slate-100 dark:border-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-900/40"
                        )}
                        onClick={() => handleToggleSource(c.id)}
                      >
                        <Checkbox 
                          checked={isChecked} 
                          onCheckedChange={() => handleToggleSource(c.id)}
                          className="mt-0.5 size-3.5"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200 line-clamp-1">{c.name}</div>
                          <div className="text-[9px] text-slate-450 dark:text-slate-550 flex items-center gap-2 mt-0.5">
                            <span>ID: {c.externalId}</span>
                            <span>•</span>
                            <span>Preço: R$ {c.consultationPrice?.toFixed(2) ?? "0.00"}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Coluna Direita: Priorização, Fallbacks e Dropdown de logs */}
            <div className="col-span-6 flex flex-col min-h-0 space-y-2">
              <span className="font-bold text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Prioridade e Fontes de Dados (Retorno Simulador)
              </span>
              
              <div className="flex-1 overflow-y-auto border border-slate-200 dark:border-slate-800/80 rounded-lg bg-white dark:bg-slate-950 p-2.5 space-y-2 scrollbar-thin">
                {selectedConsultaIds.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center py-16 px-4 space-y-2 h-full">
                    <AlertTriangle className="size-6 text-amber-500/80" />
                    <p className="text-[11px] text-slate-400 leading-relaxed font-semibold">
                      Nenhuma fonte ativa selecionada.<br />Selecione as fontes na lista ao lado.
                    </p>
                  </div>
                ) : (
                  selectedConsultaIds.map((id, index) => {
                    const c = consultations.find((item) => item.id === id);
                    if (!c) return null;
                    const isFallback = sourcesConfig[id]?.isFallback;
                    
                    // Filtrar logs de teste deste produto/consulta específico
                    const logsForProduct = testLogs.filter((t) => t.productId === id);
                    const selectedLogId = (currentLayoutJson.metadata?.selectedTestLogs as Record<string, string>)?.[id] || "__none__";

                    return (
                      <div 
                        key={id} 
                        className="flex flex-col gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800/60"
                      >
                        <div className="flex items-center justify-between">
                          <div className="min-w-0 flex-1 pr-2">
                            <div className="flex items-center gap-1.5">
                              <span className="flex items-center justify-center size-4 rounded bg-indigo-500/10 text-indigo-500 font-extrabold text-[10px] shrink-0">
                                {index + 1}
                              </span>
                              <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate font-sans" title={c.name}>
                                {c.name}
                              </span>
                            </div>
                          </div>

                          {/* Controles de Ordenação (Prioridade) */}
                          <div className="flex items-center gap-0.5 shrink-0">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-6 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
                              disabled={index === 0}
                              onClick={() => handleMoveSource(index, -1)}
                            >
                              <ArrowUp className="size-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-6 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
                              disabled={index === selectedConsultaIds.length - 1}
                              onClick={() => handleMoveSource(index, 1)}
                            >
                              <ArrowDown className="size-3" />
                            </Button>
                          </div>
                        </div>

                        {/* Controles Inferiores: Fallback e Dropdown do Log */}
                        <div className="flex items-center gap-2 justify-between border-t border-slate-100 dark:border-slate-800/40 pt-2">
                          <button
                            onClick={() => handleToggleFallback(id)}
                            className={cn(
                              "text-[8.5px] px-1.5 py-0.5 rounded font-black uppercase tracking-wider transition-colors shrink-0",
                              isFallback 
                                ? "bg-amber-500/20 text-amber-600 dark:text-amber-400" 
                                : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-400 dark:text-slate-500"
                            )}
                          >
                            {isFallback ? "Fallback Ativo" : "Definir Fallback"}
                          </button>

                          <div className="flex items-center gap-1 min-w-0 flex-1 justify-end max-w-[220px]">
                            <select
                              value={selectedLogId}
                              onChange={(e) => handleSelectLogForSource(id, e.target.value)}
                              className="text-[9px] font-medium px-2 py-0.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-350 rounded outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition-colors w-full cursor-pointer"
                            >
                              <option value="__none__">Padrão (Mock Estático)</option>
                              {logsForProduct.map((log) => {
                                const dateStr = new Date(log.testedAt).toLocaleString("pt-BR", {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  second: "2-digit"
                                });
                                return (
                                  <option key={log.id} value={log.id}>
                                    {dateStr}
                                  </option>
                                );
                              })}
                            </select>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 p-4 px-5 flex items-center justify-end gap-2 text-xs">
          <Button
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-md font-medium transition-colors cursor-pointer"
          >
            Fechar
          </Button>
          <Button
            onClick={() => {
              onOpenChange(false);
              toast.success("Configuração de fontes aplicada localmente! Lembre-se de clicar em 'Salvar' no topo para gravar no servidor.");
            }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md font-semibold transition-colors cursor-pointer shadow-sm shadow-indigo-500/10"
          >
            Aplicar Fontes
          </Button>
        </div>

      </DialogContent>
    </Dialog>
  );
}
