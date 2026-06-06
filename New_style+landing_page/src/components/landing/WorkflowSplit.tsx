import { motion } from "framer-motion";
import { BracketLabel, FadeUp, HUDFrame } from "./primitives";
import { TerminalOutput } from "./TerminalOutput";
import { Grid3x3 } from "lucide-react";

const stages = [
  { n: "01", title: "PROVEDORES", desc: "Conecta APIs externas (SOLLOS, Serasa, Boa Vista, +37)" },
  { n: "02", title: "CONSULTAS", desc: "Define produtos consumíveis com preço por bloco" },
  { n: "03", title: "TIPOS", desc: "Motor de-para FLAT — normaliza payloads heterogêneos", active: true },
  { n: "04", title: "TEMPLATES", desc: "Drawer drag-and-drop com motor math() BR" },
  { n: "05", title: "EMISSÃO", desc: "Fila BullMQ + ledger transacional com estorno" },
];

const providers = ["SOLLOS", "SERASA", "BOA_VISTA", "SCPC", "SPC", "CONSULTAS+", "ASAAS", "+33"];

export function WorkflowSplit() {
  return (
    <section id="plataforma" className="relative py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid lg:grid-cols-2 gap-5">
          {/* Left — Workflow */}
          <FadeUp>
            <HUDFrame className="p-6 md:p-8 h-full">
              <BracketLabel>WORKFLOW</BracketLabel>
              <h3 className="mt-4 text-3xl md:text-4xl font-medium tracking-[-0.03em]">
                PIPELINE<br />
                <span className="brand-text">ESTRUTURADO</span>
              </h3>
              <p className="mt-3 text-sm text-muted-foreground max-w-sm">
                Da consulta crua ao PDF entregue em 5 etapas auditáveis, com saldo em carteira e estorno automático em falhas parciais.
              </p>

              <div className="mt-8 relative">
                {/* Linha guia vertical com efeito de scanner cruzado premium (especificações DevTools) */}
                <div className="absolute left-[14px] top-2 bottom-2 w-[2px] bg-stone-900/60 overflow-hidden rounded-full">
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
                <ul className="space-y-5">
                  {stages.map((s, i) => (
                    <motion.li
                      key={s.n}
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + i * 0.1, duration: 0.4 }}
                      className={`group/step relative flex items-center gap-4 pl-8 py-2.5 pr-4 border rounded-lg transition-all duration-300 z-10 ${
                        s.active
                          ? "border-brand/40 bg-brand/10 shadow-[0_0_24px_rgba(var(--primary),0.06)]"
                          : "border-hairline/40 bg-surface/40 hover:bg-surface/60 hover:border-brand/30"
                      }`}
                    >
                      {/* Scanner de fundo individual sutil com delay dinâmico */}
                      <div className="absolute inset-0 rounded-lg overflow-hidden pointer-events-none -z-10">
                        <div 
                          className="absolute left-0 right-0 h-[40%] bg-gradient-to-b from-transparent via-brand/10 to-transparent transition-opacity duration-300"
                          style={{
                            animation: "scan-down 4s linear infinite",
                            animationDelay: `${i * 0.4}s`,
                          }}
                        />
                      </div>

                      {/* Fundo pulsante de baixa opacidade para todos os cards */}
                      <div className={`absolute inset-0 rounded-lg pointer-events-none -z-10 animate-pulse transition-colors duration-300 ${
                        s.active 
                          ? "bg-brand/8" 
                          : "bg-brand/[0.015] group-hover/step:bg-brand/[0.035]"
                      }`} />

                      {/* Borda pulsante sutil com glow */}
                      <div className={`absolute -inset-px rounded-lg border pointer-events-none -z-10 animate-pulse transition-colors duration-300 ${
                        s.active 
                          ? "border-brand/40 shadow-[0_0_12px_rgba(var(--color-brand),0.1)]" 
                          : "border-brand/10 opacity-30 group-hover/step:opacity-75"
                      }`} />

                      <div
                        className={`absolute left-0 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-sm border transition-all duration-300 ${
                          s.active
                            ? "border-brand bg-brand/20 text-brand shadow-[0_0_12px_var(--color-brand)] scale-110"
                            : "border-hairline bg-background text-muted-foreground group-hover/step:border-brand/60"
                        } mono text-[10px]`}
                      >
                        {s.n}
                      </div>
                      <div className="flex-1 transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] group-hover/step:translate-x-2 pl-2">
                        <div className={`mono text-[12px] tracking-[0.15em] uppercase font-semibold ${s.active ? "text-brand" : "text-foreground"}`}>
                          {s.title}
                        </div>
                        <div className="text-[12px] text-muted-foreground mt-0.5">{s.desc}</div>
                      </div>
                    </motion.li>
                  ))}
                </ul>
              </div>

              <div className="mt-8 flex items-center justify-between border-t border-hairline pt-4 mono text-[10px] tracking-[0.18em] uppercase">
                <span className="text-muted-foreground">MODO: <span className="text-foreground">PROD</span></span>
                <span className="rounded-sm border border-hairline px-2 py-1 text-brand">FLAT_FIRST</span>
              </div>
            </HUDFrame>
          </FadeUp>

          {/* Right — Integrações + Terminal */}
          <div className="flex flex-col gap-5">
            <FadeUp delay={0.1}>
              <HUDFrame className="p-6 md:p-8">
                <div className="flex items-start justify-between">
                  <BracketLabel>INTEGRAÇÕES</BracketLabel>
                  <Grid3x3 className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="mt-5 flex items-end gap-4">
                  <span className="text-5xl md:text-6xl font-medium tracking-[-0.03em] text-foreground">40+</span>
                  <span className="mb-2 text-sm text-muted-foreground">fornecedores integrados via SDK unificado</span>
                </div>

                <div className="mt-6 grid grid-cols-4 gap-2">
                  {providers.map((p, i) => (
                    <motion.div
                      key={p}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05, duration: 0.3 }}
                      className="flex h-12 items-center justify-center rounded-sm border border-hairline bg-surface/60 mono text-[10px] tracking-[0.14em] uppercase text-foreground/80 hover:border-brand/50 hover:text-brand transition-colors"
                    >
                      {p}
                    </motion.div>
                  ))}
                </div>

                <div className="mt-6 grid grid-cols-3 gap-4 border-t border-hairline pt-4">
                  <Stat label="TIPOS" value="9 built-in" />
                  <Stat label="ETAPAS" value="5 stages" />
                  <Stat label="DEPS" value="Zero" />
                </div>
              </HUDFrame>
            </FadeUp>

            <FadeUp delay={0.2}>
              <TerminalOutput />
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
      <div className="mono text-[10px] tracking-[0.18em] uppercase text-muted-foreground">{label}</div>
      <div className="mono text-[13px] text-brand mt-1">{value}</div>
    </div>
  );
}

