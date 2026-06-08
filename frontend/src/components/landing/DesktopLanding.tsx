import { lazy, Suspense, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Nav } from "@/components/landing/Nav";
import { Hero } from "@/components/landing/Hero";
import { FinalCTA } from "@/components/landing/FinalCTA";
import { Footer } from "@/components/landing/Footer";
import { BackgroundFX } from "@/components/landing/BackgroundFX";
import { ScanFlowCards } from "@/components/landing/ScanFlowCards";
import Dock, { type DockItemData } from "@/components/ui/Dock";
import {
  Cpu,
  FolderOpen,
  GitCommit,
  Home,
  LayoutGrid,
  LogIn,
  UserPlus,
} from "lucide-react";

const WorkflowSplit = lazy(() =>
  import("@/components/landing/WorkflowSplit").then((module) => ({
    default: module.WorkflowSplit,
  })),
);
const SevenSteps = lazy(() =>
  import("@/components/landing/SevenSteps").then((module) => ({
    default: module.SevenSteps,
  })),
);
const FeaturesBento = lazy(() =>
  import("@/components/landing/FeaturesBento").then((module) => ({
    default: module.FeaturesBento,
  })),
);
const DossierSection = lazy(() =>
  import("@/components/landing/DossierSection").then((module) => ({
    default: module.DossierSection,
  })),
);
const LocalOrCloud = lazy(() =>
  import("@/components/landing/LocalOrCloud").then((module) => ({
    default: module.LocalOrCloud,
  })),
);
const FAQ = lazy(() =>
  import("@/components/landing/FAQ").then((module) => ({
    default: module.FAQ,
  })),
);
const TargetCursor = lazy(() => import("@/components/ui/TargetCursor"));

type DesktopLandingProps = {
  activeSection: string;
  activeStepIndex: number;
  setActiveStepIndex: (index: number) => void;
  enhancedEffectsEnabled: boolean;
};

