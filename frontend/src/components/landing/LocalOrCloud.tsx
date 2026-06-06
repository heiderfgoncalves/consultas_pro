import { FadeUp, BracketLabel, HUDFrame, PulseDot } from "./primitives";
import { Check } from "lucide-react";

const items = [
  { title: "SEU DOMÍNIO", desc: "app.cliente.com via CNAME" },
  { title: "TEMA PRÓPRIO", desc: "Cores, logo e favicon por tenant" },
  { title: "ISOLAMENTO", desc: "Dados, carteira e usuários separados" },
  { title: "PRICING POR TENANT", desc: "Sua margem em cada bloco de consulta" },
];

const bullets = [
  "Multi-tenant com isolamento de banco por company",
  "Domínios customizados (CNAME) com SSL automático",
  "Tema, logotipo e favicon configuráveis por parceiro",
  "Tabela de preços global, por company ou por parceiro",
];

export function LocalOrCloud() {
  return (
    <section className="py-6">
      <div className="mx-auto max-w-7xl px-6 grid lg:grid-cols-2 gap-5 items-stretch">
        <FadeUp>
          <HUDFrame className="p-6 md:p-10 h-full">
            <div className="flex items-center justify-center mb-6">
              <span className="inline-flex items-center gap-2 rounded-sm border border-brand/40 bg-brand/10 px-3 py-1 mono text-[10px] tracking-[0.2em] uppercase text-brand">
                <PulseDot /> WHITE-LABEL READY
              </span>
            </div>
            <div className="space-y-2 max-w-md mx-auto">
              {items.map((it, i) => (
                <div
                  key={it.title}
                  className={`flex items-center justify-between rounded-sm border ${
                    i === 0 || i === 3 ? "border-brand/40 bg-brand/5" : "border-hairline bg-surface/40"
                  } px-4 py-3.5`}
                >
                  <div>
                    <div className="mono text-[11px] tracking-[0.18em] uppercase text-foreground">{it.title}</div>
                    <div className="text-[12px] text-muted-foreground mt-0.5">{it.desc}</div>
                  </div>
                  <span className={`h-2 w-2 rounded-full ${i === 0 || i === 3 ? "bg-brand" : "bg-muted"}`} />
                </div>
              ))}
            </div>
            <div className="mt-8 flex items-center justify-center gap-6 mono text-[10px] tracking-[0.18em] uppercase text-muted-foreground">
              <span>MULTI-TENANT</span>
              <span className="text-hairline">|</span>
              <span>CNAME SSL</span>
              <span className="text-hairline">|</span>
              <span>PER-TENANT PRICING</span>
            </div>
          </HUDFrame>
        </FadeUp>

        <FadeUp delay={0.1}>
          <div className="h-full flex flex-col justify-center px-2 md:px-6">
            <div className="flex items-center gap-3 mono text-[11px] tracking-[0.18em] uppercase text-muted-foreground">
              <span>06</span>
              <span className="h-px w-8 bg-hairline" />
              <span>WHITE-LABEL</span>
            </div>
            <h3 className="mt-5 text-3xl md:text-5xl font-medium tracking-[-0.03em]">
              Seu produto,<br />
              <span className="brand-text">sua marca,</span> seu domínio.
            </h3>
            <p className="mt-5 text-[15px] leading-relaxed text-muted-foreground max-w-lg">
              Parceiros comerciais operam o Consultas PRO com identidade própria — domínio,
              tema, logotipo e tabela de preços. Cada tenant é um silo: dados, carteira e usuários
              isolados, sem vazamento entre marcas.
            </p>

            <div className="mt-8 space-y-3">
              {bullets.map((b) => (
                <div key={b} className="flex items-start gap-3">
                  <span className="mt-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand/15 text-brand">
                    <Check className="h-2.5 w-2.5" />
                  </span>
                  <span className="text-[14px] text-foreground/85">{b}</span>
                </div>
              ))}
            </div>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}
