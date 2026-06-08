import { FadeUp, BracketLabel } from "./primitives";
import { Copy } from "lucide-react";

const cards = [
  { tag: "WEB", recommended: true, snippet: "app.consultaspro.com", note: "Acesse direto pelo navegador" },
  { tag: "API REST", snippet: "curl https://api.consultaspro.com/v1/emit", note: "Endpoint público com OpenAPI" },
  { tag: "SDK NODE", snippet: "npm install @consultas-pro/sdk", note: "Cliente TypeScript tipado" },
  { tag: "WHITE-LABEL", snippet: "vendas@consultaspro.com", note: "Domínio + tema próprios" },
];

export function StartHere() {
  return (
    <section id="docs" className="py-14 border-t border-hairline">
      <div className="mx-auto max-w-7xl px-6">
        <FadeUp className="flex justify-center">
          <span className="inline-flex items-center rounded-sm border border-hairline bg-surface px-3 py-1 mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
            COMECE AQUI
          </span>
        </FadeUp>
        <FadeUp delay={0.05}>
          <h2 className="mt-6 text-center text-4xl md:text-6xl font-medium tracking-[-0.035em]">
            Comece em <span className="brand-text italic font-normal">segundos.</span>
          </h2>
        </FadeUp>
        <FadeUp delay={0.1}>
          <p className="mt-4 text-center text-[15px] text-muted-foreground max-w-xl mx-auto">
            Quatro caminhos, zero ceremonia. Crie sua conta, conecte um provedor e emita seu primeiro relatório.
          </p>
        </FadeUp>

        <div className="mt-14 grid md:grid-cols-2 gap-4">
          {cards.map((c, i) => (
            <FadeUp key={c.tag} delay={0.1 + i * 0.05}>
              <div className="group rounded-md border border-hairline bg-surface/40 p-5 hover:border-brand/40 transition-colors">
                <div className="flex items-center justify-between">
                  <BracketLabel>{c.tag}</BracketLabel>
                  {c.recommended && (
                    <span className="rounded-sm border border-brand/40 bg-brand/15 px-2 py-0.5 mono text-[9px] tracking-[0.18em] uppercase text-brand">
                      RECOMENDADO
                    </span>
                  )}
                </div>
                <div className="mt-4 flex items-center justify-between gap-3 rounded-sm border border-hairline bg-background/60 px-3 py-2.5">
                  <span className="mono text-[12.5px] text-foreground/90 truncate">
                    <span className="text-brand">$</span> {c.snippet}
                  </span>
                  <button className="text-muted-foreground hover:text-brand transition-colors cursor-target">
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="mt-3 text-[12.5px] text-muted-foreground">{c.note}</p>
              </div>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}
