import { motion } from "framer-motion";
import { ArrowRight, BookOpen } from "lucide-react";
import { PulseDot, HUDFrame } from "./primitives";
import { PipelineCard } from "./PipelineCard";

export function Hero() {
  return (
    <section className="relative pt-32 pb-20 overflow-hidden">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="inline-flex items-center gap-2.5 rounded-full border border-hairline bg-surface/40 px-3.5 py-1.5 backdrop-blur-xl shadow-[0_0_40px_-12px_var(--color-brand)]"
          >
            <PulseDot />
            <span className="text-[11px] tracking-[0.14em] uppercase text-foreground/85">Plataforma de consultas de crédito</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.2, 0.7, 0.2, 1] }}
            className="mt-6 max-w-4xl text-[44px] md:text-[68px] font-medium leading-[1.02] tracking-[-0.035em] text-foreground"
          >
            Relatórios de crédito{" "}
            <span className="brand-text italic font-normal">que você desenha.</span>
            <br />
            Emitidos em segundos.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-6 max-w-2xl text-[15px] md:text-base leading-relaxed text-muted-foreground"
          >
            SaaS modular para consulta de dívidas, cadastro e crédito. Monte o layout do seu relatório,
            escolha apenas os blocos que você quer pagar, e emita com saldo em carteira — sem pacotes
            engessados, sem retrabalho.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-3"
          >
            <a
              href="#cta"
              className="group inline-flex items-center gap-2 rounded-md bg-brand px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-[0_0_36px_-8px_var(--color-brand)] hover:shadow-[0_0_48px_-4px_var(--color-brand)] transition-shadow"
            >
              Começar grátis
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </a>
            <a
              href="#docs"
              className="inline-flex items-center gap-2 rounded-md border border-hairline bg-surface/60 px-4 py-2.5 text-sm text-foreground hover:bg-surface backdrop-blur transition-colors"
            >
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              Ver documentação
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mono text-[11px] tracking-[0.18em] uppercase text-muted-foreground"
          >
            <span><span className="text-foreground">40+</span> fornecedores</span>
            <span className="text-hairline">•</span>
            <span><span className="text-foreground">9</span> tipos de consulta</span>
            <span className="text-hairline">•</span>
            <span><span className="text-foreground">&lt;250ms</span> latência</span>
            <span className="text-hairline">•</span>
            <span><span className="text-foreground">LGPD</span> compliant</span>
          </motion.div>
        </div>

        {/* Hero mockup */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.55, ease: [0.2, 0.7, 0.2, 1] }}
          className="mt-16 md:mt-20"
        >
          <HUDFrame className="p-6 md:p-8">
            <PipelineCard />
          </HUDFrame>
        </motion.div>
      </div>
    </section>
  );
}
