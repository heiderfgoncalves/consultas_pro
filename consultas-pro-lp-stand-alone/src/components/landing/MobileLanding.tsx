import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowRight,
  BadgeCheck,
  BookOpenCheck,
  Boxes,
  ChevronRight,
  DatabaseZap,
  FileText,
  Fingerprint,
  Gauge,
  GripHorizontal,
  Home,
  Layers3,
  Lock,
  Menu,
  Palette,
  Unlock,
  WalletCards,
  X,
  Zap,
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { CONFIG } from "@/config";
import { ScanFlowCards } from "@/components/landing/ScanFlowCards";

const navItems = [
  { id: "top", label: "Início", icon: Home },
  { id: "plataforma", label: "Fluxo", icon: Zap },
  { id: "templates", label: "Templates", icon: Layers3 },
  { id: "dossie", label: "Dossiê", icon: FileText },
  { id: "recursos", label: "FAQ", icon: BookOpenCheck },
];

const mobileStages = [
  {
    id: "providers",
    label: "Provedores",
    detail: "APIs, bureaus, webhooks e fallback operacional.",
    metric: "+37",
    icon: DatabaseZap,
  },
  {
    id: "wallet",
    label: "Ledger",
    detail: "Saldo, débito, estorno e consumo por empresa.",
    metric: "AUDIT",
    icon: WalletCards,
  },
  {
    id: "merge",
    label: "Merge",
    detail: "Normalização de payloads em um resultado usável.",
    metric: "JSON",
    icon: Boxes,
  },
  {
    id: "report",
    label: "Relatório",
    detail: "Template comercial pronto para entregar ou revender.",
    metric: "PDF",
    icon: FileText,
  },
];

type MobileStage = (typeof mobileStages)[number];

const featureCards = [
  {
    title: "Consulta por template",
    text: "Crie jornadas prontas para CPF, CNPJ, crédito, restrição e parceiros.",
    icon: Layers3,
  },
  {
    title: "White-label real",
    text: "Widget, token, origem autorizada, marca do parceiro e rastreio por usuário.",
    icon: Fingerprint,
  },
  {
    title: "Governança financeira",
    text: "Controle saldo, custo por emissão, histórico, estorno e repasse.",
    icon: WalletCards,
  },
  {
    title: "Fila operacional",
    text: "Status claro: queued, processing, completed, partial ou failed.",
    icon: Gauge,
  },
];

const reportShots = [
  { src: "/assets/Image_1.jpg", label: "Ledger multiempresa" },
  { src: "/assets/Image_2.jpg", label: "Builder de templates" },
  { src: "/assets/Image_3.jpg", label: "Central de provedores" },
  { src: "/assets/image_4.jpg", label: "Pipelines e filas" },
  { src: "/assets/Image_5.jpg", label: "Métricas técnicas" },
];

const faqs = [
  {
    q: "É só um painel de consultas?",
    a: "Não. A proposta mobile reforça que o Consultas PRO é uma camada de operação: integra provedores, organiza saldo, compõe templates e distribui a entrega por painel, API ou widget.",
  },
  {
    q: "Dá para usar com marca própria?",
    a: "Sim. O discurso visual foca em white-label, token, origem autorizada e experiência embarcada para parceiro ou cliente final.",
  },
  {
    q: "A versão mobile ficou mais leve?",
    a: "Sim. O mobile usa animações CSS/transform, seções sob demanda e interações touch-first para evitar JS pesado no primeiro carregamento.",
  },
];


function scrollToMobile(id: string) {
  const element = document.getElementById(id === "top" ? "top" : id);
  element?.scrollIntoView({ behavior: "smooth", block: "start" });
}

type SortableBindings = ReturnType<typeof useSortable>;

type MobileLandingProps = {
  progress: number;
  locked: boolean;
  onToggleLock: () => void;
  rgb: { r: number; g: number; b: number };
  activeSection: string;
};

