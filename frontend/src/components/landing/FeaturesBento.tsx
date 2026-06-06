import { FadeUp, BracketLabel, SectionHeader } from "./primitives";
import { LayoutGrid, Calculator, ShieldCheck, Users, Wallet, Layers } from "lucide-react";
import BorderGlow from "@/components/ui/BorderGlow";
import TextCursor from "@/components/ui/TextCursor";
import { useSubTheme } from "@/hooks/use-subtheme";

export function FeaturesBento() {
  return (
    <section id="recursos" className="py-6 border-t border-hairline">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeader
          eyebrow="04 — DIFERENCIAIS"
          title={<>Construído para <span className="brand-text">operações sérias.</span></>}
        />

        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4 auto-rows-[minmax(180px,auto)]">
          {/* Big: Templates drawer */}
          <FadeUp className="md:col-span-2 md:row-span-2">
            <div id="templates" className="h-full w-full">
              <Card title="TEMPLATES DRAWER" icon={<LayoutGrid className="h-4 w-4" />} accent>
                <h4 className="text-2xl md:text-3xl font-medium tracking-[-0.025em] text-foreground">
                  Drag-and-drop com<br />
                  <span className="brand-text">consumo estrito de variáveis.</span>
                </h4>
                <p className="mt-3 text-[14px] text-muted-foreground max-w-md">
                  Editor visual que aceita apenas as chaves "Para" ativas no de-para — chaves fantasmas
                  (como <span className="mono text-foreground">.quantidade</span>) simplesmente não aparecem
                  no autocomplete, eliminando relatórios quebrados.
                </p>

                {/* Mini mock */}
                <div className="mt-6 rounded-md border border-hairline bg-background/60 p-3 mono text-[11px] leading-relaxed">
                  <div className="text-muted-foreground">// template.md</div>
                  <div className="mt-1">
                    <span className="text-foreground/70">## Cliente:</span>{" "}
                    <Pill>{"{nome}"}</Pill>
                  </div>
                  <div>
                    <span className="text-foreground/70">CPF:</span>{" "}
                    <Pill>{"{cpf}"}</Pill> | Score:{" "}
                    <Pill>{"{score}"}</Pill>
                  </div>
                  <div>
                    <span className="text-foreground/70">Total devido:</span>{" "}
                    <Pill mono>{`math({pendencias.valor} * 1.1)`}</Pill>
                  </div>
                  <div className="mt-1 text-muted-foreground/70">→ R$ 16.365,08</div>
                </div>
              </Card>
            </div>
          </FadeUp>

          <FadeUp delay={0.05}>
            <Card title="MOTOR MATH()" icon={<Calculator className="h-4 w-4" />}>
              <p className="text-[14px] text-foreground/85 mt-2">
                Purificação dinâmica de strings BR — converte <span className="mono text-brand">"R$ 14.877,35"</span> e <span className="mono text-brand">"10,00%"</span> em float real antes de operar.
              </p>
            </Card>
          </FadeUp>

          <FadeUp delay={0.1}>
            <Card title="LGPD + AUDITORIA" icon={<ShieldCheck className="h-4 w-4" />}>
              <p className="text-[14px] text-foreground/85 mt-2">
                Ledger imutável com locking pessimista, trilha completa por consulta, retenção configurável e estorno automático em falhas parciais.
              </p>
            </Card>
          </FadeUp>

          <FadeUp delay={0.15}>
            <Card title="5 PERFIS DE ACESSO" icon={<Users className="h-4 w-4" />}>
              <div className="mt-3 flex flex-wrap gap-1.5 mono text-[10px] tracking-[0.14em] uppercase">
                {["ADMIN", "MASTER", "GESTOR", "OPERADOR", "INDIVIDUAL"].map((r) => (
                  <span key={r} className="rounded-sm border border-hairline bg-surface px-2 py-1 text-foreground/80">{r}</span>
                ))}
              </div>
              <p className="mt-3 text-[13px] text-muted-foreground">
                Capacidades finas via <span className="mono text-brand">PermissionGate</span> em cada rota e widget.
              </p>
            </Card>
          </FadeUp>

          <FadeUp delay={0.2}>
            <Card title="CARTEIRA COMPARTILHADA" icon={<Wallet className="h-4 w-4" />}>
              <p className="text-[14px] text-foreground/85 mt-2">
                Saldo único por company com gasto consolidado e gráficos por membro. Recargas PIX e cartão via gateway.
              </p>
            </Card>
          </FadeUp>

          <FadeUp delay={0.25}>
            <Card title="DE-PARA AGNÓSTICO" icon={<Layers className="h-4 w-4" />}>
              <TextCursor
                text={
                  <span className="mono text-[8px] tracking-wider text-brand font-bold bg-brand/10 dark:bg-[#0c111b] border border-brand/35 px-1.5 py-0.5 rounded-sm shadow-[0_0_10px_var(--brand)] select-none pointer-events-none uppercase">
                    BULLMQ
                  </span>
                }
                spacing={60}
                maxPoints={3}
                className="w-full h-full block"
              >
                <p className="text-[14px] text-foreground/85 mt-2">
                  Templates independentes de fornecedor — troca de provedor não quebra layouts. Estrutura plana normalizada com dedup automática.
                </p>
              </TextCursor>
            </Card>
          </FadeUp>
        </div>
      </div>
    </section>
  );
}

function Card({ title, icon, children, accent }: { title: string; icon?: React.ReactNode; children: React.ReactNode; accent?: boolean }) {
  const { subTheme } = useSubTheme();

  const themeColors: Record<string, string> = {
    classic: "#0070f3",
    cyberpunk: "#a855f7",
    oceanic: "#0d9488",
    emerald: "#10b981",
    minimal: "#a1a1aa",
  };

  const themeGlows: Record<string, string> = {
    classic: "212 100 48",
    cyberpunk: "271 91 65",
    oceanic: "174 100 41",
    emerald: "142 71 45",
    minimal: "240 5 65",
  };

  const themeColor = themeColors[subTheme] || "#0070f3";
  const themeGlow = themeGlows[subTheme] || "212 100 48";

  return (
    <BorderGlow
      borderRadius={8}
      backgroundColor="var(--hud-bg-1)"
      edgeSensitivity={32}
      glowRadius={30}
      glowIntensity={accent ? 1.1 : 0.6}
      className="h-full w-full"
    >
      <div className="p-6 h-full flex flex-col justify-between select-none">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-brand">{icon}</span>
            <BracketLabel>{title}</BracketLabel>
          </div>
          {children}
        </div>
      </div>
    </BorderGlow>
  );
}

function Pill({ children, mono = false }: { children: React.ReactNode; mono?: boolean }) {
  return (
    <span className={`inline-flex items-center rounded-sm border border-brand/40 bg-brand/10 px-1.5 py-0.5 text-brand ${mono ? "" : ""}`}>
      {children}
    </span>
  );
}
