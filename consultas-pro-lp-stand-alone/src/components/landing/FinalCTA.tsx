import { ArrowRight } from "lucide-react";
import { FadeUp, BracketLabel } from "./primitives";
import { CONFIG } from "@/config";

export function FinalCTA() {
  return (
    <section id="cta" className="py-6">
      <div className="mx-auto max-w-5xl px-6">
        <FadeUp>
          <div className="relative overflow-hidden rounded-xl border border-hairline bg-surface/40 p-10 md:p-16 text-center">
            <span className="border-beam" />
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_center,var(--color-brand)/12%,transparent_60%)]" />
            <BracketLabel>
              PRONTO PARA TRANSFORMAR CONSULTAS EM PRODUTO
            </BracketLabel>
            <h2 className="mt-5 text-3xl md:text-5xl font-medium tracking-[-0.035em]">
              Centralize provedores, relatórios e white-label
              <br />
              <span className="brand-text">em uma operação vendável.</span>
            </h2>
            <p className="mt-5 text-[15px] text-muted-foreground max-w-xl mx-auto">
              A melhor próxima etapa é uma demonstração orientada: entender seus
              provedores, seu fluxo comercial, seu modelo de cobrança e o tipo
              de relatório que você quer entregar.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <a
                href={`${CONFIG.systemUrl}/cadastro`}
                className="group inline-flex items-center gap-2 rounded-md bg-brand px-5 py-3 text-sm font-medium text-primary-foreground shadow-[0_0_40px_-6px_var(--color-brand)] hover:shadow-[0_0_60px_-2px_var(--color-brand)] transition-shadow cursor-target"
              >
                Solicitar demonstração
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </a>
              <a
                href="mailto:comercial@consultaspro.com.br?subject=Demonstra%C3%A7%C3%A3o%20Consultas%20PRO"
                className="inline-flex items-center gap-2 rounded-md border border-hairline bg-background/60 px-5 py-3 text-sm text-foreground hover:bg-surface transition-colors cursor-target"
              >
                Falar com vendas
              </a>
            </div>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-1 mono text-[10px] tracking-[0.18em] uppercase text-muted-foreground">
              <span>DEMO ASSISTIDA</span>
              <span className="text-hairline">•</span>
              <span>WHITE-LABEL</span>
              <span className="text-hairline">•</span>
              <span>API + WIDGET</span>
            </div>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}
