import { useEffect, useState } from "react";
import { motion, Reorder } from "framer-motion";
import { BracketLabel, FadeUp, HUDFrame } from "./primitives";
import { TerminalOutput } from "./TerminalOutput";
import { Grid3x3, Zap, Database, Shield, FileText, Loader2 } from "lucide-react";
import BorderGlow from "../ui/BorderGlow";
import Dock, { DockItemData } from "../ui/Dock";
import { useSubTheme } from "@/hooks/use-subtheme";

const defaultStages = [
  { id: "stage-1", n: "01", title: "PROVEDORES", desc: "Conecta APIs externas (SOLLOS, Serasa, Boa Vista, +37)", active: false },
  { id: "stage-2", n: "02", title: "CONSULTAS", desc: "Define produtos consumíveis com preço por bloco", active: false },
  { id: "stage-3", n: "03", title: "TIPOS", desc: "Motor de-para FLAT — normaliza payloads heterogêneos", active: true },
  { id: "stage-4", n: "04", title: "TEMPLATES", desc: "Drawer drag-and-drop com motor math() BR", active: false },
  { id: "stage-5", n: "05", title: "EMISSÃO", desc: "Fila BullMQ + ledger transacional com estorno", active: false },
];

const providers = ["SOLLOS", "SERASA", "BOA_VISTA", "SCPC", "SPC", "CONSULTAS+", "ASAAS", "+33"];

