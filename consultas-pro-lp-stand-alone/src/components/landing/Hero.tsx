import { useState } from "react";
import { LayoutGroup } from "framer-motion";
import { ArrowRight, BookOpen, ShieldCheck } from "lucide-react";
import { PulseDot, HUDFrame } from "./primitives";
import { PipelineCard } from "./PipelineCard";
import { InteractiveModularCard } from "./InteractiveModularCard";
import TextType from "@/components/ui/TextType";
import TrueFocus from "@/components/ui/TrueFocus";

interface HeroProps {
  activeStepIndex: number;
  setActiveStepIndex: (index: number) => void;
}

export function Hero({ activeStepIndex, setActiveStepIndex }: HeroProps) {
  const [layoutOrder, setLayoutOrder] = useState(["info", "mockup"]);
  const handleSwap = (draggedIdx: number, targetIdx: number, group: string) => {
    if (group === "hero-section") {
      setLayoutOrder((prev) => {
        const next = [...prev];
        const temp = next[draggedIdx];
        next[draggedIdx] = next[targetIdx];
        next[targetIdx] = temp;
        return next;
      });
    }
  };

  return (
    <section className="relative py-12 md:py-16 overflow-hidden min-h-[75vh] flex items-center">
      {/* Decorações Absolutas de Alta Fidelidade do Compozy */}
      {/* 1. Grid Blueprint matemático */}
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.16] mix-blend-overlay pointer-events-none z-0" />

      {/* 2. Textura de Ruído de Grão de alta opacidade */}
      <div className="absolute inset-0 bg-noise-pattern opacity-[0.06] mix-blend-overlay pointer-events-none z-0" />

      {/* 3. Glows Pulsantes de Acento (Homogêneos) */}
      <div className="absolute top-[-15%] right-[-10%] w-[550px] h-[550px] bg-pulse-glow pointer-events-none z-0 opacity-15 dark:opacity-60" />
      <div
        className="absolute bottom-[-15%] left-[-10%] w-[500px] h-[500px] bg-pulse-glow pointer-events-none z-0 opacity-10 dark:opacity-45"
        style={{ animationDelay: "-4s", filter: "blur(100px)" }}
      />

      {/* 4. Linhas de Varredura Laser nas extremidades */}
      <div className="absolute top-0 left-6 w-[2px] h-full overflow-hidden pointer-events-none z-0 bg-hairline/20">
        <div className="scanning-line-primary w-full" />
      </div>
      <div className="absolute top-0 right-6 w-[2px] h-full overflow-hidden pointer-events-none z-0 bg-hairline/20">
        <div
          className="scanning-line-secondary w-full"
          style={{ animationDelay: "-3.5s" }}
        />
      </div>

      {/* 5. Linha guia vertical estática na lateral esquerda */}
      <div className="absolute top-0 left-0 w-[1px] h-full bg-gradient-to-b from-transparent via-brand/35 to-transparent pointer-events-none z-0" />

      <div className="mx-auto max-w-7xl px-6 relative z-10 w-full">
        {/* Grade de 2 Colunas com Ancoragem de Grid Físico para Arrastar e Reordenar */}
        <LayoutGroup id="hero-layout-group">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch relative">
            {layoutOrder.map((componentId, i) => {
              if (componentId === "info") {
                return (
                  <div
                    key={componentId}
                    className="grid-anchor-slot min-h-[460px] rounded-md overflow-visible relative flex flex-col justify-center"
                    data-slot-index={i}
                    data-grid-group="hero-section"
                  >
                    {/* Etiqueta de Grid no fundo do slot */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none opacity-[0.12] z-0 select-none">
                      <span className="mono text-[10px] tracking-[0.2em] text-brand uppercase">
                        Módulo Informações
                      </span>
                      <span className="mono text-[8px] tracking-widest text-muted-foreground mt-1">
                        [ ANCORA_SLOT_0{i + 1} ]
                      </span>
                    </div>

                    <InteractiveModularCard
                      key="info"
                      dragGroup="hero-section"
                      index={i}
                      onSwap={handleSwap}
                      hoverScale={1.01}
                      useDragHandle={true}
                      className="p-6 md:p-8 bg-card/94 border border-hairline/40 rounded-md backdrop-blur-md shadow-2xl w-full h-full flex flex-col items-start text-left justify-center relative z-10"
                    >
                      <div className="flex flex-col items-start w-full">
                        <div className="inline-flex items-center gap-2.5 rounded-full border border-hairline bg-surface/40 px-3.5 py-1.5 backdrop-blur-xl shadow-[0_0_40px_-12px_var(--color-brand)] cursor-pointer mb-6 cursor-target">
                          <PulseDot />
                          <TextType
                            text={[
                              "Plataforma B2B e B2B2C de consultas",
                              "Relatórios personalizados com de-para",
                              "Controle de saldo e auditoria por emissão",
                              "API, widget e operação white-label",
                            ]}
                            typingSpeed={40}
                            pauseDuration={2800}
                            deletingSpeed={15}
                            className="text-[11px] tracking-[0.14em] uppercase text-brand font-mono font-bold"
                          />
                        </div>

                        <h1 className="text-[36px] md:text-[52px] font-medium leading-[1.08] tracking-[-0.03em] text-foreground cursor-default select-none text-left">
                          <span className="inline-block">
                            Consultas, relatórios
                          </span>{" "}
                          <span className="brand-text italic font-normal inline-block">
                            e white-label.
                          </span>
                          <br />
                          <span className="inline-block">
                            Tudo sob controle operacional.
                          </span>
                        </h1>

                        <p className="mt-6 text-[14px] md:text-[15px] leading-relaxed text-muted-foreground text-left max-w-lg cursor-default select-none">
                          Centralize provedores, componha consultas sob medida,
                          normalize payloads e entregue relatórios
                          personalizados por painel, API ou widget. Uma landing
                          precisa mostrar isso como plataforma de operação, não
                          como consulta avulsa.
                        </p>

                        <div className="mt-8 flex flex-wrap items-center gap-3">
                          <a
                            href="#cta"
                            className="group inline-flex items-center gap-2 rounded-md bg-brand px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-[0_0_36px_-8px_var(--color-brand)] hover:shadow-[0_0_48px_-4px_var(--color-brand)] transition-shadow cursor-target"
                          >
                            Solicitar demonstração
                            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                          </a>
                          <a
                            href="#plataforma"
                            className="inline-flex items-center gap-2 rounded-md border border-hairline bg-surface/60 px-4 py-2.5 text-sm text-foreground hover:bg-surface backdrop-blur transition-colors cursor-target"
                          >
                            <BookOpen className="h-4 w-4 text-muted-foreground" />
                            Ver fluxo operacional
                          </a>
                        </div>

                        <div className="mt-10 flex flex-wrap items-center gap-x-4 gap-y-2 mono text-[10px] tracking-[0.15em] uppercase text-muted-foreground">
                          <span>
                            <span className="text-foreground font-semibold">
                              API
                            </span>{" "}
                            + widget
                          </span>
                          <span className="text-hairline">•</span>
                          <span>
                            <span className="text-foreground font-semibold font-mono">
                              Templates
                            </span>{" "}
                            reutilizáveis
                          </span>
                          <span className="text-hairline">•</span>
                          <span>
                            <span className="text-foreground font-semibold font-mono">
                              Ledger
                            </span>{" "}
                            auditável
                          </span>
                        </div>
                      </div>
                    </InteractiveModularCard>
                  </div>
                );
              } else {
                return (
                  <div
                    key={componentId}
                    className="grid-anchor-slot min-h-[460px] rounded-md overflow-visible relative flex flex-col justify-center"
                    data-slot-index={i}
                    data-grid-group="hero-section"
                  >
                    {/* Etiqueta de Grid no fundo do slot */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none opacity-[0.12] z-0 select-none">
                      <span className="mono text-[10px] tracking-[0.2em] text-brand uppercase">
                        Painel de Emissão
                      </span>
                      <span className="mono text-[8px] tracking-widest text-muted-foreground mt-1">
                        [ ANCORA_SLOT_0{i + 1} ]
                      </span>
                    </div>

                    <InteractiveModularCard
                      key="mockup"
                      dragGroup="hero-section"
                      index={i}
                      onSwap={handleSwap}
                      hoverScale={1.01}
                      useDragHandle={true}
                      className="p-1 bg-transparent border-0 rounded-md w-full h-full relative z-10 flex flex-col justify-start"
                    >
                      <div className="magic-border-container rounded-md p-[1px] w-full">
                        <HUDFrame className="p-6 md:p-8 bg-card/94 backdrop-blur-md rounded-md shadow-2xl relative overflow-hidden">
                          <PipelineCard
                            activeStepIndex={activeStepIndex}
                            setActiveStepIndex={setActiveStepIndex}
                          />
                        </HUDFrame>
                      </div>

                      {/* TrueFocus flutuando abaixo do card no blueprint, centralizado verticalmente no espaço de baixo */}
                      <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px] mono tracking-[0.14em] uppercase text-muted-foreground">
                        {["Configurar", "Emitir", "Distribuir"].map((item) => (
                          <div
                            key={item}
                            className="flex items-center gap-2 rounded-sm border border-hairline bg-surface/35 px-3 py-2"
                          >
                            <ShieldCheck className="h-3 w-3 text-brand" />
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>

                      <div className="flex-grow flex items-center justify-center w-full mt-6 md:mt-8 py-4">
                        <TrueFocus
                          sentence="ORQUESTRAÇÃO • CUSTOMIZAÇÃO • GOVERNANÇA"
                          separator=" "
                          borderColor="var(--brand)"
                          glowColor="var(--brand-glow)"
                          animationDuration={0.8}
                          pauseBetweenAnimations={1.8}
                          blurAmount={2.5}
                          className="mini-true-focus"
                        />
                      </div>
                    </InteractiveModularCard>
                  </div>
                );
              }
            })}
          </div>
        </LayoutGroup>
      </div>
    </section>
  );
}
