import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { useSubTheme } from "@/hooks/use-subtheme";
import { useIsMobile } from "@/hooks/use-mobile";

const MobileLanding = lazy(() =>
  import("@/components/landing/MobileLanding").then((module) => ({
    default: module.MobileLanding,
  })),
);

const DesktopLanding = lazy(() =>
  import("@/components/landing/DesktopLanding").then((module) => ({
    default: module.DesktopLanding,
  })),
);

function useEnhancedEffects() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const isCoarsePointer = window.matchMedia("(pointer: coarse)").matches;
    const isSmallViewport = window.matchMedia("(max-width: 768px)").matches;

    if (prefersReducedMotion || isCoarsePointer || isSmallViewport) {
      setEnabled(false);
      return;
    }

    const schedule =
      window.requestIdleCallback ??
      ((cb: IdleRequestCallback) =>
        window.setTimeout(
          () =>
            cb({ didTimeout: false, timeRemaining: () => 0 } as IdleDeadline),
          700,
        ));
    const cancel = window.cancelIdleCallback ?? window.clearTimeout;
    const handle = schedule(() => setEnabled(true));

    return () => cancel(handle as number);
  }, []);

  return enabled;
}

const sectionIds = [
  "top",
  "scan-flow",
  "plataforma",
  "pipeline",
  "integracoes",
  "templates",
  "dossie",
  "white-label",
  "recursos",
  "cta",
];

export default function Index() {
  const { isAuthenticated, hydrated, hydrate } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { subTheme } = useSubTheme();
  const isMobile = useIsMobile();
  const enhancedEffectsEnabled = useEnhancedEffects();

  const [activeSection, setActiveSection] = useState("top");
  const activeSectionRef = useRef("top");
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [isHoveredHeroPipeline, setIsHoveredHeroPipeline] = useState(false);

  useEffect(() => {
    const handleHoverStart = () => setIsHoveredHeroPipeline(true);
    const handleHoverEnd = () => setIsHoveredHeroPipeline(false);
    window.addEventListener("hero-pipeline-hover-start", handleHoverStart);
    window.addEventListener("hero-pipeline-hover-end", handleHoverEnd);
    return () => {
      window.removeEventListener("hero-pipeline-hover-start", handleHoverStart);
      window.removeEventListener("hero-pipeline-hover-end", handleHoverEnd);
    };
  }, []);

  useEffect(() => {
    if (isMobile || isHoveredHeroPipeline) return;
    const interval = window.setInterval(() => {
      setActiveStepIndex((prev) => (prev + 1) % 6);
    }, 2800);
    return () => window.clearInterval(interval);
  }, [isHoveredHeroPipeline, isMobile]);

  useEffect(() => {
    const visibleSections = new Set<string>();

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        const id = entry.target.id;
        if (entry.isIntersecting) {
          visibleSections.add(id);
        } else {
          visibleSections.delete(id);
        }
      });

      if (visibleSections.size > 0) {
        let currentSection = activeSectionRef.current;
        for (const id of sectionIds) {
          if (visibleSections.has(id)) {
            currentSection = id;
            break;
          }
        }

        if (currentSection !== activeSectionRef.current) {
          activeSectionRef.current = currentSection;
          setActiveSection(currentSection);

          // Atualização imperativa apenas para o mobile section label
          const mobileActiveSectionLabel = document.getElementById("mobile-active-section-label");
          if (mobileActiveSectionLabel) {
            const navLabels: Record<string, string> = {
              top: "Início",
              plataforma: "Fluxo",
              templates: "Templates",
              dossie: "Dossiê",
              recursos: "FAQ",
            };
            mobileActiveSectionLabel.innerText = navLabels[currentSection] || "Live";
          }
        }
      }
    };

    const observer = new IntersectionObserver(observerCallback, {
      rootMargin: "-120px 0px -50% 0px",
      threshold: [0, 0.1],
    });

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!hydrated) {
      hydrate();
    }
  }, [hydrated, hydrate]);

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
          <span className="mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
            Inicializando Consultas PRO...
          </span>
        </div>
      </div>
    );
  }

  const forceLanding = searchParams.get("bypass") === "true" || searchParams.get("landing") === "true";

  if (isAuthenticated && !forceLanding) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div
      id="top"
      className="min-h-screen text-foreground selection:bg-brand/20 relative overflow-x-hidden pb-12"
    >
      <Suspense fallback={<LandingSkeleton mobile={isMobile} />}>
        {isMobile ? (
          <MobileLanding
            activeSection={activeSection}
          />
        ) : (
          <DesktopLanding
            activeSection={activeSection}
            activeStepIndex={activeStepIndex}
            setActiveStepIndex={setActiveStepIndex}
            enhancedEffectsEnabled={enhancedEffectsEnabled}
          />
        )}
      </Suspense>
    </div>
  );
}

function LandingSkeleton({ mobile }: { mobile: boolean }) {
  return (
    <div className={mobile ? "px-4 pt-20" : "mx-auto max-w-7xl px-6 pt-28"}>
      <div className="h-[520px] rounded-[2rem] border border-hairline bg-surface/30 animate-pulse" />
    </div>
  );
}
