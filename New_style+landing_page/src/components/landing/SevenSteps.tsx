import { motion } from "framer-motion";
import { Lightbulb, Search, Shuffle, FileText, Send, FileCheck, ShieldCheck } from "lucide-react";
import { SectionHeader } from "./primitives";

const steps = [
  { icon: Lightbulb, label: "IDEIA", desc: "Descreva o relatório que você quer entregar ao cliente final." },
  { icon: Search, label: "CONSULTA", desc: "Escolha os blocos de dados de qualquer fornecedor integrado." },
  { icon: Shuffle, label: "DE-PARA", desc: "Motor flat normaliza payloads heterogêneos em variáveis únicas." },
  { icon: FileText, label: "TEMPLATE", desc: "Monte o layout no drawer drag-and-drop com fórmulas math()." },
  { icon: Send, label: "EMISSÃO", desc: "Fila assíncrona BullMQ executa com débito transacional." },
  { icon: FileCheck, label: "ENTREGA", desc: "PDF + JSON disponíveis na carteira do usuário em <2s." },
  { icon: ShieldCheck, label: "AUDITORIA", desc: "Trilha completa LGPD com hash do payload e ledger imutável." },
];

export function SevenSteps() {
  return (
    <section id="pipeline" className="relative py-24 border-t border-hairline">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeader
          eyebrow="07 — DA IDEIA À ENTREGA"
          title={<>Sete etapas <span className="brand-text">estruturadas</span>.</>}
          sub="Cada emissão percorre o mesmo caminho determinístico — sem cliques mágicos, sem caixa-preta. Você acompanha cada estado no painel."
        />

        <div className="mt-16 relative">
          {/* Line */}
          <div className="absolute left-0 right-0 top-[26px] h-px bg-hairline hidden md:block" />
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 1.8, ease: "easeInOut" }}
            className="absolute left-0 right-0 top-[26px] h-px bg-gradient-to-r from-brand via-brand to-transparent origin-left hidden md:block"
          />

          <div className="grid grid-cols-2 md:grid-cols-7 gap-x-4 gap-y-10">
            {steps.map((s, i) => {
              const Icon = s.icon;
              return (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.1, duration: 0.4 }}
                  className="flex flex-col items-center text-center"
                >
                  <div className="relative">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2 + i * 0.1, type: "spring", stiffness: 300, damping: 20 }}
                      className="absolute -right-1 -top-1 z-10 mono text-[9px] tracking-[0.1em] bg-surface border border-hairline rounded-sm px-1 py-0.5 text-brand"
                    >
                      {i + 1}
                    </motion.div>
                    <div className="flex h-[52px] w-[52px] items-center justify-center rounded-md border border-hairline bg-background text-foreground hover:border-brand/60 hover:text-brand transition-colors">
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="mt-4 mono text-[11px] tracking-[0.18em] uppercase text-foreground">{s.label}</div>
                  <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground max-w-[160px]">{s.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