export function WorkflowSplit() {
  const [orderedStages, setOrderedStages] = useState(defaultStages);
  const [resetTimer, setResetTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const { subTheme } = useSubTheme();

  const [activeStageIndex, setActiveStageIndex] = useState(0);

  // Ciclo automático para ir acendendo as etapas sequencialmente com efeito de progresso e spinner
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStageIndex((prev) => (prev + 1) % 5);
    }, 3200);
    return () => clearInterval(interval);
  }, []);

  const themeColors: Record<string, string> = {
    classic: "#0070f3",
    cyberpunk: "#a855f7",
    oceanic: "#0d9488",
    emerald: "#10b981",
    minimal: "#a1a1aa",
  };

  const themeGlows: Record<string, string> = {
    classic: "212 100 48",
    cyberpunk: "271 91 65",
    oceanic: "174 100 41",
    emerald: "142 71 45",
    minimal: "240 5 65",
  };

  const themeColor = themeColors[subTheme] || "#0070f3";
  const themeGlow = themeGlows[subTheme] || "212 100 48";

  const handleReorder = (newOrder: typeof defaultStages) => {
    setOrderedStages(newOrder);

    const isDifferent = newOrder.some((s, i) => s.id !== defaultStages[i].id);
    if (isDifferent) {
      // Dispara evento de auditoria no terminal de que o usuário moveu os tubos do pipeline
      window.dispatchEvent(new CustomEvent('terminal-log', {
        detail: {
          t: new Date().toLocaleTimeString('pt-BR'),
          tag: "WARN",
          tagColor: "text-amber-500",
          msg: "Intervenção manual: Pipeline reordenado pelo operador. Verificando integridade..."
        }
      }));

      if (resetTimer) clearTimeout(resetTimer);

      const timer = setTimeout(() => {
        setOrderedStages(defaultStages);
        window.dispatchEvent(new CustomEvent('terminal-log', {
          detail: {
            t: new Date().toLocaleTimeString('pt-BR'),
            tag: "SECURE",
            tagColor: "text-brand",
            msg: "Ledger Audit: Ordem canônica restaurada automaticamente via política imutável!"
          }
        }));
      }, 2000);
      setResetTimer(timer);
    }
  };

  const inlineDockItems: DockItemData[] = [
    {
      icon: <Zap className="h-4 w-4" />,
      label: "Disparar Gatilho",
      onClick: () => {
        window.dispatchEvent(new CustomEvent('terminal-log', {
          detail: {
            t: new Date().toLocaleTimeString('pt-BR'),
            tag: "EMIT",
            tagColor: "text-blue-500",
            msg: "Gatilho manual: Iniciando fluxo de consulta white-label..."
          }
        }));
      }
    },
    {
      icon: <Database className="h-4 w-4" />,
      label: "Mapear Payload",
      onClick: () => {
        window.dispatchEvent(new CustomEvent('terminal-log', {
          detail: {
            t: new Date().toLocaleTimeString('pt-BR'),
            tag: "MAP",
            tagColor: "text-cyan-400",
            msg: "Mapeando dados: Mesclando payload de Sollos + Serasa..."
          }
        }));
      }
    },
    {
      icon: <Shield className="h-4 w-4" />,
      label: "Verificar Ledger",
      onClick: () => {
        window.dispatchEvent(new CustomEvent('terminal-log', {
          detail: {
            t: new Date().toLocaleTimeString('pt-BR'),
            tag: "LEDGER",
            tagColor: "text-brand",
            msg: "Auditoria imutável: Débito de saldo via carteira multiempresa OK!"
          }
        }));
      }
    },
    {
      icon: <FileText className="h-4 w-4" />,
      label: "Renderizar PDF",
      onClick: () => {
        window.dispatchEvent(new CustomEvent('terminal-log', {
          detail: {
            t: new Date().toLocaleTimeString('pt-BR'),
            tag: "DONE",
            tagColor: "text-blue-500",
            msg: "Relatório gerado via editor visual (PDF em cache redistribuído)."
          }
        }));
      }
    }
  ];

  return (
    <section id="plataforma" className="relative py-6">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid lg:grid-cols-2 gap-8 items-stretch">
          
          {/* Coluna Esquerda - Workflow de Pipeline Fixo com Reorder local e BorderGlow */}
          <FadeUp>
            <BorderGlow 
              backgroundColor="var(--hud-bg-1)" 
              borderRadius={16}
              glowRadius={50}
              className="h-full w-full"
            >
              <HUDFrame className="p-6 md:p-8 h-full bg-transparent border-none">
                <BracketLabel>WORKFLOW</BracketLabel>
                <h3 className="mt-4 text-3xl md:text-4xl font-semibold tracking-[-0.03em] leading-tight">
                  PIPELINE<br />
                  <span className="brand-text">ESTRUTURADO</span>
                </h3>
                <p className="mt-3 text-sm text-muted-foreground max-w-md">
                  Da consulta crua ao relatório customizado. Arraste e solte os canos locais para testar a reordenação do motor White-Label imutável.
                </p>

                {/* Área de Reordenação de Etapas Locais */}
                <div className="mt-8 relative">
                  {/* Linha guia vertical com efeito de scanner cruzado premium (especificações DevTools) */}
                  <div className="absolute left-[19px] top-4 bottom-4 w-[2px] bg-stone-900/60 overflow-hidden rounded-full">
                    {/* Scanner Primário (Desce) */}
                    <div 
                      className="absolute left-0 w-full h-1/3 bg-gradient-to-b from-transparent via-brand to-transparent pointer-events-none"
                      style={{
                        animation: "scan-down 3.5s linear infinite",
                        filter: "drop-shadow(0 0 8px var(--brand))"
                      }}
                    />
                    {/* Scanner Secundário (Sobe) */}
                    <div 
                      className="absolute left-0 w-full h-1/4 bg-gradient-to-t from-transparent via-brand/20 to-transparent pointer-events-none"
                      style={{
                        animation: "scan-up 4.5s linear infinite"
                      }}
                    />
                  </div>

                  {/* Linha de progresso vertical ativa que brilha até a etapa atual */}
                  <div 
                    className="absolute left-[19px] top-4 w-[2px] bg-brand transition-all duration-500 ease-in-out rounded-full shadow-[0_0_10px_var(--brand)] z-0 pointer-events-none"
                    style={{
                      height: `${(activeStageIndex / (orderedStages.length - 1)) * 82}%`,
                      maxHeight: "calc(100% - 32px)"
                    }}
                  />
                  
                  <Reorder.Group 
                    axis="y" 
                    values={orderedStages} 
                    onReorder={handleReorder} 
                    className="space-y-4"
                  >
                    {orderedStages.map((s, idx) => {
                      const isActive = idx === activeStageIndex;
                      return (
                        <Reorder.Item
                          key={s.id}
                          value={s}
                          className={`group/step relative flex items-center gap-5 pl-1 py-3.5 pr-4 rounded-lg cursor-grab active:cursor-grabbing transition-all duration-300 z-10 ${
                            isActive
                              ? "border border-brand bg-card/96 dark:bg-stone-950/96 shadow-[0_0_24px_color-mix(in_srgb,_var(--brand)_12%,_transparent)] scale-[1.015]"
                              : "border border-hairline/40 bg-card/90 dark:bg-stone-950/90 hover:bg-accent/40 hover:border-brand/20"
                          }`}
                        >
                          {/* Linha horizontal conectora da linha vertical ao bloco numérico */}
                          <div 
                            className={`absolute left-4 w-6 h-[1px] transition-colors duration-500 -z-10 ${
                              idx <= activeStageIndex 
                                ? "bg-brand shadow-[0_0_6px_var(--brand)]" 
                                : "bg-stone-800/80 dark:bg-stone-900 group-hover/step:bg-stone-600"
                            }`} 
                          />

                          {/* Scanner de fundo individual sutil com delay dinâmico */}
                          <div className="absolute inset-0 rounded-lg overflow-hidden pointer-events-none -z-10">
                            <div 
                              className="absolute left-0 right-0 h-[40%] bg-gradient-to-b from-transparent via-brand/10 to-transparent transition-opacity duration-300"
                              style={{
                                animation: "scan-down 4s linear infinite",
                                animationDelay: `${idx * 0.4}s`,
                              }}
                            />
                          </div>

                          {/* Bloco numérico estruturado cyberpunk */}
                          <div
                            className={`w-10 h-10 flex items-center justify-center shrink-0 border relative overflow-hidden transition-all duration-550 rounded-sm ml-2 z-10 ${
                              isActive
                                ? "border-brand bg-black text-brand shadow-[0_0_20px_-2px_color-mix(in_srgb,var(--brand),transparent)] scale-110"
                                : "border-stone-800 dark:border-stone-800/80 bg-stone-950 text-stone-500 group-hover/step:border-stone-500 group-hover/step:text-stone-300"
                            }`}
                          >
                            {isActive && (
                              <>
                                <div className="absolute inset-0 bg-brand/10 animate-pulse" />
                                <div className="absolute top-0 left-0 w-full h-[1px] bg-brand/50" />
                                <div className="absolute bottom-0 right-0 w-full h-[1px] bg-brand/50" />
                              </>
                            )}
                            {isActive ? (
                              <Loader2 className="h-4.5 w-4.5 animate-spin relative z-10" />
                            ) : (
                              <span className="text-xs font-mono relative z-10 font-bold">{s.n}</span>
                            )}
                          </div>

                          <div className="flex-1 flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] group-hover/step:translate-x-2">
                            <span className={`mono text-[12px] tracking-[0.15em] uppercase font-semibold ${isActive ? "text-brand font-bold" : "text-stone-300 group-hover/step:text-white"}`}>
                              {s.title}
                            </span>
                            <span className="text-[12px] text-muted-foreground mt-0.5 group-hover/step:text-stone-400">{s.desc}</span>
                          </div>
                        </Reorder.Item>
                      );
                    })}
                  </Reorder.Group>
                </div>

                {/* Dock Inline Demonstrativo no final do Workflow */}
                <div className="mt-8 pt-6 border-t border-hairline">
                  <div className="mono text-[10px] tracking-[0.18em] uppercase text-muted-foreground mb-4">
                    SIMULADOR DE MOTOR OPERACIONAL
                  </div>
                  <Dock 
                    items={inlineDockItems} 
                    isInline={true} 
                    baseItemSize={40}
                    magnification={54}
                    distance={120}
                    panelHeight={52}
                    className="border border-hairline/60 bg-surface/20 rounded-xl"
                  />
                </div>

                <div className="mt-6 flex items-center justify-between mono text-[10px] tracking-[0.18em] uppercase">
                  <span className="text-muted-foreground">MODO: <span className="text-foreground">PROD</span></span>
                  <span className="rounded-sm border border-brand/40 px-2 py-0.5 text-brand bg-brand/5">FLAT_FIRST</span>
                </div>
              </HUDFrame>
            </BorderGlow>
          </FadeUp>

          {/* Coluna Direita - Integrações e Terminal de Auditoria (Fixos com BorderGlow) */}
          <div className="flex flex-col gap-6">
            
            {/* Bloco 1: Integrações */}
            <FadeUp delay={0.1}>
              <div id="integracoes" className="w-full">
                <BorderGlow 
                  backgroundColor="var(--hud-bg-1)" 
                  borderRadius={16}
                  glowRadius={40}
                  className="w-full"
                >
                  <HUDFrame className="p-6 md:p-8 bg-transparent border-none">
                    <div className="flex items-start justify-between">
                      <BracketLabel>INTEGRAÇÕES</BracketLabel>
                      <Grid3x3 className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="mt-4 flex items-end gap-4">
                      <span className="text-5xl md:text-6xl font-semibold tracking-[-0.03em] text-foreground">40+</span>
                      <span className="mb-2 text-sm text-muted-foreground">provedores unificados em SDK de-para único</span>
                    </div>

                    <div className="mt-6 grid grid-cols-4 gap-2">
                      {providers.map((p) => (
                        <div
                          key={p}
                          className="flex h-11 items-center justify-center rounded-lg border border-hairline bg-surface/30 mono text-[10px] tracking-[0.12em] uppercase text-foreground/80 hover:border-brand/40 hover:text-brand transition-colors cursor-default"
                        >
                          {p}
                        </div>
                      ))}
                    </div>

                    <div className="mt-6 grid grid-cols-3 gap-4 border-t border-hairline pt-4">
                      <Stat label="NORMALIZADOS" value="9 tipos" />
                      <Stat label="ESTÁGIOS" value="5 etapas" />
                      <Stat label="DEDUPLICAÇÃO" value="Ativa" />
                    </div>
                  </HUDFrame>
                </BorderGlow>
              </div>
            </FadeUp>

            {/* Bloco 2: Terminal de Auditoria */}
            <FadeUp delay={0.2}>
              <BorderGlow 
                backgroundColor="var(--hud-bg-1)" 
                borderRadius={16}
                glowRadius={40}
                className="w-full"
              >
                <TerminalOutput />
              </BorderGlow>
            </FadeUp>

          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="mono text-[9px] tracking-[0.15em] uppercase text-muted-foreground">{label}</div>
      <div className="mono text-[12px] text-brand font-semibold mt-1">{value}</div>
    </div>
  );
}
