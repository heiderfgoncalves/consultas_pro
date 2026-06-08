import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  DatabaseZap,
  FileText,
  GitBranch,
  ShieldCheck,
  Sparkles,
  WalletCards,
} from "lucide-react";

const flowSteps = [
  {
    label: "Entrada",
    title: "Dados chegam ao motor",
    text: "Documento, provedor, template e origem entram em uma fila auditável.",
    icon: DatabaseZap,
  },
  {
    label: "Validação",
    title: "Regras são checadas",
    text: "Saldo, token, permissões e fallback são conferidos antes da emissão.",
    icon: ShieldCheck,
  },
  {
    label: "Merge",
    title: "Payload vira inteligência",
    text: "O sistema normaliza campos e une respostas em uma base comercial usável.",
    icon: GitBranch,
  },
  {
    label: "Relatório",
    title: "Entrega pronta para venda",
    text: "O resultado sai em relatório, widget, PDF ou API com rastreio operacional.",
    icon: FileText,
  },
  {
    label: "Ledger",
    title: "Consumo registrado",
    text: "A emissão gera débito, histórico e visibilidade para empresa e parceiro.",
    icon: WalletCards,
  },
];

type ScanFlowCardsProps = {
  compact?: boolean;
  orientation?: "vertical" | "horizontal";
};

export function ScanFlowCards({ compact = false, orientation }: ScanFlowCardsProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  const resolvedOrientation = orientation ?? (compact ? "vertical" : "horizontal");
  const stepCount = flowSteps.length;
  const cssVars = useMemo(
    () =>
      ({
        "--flow-index": activeIndex,
        "--flow-count": stepCount,
      }) as CSSProperties,
    [activeIndex, stepCount],
  );

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % stepCount);
    }, 2350);

    return () => window.clearInterval(timer);
  }, [stepCount]);

  return (
    <section
      className={
        compact
          ? "px-4 py-7 scroll-mt-20"
          : "relative mx-auto max-w-7xl px-6 py-16 scroll-mt-28"
      }
    >
      <div
        className={`flow-shell ${compact ? "flow-shell-compact" : ""} flow-${resolvedOrientation}`}
        style={cssVars}
      >
        <div className="flow-shell-head">
          <div>
            <p className="mono flow-kicker">Linha viva de processamento</p>
            <h2 className="flow-title">
              A luz atravessa o processo, acende o card e pausa enquanto ele processa.
            </h2>
          </div>
          <div className="flow-live-pill" aria-hidden>
            <Sparkles className="h-4 w-4" />
            <span>SCAN</span>
          </div>
        </div>

        <div className="flow-sequence" aria-label="Fluxo animado de processamento">
          <div className="flow-track" aria-hidden>
            <div className="flow-track-progress" />
            <div className="flow-scanner-beam" />
          </div>

          {flowSteps.map((step, index) => {
            const Icon = step.icon;
            const isActive = activeIndex === index;
            const isDone = activeIndex > index;

            return (
              <article
                key={step.label}
                className={`flow-card ${isActive ? "is-active" : ""} ${isDone ? "is-done" : ""}`}
                aria-current={isActive ? "step" : undefined}
              >
                <div className="flow-node" aria-hidden>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flow-card-body">
                  <div className="flow-card-row">
                    <span className="mono flow-card-label">0{index + 1} / {step.label}</span>
                    <span className="mono flow-card-status">
                      {isActive ? "PROCESSANDO" : isDone ? "OK" : "AGUARDA"}
                    </span>
                  </div>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                  <div className="flow-process-bar" aria-hidden>
                    <span />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
