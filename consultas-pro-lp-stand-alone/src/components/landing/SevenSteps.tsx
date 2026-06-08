import { useEffect, useState, type CSSProperties } from "react";
import { motion, LayoutGroup } from "framer-motion";
import {
  Lightbulb,
  Search,
  Shuffle,
  FileText,
  Send,
  FileCheck,
  ShieldCheck,
} from "lucide-react";
import { SectionHeader, FadeUp } from "./primitives";
import { InteractiveModularCard } from "./InteractiveModularCard";

const stepsData = [
  {
    icon: Lightbulb,
    label: "IDEIA",
    desc: "Descreva o relatório que você quer entregar ao cliente final.",
  },
  {
    icon: Search,
    label: "CONSULTA",
    desc: "Escolha os blocos de dados de qualquer fornecedor integrado.",
  },
  {
    icon: Shuffle,
    label: "DE-PARA",
    desc: "Motor flat normaliza payloads heterogêneos em variables únicas.",
  },
  {
    icon: FileText,
    label: "TEMPLATE",
    desc: "Monte o layout no drawer drag-and-drop com fórmulas math().",
  },
  {
    icon: Send,
    label: "EMISSÃO",
    desc: "Fila assíncrona BullMQ executa com débito transacional.",
  },
  {
    icon: FileCheck,
    label: "ENTREGA",
    desc: "PDF + JSON disponíveis na carteira do usuário em <2s.",
  },
  {
    icon: ShieldCheck,
    label: "AUDITORIA",
    desc: "Trilha completa LGPD com hash do payload e ledger imutável.",
  },
];

export function SevenSteps() {
  const [orderedSteps, setOrderedSteps] = useState(stepsData);
  const [activeFlowIndex, setActiveFlowIndex] = useState(0);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    const timer = window.setInterval(() => {
      setActiveFlowIndex((current) => (current + 1) % stepsData.length);
    }, 2150);
    return () => window.clearInterval(timer);
  }, []);

  const flowStyle = {
    "--section-flow-index": activeFlowIndex,
    "--section-flow-count": stepsData.length,
  } as CSSProperties;

  // Manipulador de swap de cards entre os slots
  const handleSwap = (draggedIdx: number, targetIdx: number) => {
    setOrderedSteps((prev) => {
      const next = [...prev];
      const temp = next[draggedIdx];
      next[draggedIdx] = next[targetIdx];
      next[targetIdx] = temp;
      return next;
    });
  };

  return (
    <section id="pipeline" className="relative py-6 border-t border-hairline">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeader
          eyebrow="07 — DA IDEIA À ENTREGA"
          title={
            <>
              Da configuração à entrega{" "}
              <span className="brand-text">sem caixa-preta</span>.
            </>
          }
          sub="A jornada comunica o valor do produto: configurar provedores, emitir consultas, consolidar dados, gerar relatório, distribuir com marca e auditar consumo."
        />

        <div className="mt-10 relative seven-flow-shell" style={flowStyle}>
          {/* Linha base inativa de background */}
          <div
            className="absolute left-0 right-0 top-[26px] h-px bg-hairline hidden md:block"
            style={{ zIndex: 0 }}
          />

          {/* Linha com fluxo ativo de varredura horizontal entre os cards */}
          <div className="section-flow-rail section-flow-rail-horizontal hidden md:block" aria-hidden>
            <span className="section-flow-progress" />
            <span className="section-flow-beam" />
          </div>

          <LayoutGroup id="seven-steps-layout-group">
            <div className="grid grid-cols-2 md:grid-cols-7 gap-x-3 md:gap-x-4 gap-y-8 md:gap-y-10 relative z-10">
              {orderedSteps.map((s, i) => {
                const Icon = s.icon;
                return (
                  <FadeUp key={s.label} delay={0.1 + i * 0.1}>
                    <div
                      className="relative w-full h-full grid-anchor-slot min-h-[190px] rounded-md"
                      data-slot-index={i}
                      data-grid-group="seven-steps"
                    >
                      {/* Moldura indicadora pontilhada premium sci-fi */}
                      <div className="absolute inset-0 border border-dashed border-brand/20 bg-brand/[0.02] rounded-md flex flex-col items-center justify-center pointer-events-none z-0 select-none transition-all duration-300 group-hover:border-brand/35">
                        <span className="mono text-[9px] tracking-[0.2em] text-brand/50 uppercase">
                          Etapa 0{i + 1}
                        </span>
                        <span className="mono text-[7px] tracking-widest text-muted-foreground/60 mt-1">
                          [ BERÇO_ÂNCORA ]
                        </span>
                      </div>

                      {/* O Cartão Interativo modular que pode ser arrastado e solto */}
                      <InteractiveModularCard
                        key={s.label}
                        dragGroup="seven-steps"
                        index={i}
                        onSwap={handleSwap}
                        isActive={i === activeFlowIndex}
                        showScanner={i === activeFlowIndex}
                        useDragHandle
                        className="p-3 md:p-4 w-full h-full flex flex-col items-center text-center bg-background/50 hover:bg-background/80 transition-colors duration-300 z-10"
                      >
                        <div className="scan-grid-process" aria-hidden><span /></div>
                        <div className="relative">
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{
                              delay: 0.2 + i * 0.1,
                              type: "spring",
                              stiffness: 300,
                              damping: 20,
                            }}
                            className="absolute -right-1 -top-1 z-10 mono text-[9px] tracking-[0.1em] bg-surface border border-hairline rounded-sm px-1 py-0.5 text-brand"
                          >
                            {i + 1}
                          </motion.div>
                          <div className="flex h-[52px] w-[52px] items-center justify-center rounded-md border border-hairline bg-background text-foreground hover:border-brand/60 hover:text-brand transition-colors">
                            <Icon className="h-5 w-5" />
                          </div>
                        </div>
                        <div className="mt-4 mono text-[11px] tracking-[0.18em] uppercase text-foreground">
                          {s.label}
                        </div>
                        <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground max-w-[160px]">
                          {s.desc}
                        </p>
                      </InteractiveModularCard>
                    </div>
                  </FadeUp>
                );
              })}
            </div>
          </LayoutGroup>
        </div>
      </div>
    </section>
  );
}
