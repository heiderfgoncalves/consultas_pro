import { lazy, Suspense, useMemo } from "react";
import { Nav } from "@/components/landing/Nav";
import { Hero } from "@/components/landing/Hero";
import { FinalCTA } from "@/components/landing/FinalCTA";
import { Footer } from "@/components/landing/Footer";
import { BackgroundFX } from "@/components/landing/BackgroundFX";
import { ScanFlowCards } from "@/components/landing/ScanFlowCards";
import ThemeToggle from "@/components/ThemeToggle";
import Dock, { type DockItemData } from "@/components/ui/Dock";
import { CONFIG } from "@/config";
import {
  Cpu,
  FolderOpen,
  GitCommit,
  Home,
  LayoutGrid,
  Lock,
  LogIn,
  Unlock,
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
const Particles = lazy(() => import("@/components/ui/Particles"));
const TargetCursor = lazy(() => import("@/components/ui/TargetCursor"));

type RGB = { r: number; g: number; b: number };

type DesktopLandingProps = {
  activeSection: string;
  activeStepIndex: number;
  setActiveStepIndex: (index: number) => void;
  scrollProgress: number;
  rgbLocked: boolean;
  toggleRgbLock: () => void;
  customRGB: RGB;
  gradientColors: string[];
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
  scrollProgress,
  rgbLocked,
  toggleRgbLock,
  customRGB,
  gradientColors,
  enhancedEffectsEnabled,
}: DesktopLandingProps) {
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
        onClick: () => (window.location.href = `${CONFIG.systemUrl}/login`),
        className:
          "border-brand/35 bg-brand/5 hover:bg-brand/15 transition-all duration-300 cursor-target",
      },
      {
        icon: <UserPlus className="h-[18px] w-[18px] text-primary-foreground" />,
        label: "Criar Conta",
        onClick: () => (window.location.href = `${CONFIG.systemUrl}/cadastro`),
        className:
          "bg-brand text-primary-foreground border border-brand/20 hover:brightness-110 transition-all duration-300 cursor-target",
      },
    ],
    [activeSection],
  );

  return (
    <>
      <BackgroundFX />

      {enhancedEffectsEnabled && (
        <Suspense fallback={null}>
          <Particles
            particleColors={gradientColors}
            particleCount={48}
            particleSpread={7}
            speed={0.06}
            particleBaseSize={52}
            moveParticlesOnHover={true}
            particleHoverFactor={0.38}
            alphaParticles={true}
            disableRotation={true}
            sizeRandomness={0.6}
            cameraDistance={18}
            className="opacity-[0.28]"
          />
          <TargetCursor spinDuration={2.2} hideDefaultCursor={false} />
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
              ◆ SCROLL RGB OPERACIONAL ◆
            </span>
            <h4 className="mt-2 text-lg md:text-2xl font-semibold tracking-tight leading-snug">
              A identidade visual acompanha a leitura da página.{' '}
              <span className="text-muted-foreground">Use o cadeado lateral para congelar a cor quando encontrar o tom ideal.</span>
            </h4>
          </div>

          <div className="grid grid-cols-3 gap-2 mono text-[9px] tracking-[0.14em] uppercase text-muted-foreground">
            <div className="rounded-md border border-hairline bg-background/45 px-3 py-2 cursor-target">
              <span className="block text-brand font-bold">RGB LIVE</span>
              <span>Cor por scroll</span>
            </div>
            <div className="rounded-md border border-hairline bg-background/45 px-3 py-2 cursor-target">
              <span className="block text-brand font-bold">LOCK</span>
              <span>Trava manual</span>
            </div>
            <div className="rounded-md border border-hairline bg-background/45 px-3 py-2 cursor-target">
              <span className="block text-brand font-bold">FLOW</span>
              <span>Sem fim fixo</span>
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

      <RgbScrollController
        progress={scrollProgress}
        locked={rgbLocked}
        onToggleLock={toggleRgbLock}
        rgb={customRGB}
        activeSection={activeSection}
      />

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

function RgbScrollController({
  progress,
  locked,
  onToggleLock,
  rgb,
  activeSection,
}: {
  progress: number;
  locked: boolean;
  onToggleLock: () => void;
  rgb: RGB;
  activeSection: string;
}) {
  const percent = Math.round(progress * 100);
  const top = `${Math.min(86, Math.max(14, 10 + progress * 80))}dvh`;

  return (
    <div className="hidden md:block" aria-label="Controle RGB por rolagem">
      <div className="rgb-scroll-rail" aria-hidden>
        <div
          className="rgb-scroll-fill"
          style={{ transform: `scaleY(${Math.max(0.015, progress)})` }}
        />
      </div>

      <div className="rgb-scroll-menu" style={{ top }}>
        <ThemeToggle
          triggerClassName="rgb-scroll-orb cursor-target"
          contentSide="left"
          contentAlign="center"
        />

        <button
          type="button"
          onClick={onToggleLock}
          className={`rgb-scroll-lock cursor-target ${locked ? "is-locked" : ""}`}
          aria-pressed={locked}
          aria-label={locked ? "Destravar cor RGB do scroll" : "Travar cor RGB atual"}
        >
          {locked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
        </button>

        <div className="rgb-scroll-readout">
          <span className="rgb-scroll-status">{locked ? "LOCK" : "LIVE"}</span>
          <span className="rgb-scroll-percent">{percent}%</span>
          <span className="rgb-scroll-section">{activeSection}</span>
          <span className="rgb-scroll-rgb">
            {rgb.r}.{rgb.g}.{rgb.b}
          </span>
        </div>
      </div>
    </div>
  );
}