export function MobileLanding({
  progress,
  locked,
  onToggleLock,
  rgb,
  activeSection,
}: MobileLandingProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [stages, setStages] = useState<MobileStage[]>(mobileStages);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [mobileFlowIndex, setMobileFlowIndex] = useState(0);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 7 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 80, tolerance: 6 } }),
  );

  const progressPct = Math.round(progress * 100);
  const rgbLabel = `${rgb.r}.${rgb.g}.${rgb.b}`;

  const activeLabel = useMemo(() => {
    const item = navItems.find((nav) => nav.id === activeSection);
    return item?.label ?? "Live";
  }, [activeSection]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    const timer = window.setInterval(() => {
      setMobileFlowIndex((current) => (current + 1) % Math.max(stages.length, featureCards.length));
    }, 2100);
    return () => window.clearInterval(timer);
  }, [stages.length]);

  const stageFlowStyle = {
    "--mobile-flow-index": Math.min(mobileFlowIndex, stages.length - 1),
    "--mobile-flow-count": stages.length,
  } as CSSProperties;

  const featureFlowStyle = {
    "--mobile-flow-index": Math.min(mobileFlowIndex, featureCards.length - 1),
    "--mobile-flow-count": featureCards.length,
  } as CSSProperties;

  const activeStage = activeDragId
    ? stages.find((stage) => stage.id === activeDragId) ?? null
    : null;

  const handleDragStart = ({ active }: DragStartEvent) => {
    setActiveDragId(String(active.id));
  };

  const handleDragOver = ({ active, over }: DragOverEvent) => {
    if (!over || active.id === over.id) return;
    setStages((current) => {
      const from = current.findIndex((item) => item.id === active.id);
      const to = current.findIndex((item) => item.id === over.id);
      if (from < 0 || to < 0 || from === to) return current;
      return arrayMove(current, from, to);
    });
  };

  const handleDragEnd = (_event: DragEndEvent) => {
    setActiveDragId(null);
  };

  const handleDragCancel = () => {
    setActiveDragId(null);
  };


  const handleLock = () => {
    onToggleLock();
    if ("vibrate" in navigator) navigator.vibrate?.(18);
  };

  return (
    <main className="md:hidden relative min-h-screen overflow-x-hidden pb-28 pt-16">
      <div className="fixed inset-x-0 top-0 z-50 border-b border-hairline bg-background/88 backdrop-blur-2xl">
        <div className="h-[3px] bg-muted/25">
          <div
            className="h-full origin-left bg-[linear-gradient(90deg,var(--rgb-stop-a),var(--rgb-stop-b),var(--rgb-stop-c))] shadow-[0_0_18px_rgba(var(--scroll-rgb),0.45)]"
            style={{ transform: `scaleX(${Math.max(0.02, progress)})` }}
          />
        </div>

        <div className="flex h-14 items-center justify-between px-4">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="grid h-10 w-10 place-items-center rounded-xl border border-hairline bg-surface/70 text-foreground active:scale-95"
            aria-label="Abrir menu mobile"
          >
            <Menu className="h-4 w-4" />
          </button>

          <a
            href="#top"
            className="mono flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em]"
          >
            <span className="grid h-6 w-6 place-items-center rounded-md border border-brand/60 bg-brand/10 text-brand">
              ◆
            </span>
            <span>Consultas</span>
            <span className="text-brand">PRO</span>
          </a>

          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            <button
              type="button"
              onClick={handleLock}
              aria-pressed={locked}
              aria-label={locked ? "Destravar cor RGB" : "Travar cor RGB"}
              className={`grid h-10 w-10 place-items-center rounded-xl border transition active:scale-95 ${
                locked
                  ? "border-brand bg-brand text-primary-foreground shadow-[0_0_24px_rgba(var(--scroll-rgb),0.35)]"
                  : "border-brand/35 bg-brand/10 text-brand"
              }`}
            >
              {locked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      {menuOpen && (
        <div
          className="fixed inset-0 z-[70] bg-background/70 backdrop-blur-xl mobile-fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="m-3 rounded-3xl border border-hairline bg-[linear-gradient(180deg,var(--hud-bg-1),var(--hud-bg-2))] p-4 shadow-2xl mobile-slide-in">
            <div className="flex items-center justify-between">
              <div>
                <p className="mono text-[10px] uppercase tracking-[0.18em] text-brand">Menu mobile</p>
                <h2 className="mt-1 text-xl font-semibold tracking-[-0.04em]">Navegação rápida</h2>
              </div>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="grid h-10 w-10 place-items-center rounded-xl border border-hairline bg-surface/65"
                aria-label="Fechar menu mobile"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 grid gap-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      scrollToMobile(item.id);
                    }}
                    className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition active:scale-[0.99] ${
                      isActive
                        ? "border-brand bg-brand/12 text-foreground"
                        : "border-hairline bg-background/35 text-muted-foreground"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <Icon className="h-4 w-4 text-brand" />
                      {item.label}
                    </span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <section className="relative overflow-hidden px-4 pb-8 pt-8 scroll-mt-20">
        <div className="absolute inset-x-4 top-8 h-72 rounded-full bg-brand/12 blur-3xl" aria-hidden />
        <div className="relative rounded-[2rem] border border-brand/25 bg-[radial-gradient(circle_at_20%_0%,rgba(var(--scroll-rgb),0.25),transparent_36%),linear-gradient(180deg,var(--hud-bg-1),var(--hud-bg-2))] p-5 shadow-2xl">
          <div className="mono flex items-center justify-between text-[10px] uppercase tracking-[0.16em] text-brand">
            <span>Mobile v3</span>
            <span>{locked ? "RGB LOCK" : `RGB ${progressPct}%`}</span>
          </div>

          <h1 className="mt-6 text-[3.05rem] font-semibold leading-[0.88] tracking-[-0.09em]">
            Consultas, relatórios e white-label no bolso.
          </h1>
          <p className="mt-5 text-sm leading-6 text-muted-foreground">
            Uma versão mobile própria: leve, escaneável, com animações de varredura e interação pensada para toque.
          </p>

          <div className="mobile-mini-grid mt-5 grid grid-cols-2 gap-2" style={featureFlowStyle}>
            {[
              ["API", "Widget e token"],
              ["Ledger", "Saldo auditável"],
              ["Merge", "Payload único"],
              ["PDF", "Entrega comercial"],
            ].map(([title, text]) => (
              <div key={title} className="mobile-mini-card rounded-xl border border-hairline bg-background/45 p-2.5">
                <span className="mono text-[9px] font-bold text-brand">{title}</span>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>

          <a
            href={`${CONFIG.systemUrl}/cadastro`}
            className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-brand px-5 text-sm font-bold text-primary-foreground shadow-[0_0_32px_rgba(var(--scroll-rgb),0.34)] active:scale-[0.98]"
          >
            Solicitar demonstração
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </section>

      <ScanFlowCards compact />

      <section id="plataforma" className="relative px-4 py-8 scroll-mt-20">
        <div className="mb-5 mobile-reveal">
          <p className="mono text-[10px] font-bold uppercase tracking-[0.2em] text-brand">Fluxo touch-first</p>
          <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-[-0.055em]">Arraste pelo grip e reorganize em tempo real.</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            O drag mobile agora usa ordenação animada: o item já troca de posição durante o gesto e os outros cards se reorganizam suavemente.
          </p>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <SortableContext items={stages.map((stage) => stage.id)} strategy={verticalListSortingStrategy}>
            <div className="mobile-flow-list mobile-reorder-flow grid gap-2.5" style={stageFlowStyle}>
              {stages.map((stage, index) => (
                <SortableMobileStageCard
                  key={stage.id}
                  stage={stage}
                  index={index}
                  active={index === Math.min(mobileFlowIndex, stages.length - 1)}
                  done={index < Math.min(mobileFlowIndex, stages.length - 1)}
                />
              ))}
            </div>
          </SortableContext>

          <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" }}>
            {activeStage ? (
              <div className="mobile-drag-overlay" aria-hidden>
                <MobileStageCardContent stage={activeStage} index={0} compact overlay />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </section>

      <section id="templates" className="px-4 py-7 scroll-mt-20">
        <div className="rounded-[1.55rem] border border-hairline bg-[linear-gradient(180deg,var(--hud-bg-1),var(--hud-bg-2))] p-4 shadow-2xl mobile-reveal">
          <p className="mono text-[10px] font-bold uppercase tracking-[0.2em] text-brand">Templates e módulos</p>
          <h2 className="mt-2.5 text-[1.7rem] font-semibold leading-tight tracking-[-0.055em]">Cards menores, alinhados e conectados por varredura.</h2>

          <div className="mobile-flow-list mt-4 grid gap-2.5" style={featureFlowStyle}>
            {featureCards.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className={`mobile-feature-card ${index === Math.min(mobileFlowIndex, featureCards.length - 1) ? "is-active" : ""} ${index < Math.min(mobileFlowIndex, featureCards.length - 1) ? "is-done" : ""}`}
                >
                  <div className="flex gap-2.5">
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand">
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <h3 className="text-[14px] font-semibold tracking-[-0.03em]">{feature.title}</h3>
                      <p className="mt-1 text-[11.5px] leading-4 text-muted-foreground">{feature.text}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="dossie" className="px-4 py-8 scroll-mt-20">
        <div className="mobile-reveal">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="mono text-[10px] font-bold uppercase tracking-[0.2em] text-brand">Dossiê mobile</p>
              <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-[-0.055em]">Prints reais em carrossel leve.</h2>
            </div>
            <BadgeCheck className="mb-1 h-7 w-7 text-brand" />
          </div>

          <div className="-mx-4 mt-5 flex snap-x gap-3 overflow-x-auto px-4 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {reportShots.map((shot, index) => (
              <article key={shot.src} className="mobile-scan-card w-[76vw] shrink-0 snap-center overflow-hidden rounded-[1.25rem] border border-hairline bg-card/90 shadow-xl">
                <div className="aspect-[4/3] overflow-hidden bg-muted/30">
                  <img src={shot.src} alt={shot.label} loading="lazy" decoding="async" className="h-full w-full object-cover" />
                </div>
                <div className="p-3">
                  <p className="mono text-[8px] uppercase tracking-[0.18em] text-brand">Relatório 0{index + 1}</p>
                  <h3 className="mt-1 text-[14px] font-semibold tracking-[-0.03em]">{shot.label}</h3>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="white-label" className="px-4 py-8 scroll-mt-20">
        <div className="relative overflow-hidden rounded-[2rem] border border-brand/25 bg-brand/10 p-5 mobile-reveal">
          <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-brand/20 blur-3xl" />
          <p className="mono text-[10px] font-bold uppercase tracking-[0.2em] text-brand">White-label</p>
          <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-[-0.055em]">Seu parceiro vê sua marca, não a complexidade.</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Token, domínio, origem autorizada, rastreio por usuário final e entrega pronta para embed.
          </p>

          <div className="mobile-mini-grid mt-4 grid grid-cols-2 gap-2" style={featureFlowStyle}>
            {["TOKEN", "DOMÍNIO", "API", "WIDGET"].map((item) => (
              <div key={item} className="mobile-mini-card rounded-xl border border-brand/20 bg-background/45 px-2.5 py-2.5 text-center">
                <span className="mono text-[9px] font-bold tracking-[0.16em] text-brand">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="recursos" className="px-4 py-8 scroll-mt-20">
        <div className="mobile-reveal">
          <p className="mono text-[10px] font-bold uppercase tracking-[0.2em] text-brand">FAQ rápido</p>
          <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-[-0.055em]">Respostas curtas para decisão rápida.</h2>
          <div className="mt-5 grid gap-3">
            {faqs.map((item) => (
              <details key={item.q} className="group rounded-[1.35rem] border border-hairline bg-card/85 p-4 backdrop-blur-xl">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold tracking-[-0.02em]">
                  {item.q}
                  <ChevronRight className="h-4 w-4 shrink-0 text-brand transition group-open:rotate-90" />
                </summary>
                <p className="mt-3 text-[13px] leading-6 text-muted-foreground">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section id="cta" className="px-4 py-10 scroll-mt-20">
        <div className="rounded-[2rem] border border-brand/30 bg-[radial-gradient(circle_at_top_right,rgba(var(--scroll-rgb),0.25),transparent_46%),linear-gradient(180deg,var(--hud-bg-1),var(--hud-bg-2))] p-5 shadow-2xl mobile-reveal">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand text-primary-foreground shadow-[0_0_28px_rgba(var(--scroll-rgb),0.35)]">
            <Palette className="h-5 w-5" />
          </div>
          <h2 className="mt-5 text-4xl font-semibold leading-[0.98] tracking-[-0.07em]">Leve o Consultas PRO para sua operação.</h2>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            Solicite uma demonstração e veja como transformar consultas em uma experiência comercial, auditável e white-label.
          </p>
          <a
            href={`${CONFIG.systemUrl}/cadastro`}
            className="mt-6 inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-2xl bg-brand px-5 py-4 text-sm font-bold text-primary-foreground shadow-[0_0_34px_rgba(var(--scroll-rgb),0.35)] active:scale-[0.98]"
          >
            Criar conta / solicitar demo
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </section>

      <footer className="px-4 pb-4 text-center">
        <p className="mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">Consultas PRO • mobile performance v3</p>
      </footer>

      <div className="fixed bottom-3 left-3 right-3 z-50 rounded-[1.35rem] border border-hairline bg-background/88 p-1.5 shadow-2xl backdrop-blur-2xl">
        <div className="grid grid-cols-5 gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => scrollToMobile(item.id)}
                className={`flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 transition active:scale-95 ${
                  isActive ? "bg-brand text-primary-foreground" : "text-muted-foreground"
                }`}
                aria-label={`Ir para ${item.label}`}
              >
                <Icon className="h-4 w-4" />
                <span className="text-[9px] font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-1 flex items-center justify-between px-2 pb-1 mono text-[8px] uppercase tracking-[0.12em] text-muted-foreground">
          <span>{activeLabel}</span>
          <span>{locked ? "LOCK" : "LIVE"} • {rgbLabel}</span>
        </div>
      </div>
    </main>
  );
}

function SortableMobileStageCard({
  stage,
  index,
  active,
  done,
}: {
  stage: MobileStage;
  index: number;
  active: boolean;
  done: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stage.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  } as CSSProperties;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`mobile-stage-card mobile-drag-card ${active ? "is-active" : ""} ${done ? "is-done" : ""} ${isDragging ? "is-dragging" : ""}`}
    >
      <MobileStageCardContent
        stage={stage}
        index={index}
        dragAttributes={attributes}
        dragListeners={listeners}
      />
    </div>
  );
}

function MobileStageCardContent({
  stage,
  index,
  dragAttributes,
  dragListeners,
  overlay = false,
}: {
  stage: MobileStage;
  index: number;
  dragAttributes?: SortableBindings["attributes"];
  dragListeners?: SortableBindings["listeners"];
  compact?: boolean;
  overlay?: boolean;
}) {
  const Icon = stage.icon;

  return (
    <div className={`mobile-stage-card-inner ${overlay ? "is-overlay" : ""}`}>
      <button
        type="button"
        className="mobile-drag-handle grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-brand/25 bg-brand/10 text-brand touch-none"
        aria-label={`Arrastar ${stage.label}`}
        {...dragAttributes}
        {...dragListeners}
      >
        <GripHorizontal className="absolute h-3 w-3 translate-y-3.5 opacity-55" />
        <Icon className="h-4 w-4" />
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-[14px] font-semibold tracking-[-0.025em]">{stage.label}</h3>
          <span className="mono rounded-full border border-brand/25 bg-brand/10 px-2 py-0.5 text-[8px] font-bold text-brand">{stage.metric}</span>
        </div>
        <p className="mt-0.5 text-[11.5px] leading-4 text-muted-foreground">{stage.detail}</p>
      </div>
      <span className="mono text-[9px] text-muted-foreground">0{index + 1}</span>
    </div>
  );
}
