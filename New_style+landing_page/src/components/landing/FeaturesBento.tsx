import { FadeUp, BracketLabel, SectionHeader, HUDFrame } from "./primitives";
import { motion } from "framer-motion";
import { LayoutGrid, Calculator, ShieldCheck, Users, Wallet, Layers } from "lucide-react";

export function FeaturesBento() {
  return (
    <section id="templates" className="py-24 border-t border-hairline">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeader
          eyebrow="04 — DIFERENCIAIS"
          title={<>Construído para <span className="brand-text">operações sérias.</span></>}
        />

        <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-4 auto-rows-[minmax(180px,auto)]">
          {/* Big: Templates drawer */}
          <FadeUp className="md:col-span-2 md:row-span-2">
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
              <p className="text-[14px] text-foreground/85 mt-2">
                Templates independentes de fornecedor — troca de provedor não quebra layouts. Estrutura plana normalizada com dedup automática.
              </p>
            </Card>
          </FadeUp>
        </div>
      </div>
    </section>
  );
}

function Card({ title, icon, children, accent }: { title: string; icon?: React.ReactNode; children: React.ReactNode; accent?: boolean }) {
  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ duration: 0.25 }}
      className={`group relative h-full rounded-md border ${accent ? "border-brand/30" : "border-hairline"} glass-card p-6 hover:border-brand/50 transition-colors overflow-hidden`}
    >
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none ${accent ? "bg-[radial-gradient(circle_at_top_right,var(--color-brand)/15%,transparent_60%)]" : ""}`} />
      <div className="flex items-center gap-2 mb-2">
        <span className="text-brand">{icon}</span>
        <BracketLabel>{title}</BracketLabel>
      </div>
      {children}
    </motion.div>
  );
}

function Pill({ children, mono = false }: { children: React.ReactNode; mono?: boolean }) {
  return (
    <span className={`inline-flex items-center rounded-sm border border-brand/40 bg-brand/10 px-1.5 py-0.5 text-brand ${mono ? "" : ""}`}>
      {children}
    </span>
  );
}