function scrollToSection(id: string) {
  const element = document.getElementById(id);
  element?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function DesktopLanding({
  activeSection,
  activeStepIndex,
  setActiveStepIndex,
  enhancedEffectsEnabled,
}: DesktopLandingProps) {
  const navigate = useNavigate();

  const dockItems: DockItemData[] = useMemo(
    () => [
      {
        icon: (
          <Home
            className={`h-[18px] w-[18px] transition-colors ${activeSection === "top" ? "text-brand" : "text-muted-foreground"}`}
          />
        ),
        label: "Início",
        onClick: () => scrollToSection("top"),
        className: `cursor-target transition-all duration-300 ${
          activeSection === "top"
            ? "border-brand bg-brand/15 shadow-[0_0_14px_var(--brand)] scale-110"
            : "text-muted-foreground"
        }`,
      },
      {
        icon: (
          <Cpu
            className={`h-[18px] w-[18px] transition-colors ${activeSection === "plataforma" || activeSection === "integracoes" ? "text-brand" : "text-muted-foreground"}`}
          />
        ),
        label: "Plataforma",
        onClick: () => scrollToSection("plataforma"),
        className: `cursor-target transition-all duration-300 ${
          activeSection === "plataforma" || activeSection === "integracoes"
            ? "border-brand bg-brand/15 shadow-[0_0_14px_var(--brand)] scale-110"
            : "text-muted-foreground"
        }`,
      },
      {
        icon: (
          <GitCommit
            className={`h-[18px] w-[18px] transition-colors ${activeSection === "pipeline" ? "text-brand" : "text-muted-foreground"}`}
          />
        ),
        label: "Pipeline",
        onClick: () => scrollToSection("pipeline"),
        className: `cursor-target transition-all duration-300 ${
          activeSection === "pipeline"
            ? "border-brand bg-brand/15 shadow-[0_0_14px_var(--brand)] scale-110"
            : "text-muted-foreground"
        }`,
      },
      {
        icon: (
          <FolderOpen
            className={`h-[18px] w-[18px] transition-colors ${activeSection === "dossie" ? "text-brand" : "text-muted-foreground"}`}
          />
        ),
        label: "Dossiê",
        onClick: () => scrollToSection("dossie"),
        className: `cursor-target transition-all duration-300 ${
          activeSection === "dossie"
            ? "border-brand bg-brand/15 shadow-[0_0_14px_var(--brand)] scale-110"
            : "text-muted-foreground"
        }`,
      },
      {
        icon: (
          <LayoutGrid
            className={`h-[18px] w-[18px] transition-colors ${activeSection === "recursos" || activeSection === "templates" ? "text-brand" : "text-muted-foreground"}`}
          />
        ),
        label: "Recursos",
        onClick: () => scrollToSection("recursos"),
        className: `cursor-target transition-all duration-300 ${
          activeSection === "recursos" || activeSection === "templates"
            ? "border-brand bg-brand/15 shadow-[0_0_14px_var(--brand)] scale-110"
            : "text-muted-foreground"
        }`,
      },
      {
        icon: <LogIn className="h-[18px] w-[18px] text-brand" />,
        label: "Acessar Sistema",
        onClick: () => navigate("/login"),
        className:
          "border-brand/35 bg-brand/5 hover:bg-brand/15 transition-all duration-300 cursor-target",
      },
      {
        icon: <UserPlus className="h-[18px] w-[18px] text-primary-foreground" />,
        label: "Criar Conta",
        onClick: () => navigate("/cadastro"),
        className:
          "bg-brand text-primary-foreground border border-brand/20 hover:brightness-110 transition-all duration-300 cursor-target",
      },
    ],
    [activeSection, navigate],
  );

  return (
    <>
      <BackgroundFX />

      {enhancedEffectsEnabled && (
        <Suspense fallback={null}>
          <TargetCursor spinDuration={2.2} hideDefaultCursor={true} />
        </Suspense>
      )}

      <Nav activeSection={activeSection} />

      <Hero
        activeStepIndex={activeStepIndex}
        setActiveStepIndex={setActiveStepIndex}
      />

      <div className="relative border-y border-hairline bg-surface/45 dark:bg-[#05070b]/45 backdrop-blur-sm overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-brand/5 to-transparent pointer-events-none" />
        <div className="mx-auto max-w-7xl px-6 py-5 md:py-6 relative z-10 grid gap-4 md:grid-cols-[1.1fr_0.9fr] md:items-center">
          <div>
            <span className="mono text-[9px] md:text-[10px] tracking-[0.24em] text-brand uppercase font-bold">
              ◆ CONTROLE CUSTOMIZÁVEL ◆
            </span>
            <h4 className="mt-2 text-lg md:text-2xl font-semibold tracking-tight leading-snug">
              A identidade visual do app é totalmente customizável.{' '}
              <span className="text-muted-foreground">Clique no ícone de aparência na barra de navegação para modular o espectro de cor.</span>
            </h4>
          </div>

          <div className="grid grid-cols-3 gap-2 mono text-[9px] tracking-[0.14em] uppercase text-muted-foreground">
            <div className="rounded-md border border-hairline bg-background/45 px-3 py-2 cursor-target">
              <span className="block text-brand font-bold">RGB SPECTRAL</span>
              <span>Barra de cores</span>
            </div>
            <div className="rounded-md border border-hairline bg-background/45 px-3 py-2 cursor-target">
              <span className="block text-brand font-bold">PRESETS</span>
              <span>Subtemas prontos</span>
            </div>
            <div className="rounded-md border border-hairline bg-background/45 px-3 py-2 cursor-target">
              <span className="block text-brand font-bold">WHITE-LABEL</span>
              <span>Marca modular</span>
            </div>
          </div>
        </div>
      </div>

      <ScanFlowCards />

      <Suspense
        fallback={
          <div className="mx-auto max-w-7xl px-6 py-16">
            <div
              className="h-40 rounded-xl border border-hairline bg-surface/30 animate-pulse"
              aria-label="Carregando módulos da landing"
            />
          </div>
        }
      >
        <WorkflowSplit />
        <SevenSteps />
        <FeaturesBento />
        <DossierSection />
        <LocalOrCloud />
        <FAQ />
      </Suspense>

      <FinalCTA />
      <Footer />

      <div className="hidden md:block">
        <Dock
          items={dockItems}
          panelHeight={64}
          baseItemSize={48}
          magnification={62}
          distance={160}
        />
      </div>
    </>
  );
}
