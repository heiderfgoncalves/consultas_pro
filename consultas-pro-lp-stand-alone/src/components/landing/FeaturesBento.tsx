import { useEffect, useState, type CSSProperties } from "react";
import { FadeUp, BracketLabel, SectionHeader } from "./primitives";
import {
  LayoutGrid,
  Calculator,
  ShieldCheck,
  Users,
  Wallet,
  Layers,
} from "lucide-react";
import BorderGlow from "@/components/ui/BorderGlow";
import TextCursor from "@/components/ui/TextCursor";

export function FeaturesBento() {
  const [activeCard, setActiveCard] = useState(0);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    const timer = window.setInterval(() => {
      setActiveCard((current) => (current + 1) % 6);
    }, 2100);
    return () => window.clearInterval(timer);
  }, []);

  const flowStyle = {
    "--section-flow-index": activeCard,
    "--section-flow-count": 6,
  } as CSSProperties;

  return (
    <section id="recursos" className="py-6 border-t border-hairline">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeader
          eyebrow="04 — CAPACIDADES"
          title={
            <>
              Feito para{" "}
              <span className="brand-text">operação, venda e escala.</span>
            </>
          }
        />

        <div className="mt-10 scan-grid scan-grid-bento grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 auto-rows-[minmax(150px,auto)] md:auto-rows-[minmax(180px,auto)]" style={flowStyle}>
          {/* Big: Templates drawer */}
          <FadeUp className="md:col-span-2 md:row-span-2">
            <div id="templates" className="h-full w-full">
              <Card
                title="TEMPLATES DRAWER"
                icon={<LayoutGrid className="h-4 w-4" />}
                accent
                flowActive={activeCard === 0}
                flowDone={activeCard > 0}
              >
                <h4 className="text-2xl md:text-3xl font-medium tracking-[-0.025em] text-foreground">
                  Drag-and-drop com
                  <br />
                  <span className="brand-text">
                    consumo estrito de variáveis.
                  </span>
                </h4>
                <p className="mt-3 text-[14px] text-muted-foreground max-w-md">
                  Editor visual para montar relatórios entregáveis com blocos,
                  variáveis e fórmulas. O foco é sair do retorno bruto de API e
                  entregar um material claro, reutilizável e com identidade de
                  marca.
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
                    <Pill>{"{cpf}"}</Pill> | Score: <Pill>{"{score}"}</Pill>
                  </div>
                  <div>
                    <span className="text-foreground/70">Total devido:</span>{" "}
                    <Pill mono>{`math({pendencias.valor} * 1.1)`}</Pill>
                  </div>
                  <div className="mt-1 text-muted-foreground/70">
                    → R$ 16.365,08
                  </div>
                </div>
              </Card>
            </div>
          </FadeUp>

          <FadeUp delay={0.05}>
            <Card
              title="MOTOR MATH()"
              icon={<Calculator className="h-4 w-4" />}
              flowActive={activeCard === 1}
              flowDone={activeCard > 1}
            >
              <p className="text-[14px] text-foreground/85 mt-2">
                Motor de cálculo preparado para valores em formato brasileiro,
                percentuais e regras comerciais de composição do relatório.
              </p>
            </Card>
          </FadeUp>

          <FadeUp delay={0.1}>
            <Card
              title="AUDITORIA OPERACIONAL"
              icon={<ShieldCheck className="h-4 w-4" />}
              flowActive={activeCard === 2}
              flowDone={activeCard > 2}
            >
              <p className="text-[14px] text-foreground/85 mt-2">
                Registro por emissão, usuário, empresa, consumo e status
                operacional para gestão com rastreabilidade e previsibilidade.
              </p>
            </Card>
          </FadeUp>

          <FadeUp delay={0.15}>
            <Card title="EQUIPE E PERFIS" icon={<Users className="h-4 w-4" />} flowActive={activeCard === 3} flowDone={activeCard > 3}>
              <div className="mt-3 flex flex-wrap gap-1.5 mono text-[10px] tracking-[0.14em] uppercase">
                {["ADMIN", "MASTER", "GESTOR", "OPERADOR", "INDIVIDUAL"].map(
                  (r) => (
                    <span
                      key={r}
                      className="rounded-sm border border-hairline bg-surface px-2 py-1 text-foreground/80"
                    >
                      {r}
                    </span>
                  ),
                )}
              </div>
              <p className="mt-3 text-[13px] text-muted-foreground">
                Perfis de acesso para separar gestão, operação, parceiros e
                usuários finais sem misturar responsabilidades.
              </p>
            </Card>
          </FadeUp>

          <FadeUp delay={0.2}>
            <Card
              title="CARTEIRA COMPARTILHADA"
              icon={<Wallet className="h-4 w-4" />}
              flowActive={activeCard === 4}
              flowDone={activeCard > 4}
            >
              <p className="text-[14px] text-foreground/85 mt-2">
                Controle de saldo, consumo por emissão, repasses e histórico
                financeiro organizado por empresa e usuário.
              </p>
            </Card>
          </FadeUp>

          <FadeUp delay={0.25}>
            <Card
              title="DE-PARA AGNÓSTICO"
              icon={<Layers className="h-4 w-4" />}
              flowActive={activeCard === 5}
              flowDone={activeCard > 5}
            >
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
                  Normalize payloads de provedores diferentes em uma estrutura
                  consistente para reduzir retrabalho e evitar relatórios
                  inconsistentes.
                </p>
              </TextCursor>
            </Card>
          </FadeUp>
        </div>
      </div>
    </section>
  );
}

function Card({
  title,
  icon,
  children,
  accent,
  flowActive = false,
  flowDone = false,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  accent?: boolean;
  flowActive?: boolean;
  flowDone?: boolean;
}) {
  return (
    <BorderGlow
      borderRadius={8}
      backgroundColor="var(--hud-bg-1)"
      edgeSensitivity={32}
      glowRadius={30}
      glowIntensity={accent ? 1.1 : 0.6}
      className="h-full w-full"
    >
      <div data-cursor-target="true" className={`scan-grid-card ${flowActive ? "is-active" : ""} ${flowDone ? "is-done" : ""} p-4 md:p-6 h-full flex flex-col justify-between select-none cursor-target`}>
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

function Pill({
  children,
  mono = false,
}: {
  children: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-sm border border-brand/40 bg-brand/10 px-1.5 py-0.5 text-brand ${mono ? "" : ""}`}
    >
      {children}
    </span>
  );
}
