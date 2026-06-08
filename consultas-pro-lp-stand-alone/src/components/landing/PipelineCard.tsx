import { useState } from "react";
import { motion, LayoutGroup } from "framer-motion";
import { FileText, Database, Shuffle, Calculator, Send, FileCheck } from "lucide-react";
import { PulseDot } from "./primitives";
import { InteractiveModularCard } from "./InteractiveModularCard";

const defaultSteps = [
  { icon: FileText, label: "TEMPLATE" },
  { icon: Database, label: "DADOS" },
  { icon: Shuffle, label: "DE-PARA" },
  { icon: Calculator, label: "FÓRMULAS" },
  { icon: Send, label: "EMISSÃO" },
  { icon: FileCheck, label: "ENTREGA" },
];

interface PipelineCardProps {
  activeStepIndex: number;
  setActiveStepIndex: (index: number) => void;
}

export function PipelineCard({ activeStepIndex, setActiveStepIndex }: PipelineCardProps) {
  const [steps, setSteps] = useState(defaultSteps);

  const handleSwap = (draggedIdx: number, targetIdx: number, group: string) => {
    if (group === "hero-pipeline") {
      setSteps((prev) => {
        const next = [...prev];
        const temp = next[draggedIdx];
        next[draggedIdx] = next[targetIdx];
        next[targetIdx] = temp;
        return next;
      });

      // Mapeia as posições originais das etapas movimentadas para sincronizar o activeStepIndex
      const draggedLabel = steps[draggedIdx].label;
      const targetLabel = steps[targetIdx].label;

      const originalDraggedIdx = defaultSteps.findIndex(ds => ds.label === draggedLabel);
      const originalTargetIdx = defaultSteps.findIndex(ds => ds.label === targetLabel);

      if (activeStepIndex === originalDraggedIdx) {
        setActiveStepIndex(originalTargetIdx);
      } else if (activeStepIndex === originalTargetIdx) {
        setActiveStepIndex(originalDraggedIdx);
      }
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="mono text-[11px] tracking-[0.18em] uppercase text-brand animate-glitch-hover cursor-pointer">
            &gt;&gt; CONSULTAS.PIPELINE
          </div>
          <div className="mt-1 mono text-[11px] tracking-[0.18em] uppercase text-muted-foreground">
            MOTOR DE EMISSÃO DE RELATÓRIOS (ARRASTE OU CLIQUE)
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Equalizer />
          <span className="inline-flex items-center gap-1.5 rounded-sm border border-brand/40 bg-brand/10 px-2 py-0.5 mono text-[10px] tracking-[0.18em] uppercase text-brand">
            <PulseDot />
            RUNNING
          </span>
        </div>
      </div>

      {/* Grid Físico Integrado com Slots de Ancoragem Tátil */}
      <div className="relative mt-4 min-h-[140px] overflow-visible">

        <LayoutGroup id="hero-pipeline-layout-group">
          <div className="relative z-10 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 md:gap-4">
            {steps.map((s, i) => {
              const Icon = s.icon;
              // Mapeamento lógico de volta ao índice canônico para determinar a ativação
              const originalStepIndex = defaultSteps.findIndex(ds => ds.label === s.label);
              const isActive = originalStepIndex === activeStepIndex;

              return (
                <div
                  key={s.label}
                  className="relative w-full h-[100px] grid-anchor-slot rounded-md"
                  data-slot-index={i}
                  data-grid-group="hero-pipeline"
                >
                  {/* Conector horizontal dinâmico entre slots (oculto no último item) */}
                  {i < steps.length - 1 && (
                    <div className="absolute top-[50px] left-[50%] w-[calc(100%+12px)] md:w-[calc(100%+16px)] h-1 hidden md:block z-0 pointer-events-none">
                      {/* Linha base inativa */}
                      <svg className="w-full h-full absolute inset-0">
                        <line x1="0" y1="2" x2="100%" y2="2" className="stroke-stone-200 dark:stroke-stone-900 stroke-[1]" />
                      </svg>
                      {/* Linha ativa com esteira de elétrons fluindo */}
                      {isActive && (
                        <svg className="w-full h-full absolute inset-0">
                          <line 
                            x1="0" 
                            y1="2" 
                            x2="100%" 
                            y2="2" 
                            className="stroke-brand stroke-[1.5] animate-pipeline-flow"
                            style={{ 
                              filter: "drop-shadow(0 0 3px var(--brand))",
                              strokeDasharray: "6 4"
                            }}
                          />
                        </svg>
                      )}
                    </div>
                  )}

                  {/* Visual discreto de blueprint no fundo do slot (visível quando o slot está vazio/puxado) */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none opacity-[0.18] z-0 select-none">
                    <span className="mono text-[8px] tracking-[0.1em] text-brand/60 uppercase">Etapa 0{i + 1}</span>
                    <span className="mono text-[6px] tracking-widest text-muted-foreground mt-0.5">[ SLOT_0{i + 1} ]</span>
                  </div>

                  {/* Cartão interativo arrastável e selecionável */}
                  <InteractiveModularCard
                    dragGroup="hero-pipeline"
                    index={i}
                    onSwap={handleSwap}
                    isActive={isActive}
                    showScanner={false}
                    hoverScale={1.05}
                    className="p-1 w-full h-full flex flex-col items-center justify-center rounded-md card-invisible"
                  >
                    <div
                      onClick={() => setActiveStepIndex(originalStepIndex)}
                      onMouseEnter={() => {
                        setActiveStepIndex(originalStepIndex);
                        window.dispatchEvent(new Event('hero-pipeline-hover-start'));
                      }}
                      onMouseLeave={() => {
                        window.dispatchEvent(new Event('hero-pipeline-hover-end'));
                      }}
                      className="w-full h-full flex flex-col items-center justify-center p-2 cursor-pointer relative z-10 select-none"
                    >
                      {/* Bloco do Ícone de Alta Fidelidade */}
                      <div className={`flex h-10 w-10 items-center justify-center rounded-sm border relative overflow-hidden transition-all duration-500 ${
                        isActive
                          ? "border-brand/60 bg-brand/10 dark:bg-black text-brand shadow-[0_0_20px_-2px_color-mix(in_srgb,var(--brand),transparent)]"
                          : "border-stone-200 dark:border-stone-800/80 bg-stone-100 dark:bg-stone-950 text-stone-500 dark:text-stone-500 group-hover/card:border-stone-400 group-hover/card:dark:border-stone-500 group-hover/card:text-stone-800 group-hover/card:dark:text-stone-300"
                      }`}>
                        {isActive && (
                          <>
                            <div className="absolute inset-0 bg-brand/15 dark:bg-brand/10 animate-pulse" />
                            <div className="absolute top-0 left-0 w-full h-[1px] bg-brand/50" />
                            <div className="absolute bottom-0 right-0 w-full h-[1px] bg-brand/50" />
                          </>
                        )}
                        <Icon className="h-5 w-5 relative z-10" />
                      </div>
                      
                      <div className={`mt-2.5 text-[9.5px] font-mono uppercase tracking-[0.14em] text-center transition-colors duration-500 ${
                        isActive ? "text-brand font-bold" : "text-stone-600 dark:text-stone-500 group-hover/card:text-stone-900 group-hover/card:dark:text-stone-300"
                      }`}>
                        {s.label}
                      </div>
                    </div>
                  </InteractiveModularCard>
                </div>
              );
            })}
          </div>
        </LayoutGroup>
      </div>

      {/* Footer stats */}
      <div className="mt-6 flex flex-wrap items-end justify-between gap-4 border-t border-hairline pt-4">
        <div className="flex gap-8">
          <Stat label="PROVEDORES" value="40+" />
          <Stat label="TIPOS" value="9" />
          <Stat label="UPTIME" value="99.9%" />
        </div>
        <span className="mono text-[10px] tracking-[0.18em] uppercase border border-hairline rounded-sm px-2 py-1 text-muted-foreground">
          ◆ Local-First
        </span>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground">{label}</div>
      <div className="mono text-lg text-brand mt-0.5">{value}</div>
    </div>
  );
}

function Equalizer() {
  return (
    <div className="flex items-end gap-0.5 h-4">
      {[0.4, 0.7, 0.9, 0.5, 0.8, 0.6, 0.3, 0.9, 0.5].map((h, i) => (
        <motion.span
          key={i}
          className="w-0.5 bg-brand/70"
          initial={{ height: 2 }}
          animate={{ height: [2, h * 16, 2] }}
          transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.08, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}
