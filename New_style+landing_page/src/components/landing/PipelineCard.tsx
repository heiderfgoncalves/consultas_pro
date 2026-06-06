import { motion } from "framer-motion";
import { FileText, Database, Shuffle, Calculator, Send, FileCheck } from "lucide-react";
import { PulseDot } from "./primitives";

const steps = [
  { icon: FileText, label: "TEMPLATE" },
  { icon: Database, label: "DADOS" },
  { icon: Shuffle, label: "DE-PARA" },
  { icon: Calculator, label: "FÓRMULAS" },
  { icon: Send, label: "EMISSÃO" },
  { icon: FileCheck, label: "ENTREGA" },
];

export function PipelineCard() {
  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="mono text-[11px] tracking-[0.18em] uppercase text-brand">
            &gt;&gt; CONSULTAS.PIPELINE
          </div>
          <div className="mt-1 mono text-[11px] tracking-[0.18em] uppercase text-muted-foreground">
            MOTOR DE EMISSÃO DE RELATÓRIOS
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

      {/* Pipeline rail */}
      <div className="relative mt-8 rounded-md border border-hairline bg-background/40 p-6 md:p-8">
        <svg className="absolute left-8 right-8 top-1/2 h-[2px] -translate-y-1/2 hidden md:block" viewBox="0 0 100 1" preserveAspectRatio="none" style={{ width: "calc(100% - 4rem)" }}>
          {/* Linha de fundo cinza sutil (especificações DevTools) */}
          <line
            x1="0" y1="0.5" x2="100" y2="0.5"
            stroke="rgba(28, 25, 23, 0.8)" strokeWidth="0.5"
          />
          {/* Linha ativa de progresso da marca animada de forma parcial correspondendo à etapa ativa */}
          <motion.line
            x1="0" y1="0.5" x2="100" y2="0.5"
            stroke="var(--color-brand)" strokeWidth="0.6" strokeDasharray="1.5 1.5"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 0.5 }}
            transition={{ duration: 2.0, ease: "easeInOut" }}
            style={{
              filter: "drop-shadow(0 0 4px var(--color-brand))"
            }}
          />
        </svg>
        <div className="relative grid grid-cols-3 md:grid-cols-6 gap-3 md:gap-4 z-10">
          {steps.map((s, i) => {
            const Icon = s.icon;
            const active = i === 2;
            return (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.12, duration: 0.4 }}
                className="group/card relative flex flex-col items-center justify-center border border-hairline bg-background/60 backdrop-blur-md rounded-md p-3 w-full h-[100px] transition-colors duration-200 z-10"
              >
                {/* Scanner vertical individual de fundo com delay dinâmico */}
                <div className="absolute inset-0 rounded-md overflow-hidden pointer-events-none z-0">
                  <div 
                    className="absolute left-0 right-0 h-[35%] bg-gradient-to-b from-transparent via-brand/10 to-transparent transition-opacity duration-300 opacity-60 group-hover/card:opacity-100"
                    style={{
                      animation: "scan-down 3.5s linear infinite",
                      animationDelay: `${i * 0.5}s`,
                    }}
                  />
                </div>

                {/* Fundo e borda pulsante com Glow sutil para todos os cards */}
                <div className="absolute inset-0 rounded-md bg-brand/[0.015] animate-pulse pointer-events-none z-0" />
                <div className="absolute -inset-px rounded-md border border-brand/25 animate-pulse pointer-events-none z-0 opacity-30 group-hover/card:opacity-100 transition-opacity duration-300" />

                <div className="relative flex flex-col items-center z-10">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-sm border transition-all duration-300 ${
                      active ? "border-brand bg-brand/15 text-brand shadow-[0_0_15px_var(--color-brand)]" : "border-hairline bg-surface text-muted-foreground hover:border-brand/40 hover:text-brand"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {active && (
                      <span className="absolute -inset-1 rounded-sm border border-brand/40 animate-pulse" />
                    )}
                  </div>
                  <div className="mt-2.5 mono text-[10px] tracking-[0.14em] uppercase text-foreground text-center font-medium">
                    {s.label}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
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

