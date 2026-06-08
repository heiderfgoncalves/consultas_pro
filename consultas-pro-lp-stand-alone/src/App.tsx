import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
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

const hslToRgb = (h: number, s: number, l: number) => {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return {
    r: Math.round(255 * f(0)),
    g: Math.round(255 * f(8)),
    b: Math.round(255 * f(4)),
  };
};

const scrollHueSequences: Record<string, number[]> = {
  classic: [212, 142, 0],
  cyberpunk: [32, 0, 142],
  oceanic: [174, 212, 142],
  emerald: [142, 212, 0],
  minimal: [0, 142, 212],
};

const interpolate = (a: number, b: number, t: number) => a + (b - a) * t;

const rgbFromProgress = (progress: number, sequence: number[]) => {
  const stops = sequence.length > 1 ? sequence : scrollHueSequences.classic;
  const clamped = Math.min(1, Math.max(0, progress));
  const scaled = clamped * (stops.length - 1);
  const idx = Math.min(stops.length - 2, Math.floor(scaled));
  const local = scaled - idx;
  const hue = interpolate(stops[idx], stops[idx + 1], local);
  return hslToRgb(hue, 95, 48);
};

const rgbString = ({ r, g, b }: { r: number; g: number; b: number }) =>
  `rgb(${r}, ${g}, ${b})`;

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

export default function App() {
  const { subTheme } = useSubTheme();
  const isMobile = useIsMobile();
  const enhancedEffectsEnabled = useEnhancedEffects();

  const [activeSection, setActiveSection] = useState("top");
  const activeSectionRef = useRef("top");
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [isHoveredHeroPipeline, setIsHoveredHeroPipeline] = useState(false);

  const [customRGB, setCustomRGB] = useState({ r: 0, g: 112, b: 243 });
  const [scrollProgress, setScrollProgress] = useState(0);
  const scrollProgressRef = useRef(0);
  const [rgbLocked, setRgbLocked] = useState(false);

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
    let frame = 0;

    const readSection = () => {
      frame = 0;
      let currentSection = "top";
      let minDistance = Infinity;

      for (const section of sectionIds) {
        const el = document.getElementById(section);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        const distance = Math.abs(rect.top - 120);
        if (rect.top <= 260 && rect.bottom >= 80 && distance < minDistance) {
          minDistance = distance;
          currentSection = section;
        }
      }

      if (currentSection !== activeSectionRef.current) {
        activeSectionRef.current = currentSection;
        setActiveSection(currentSection);
      }
    };

    const requestRead = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(readSection);
    };

    requestRead();
    window.addEventListener("scroll", requestRead, { passive: true });
    window.addEventListener("resize", requestRead);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", requestRead);
      window.removeEventListener("resize", requestRead);
    };
  }, []);

  const activeHueSequence = useMemo(
    () => scrollHueSequences[subTheme] ?? scrollHueSequences.classic,
    [subTheme],
  );

  const liveScrollRGB = useMemo(
    () => rgbFromProgress(scrollProgress, activeHueSequence),
    [activeHueSequence, scrollProgress],
  );

  useEffect(() => {
    let frame = 0;

    const updateProgress = () => {
      frame = 0;
      const maxScroll = Math.max(
        1,
        document.documentElement.scrollHeight - window.innerHeight,
      );
      const nextProgress = Math.min(1, Math.max(0, window.scrollY / maxScroll));
      if (Math.abs(nextProgress - scrollProgressRef.current) < 0.004) return;
      scrollProgressRef.current = nextProgress;
      setScrollProgress(nextProgress);
    };

    const requestUpdate = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(updateProgress);
    };

    updateProgress();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
    };
  }, []);

  useEffect(() => {
    if (!rgbLocked) {
      setCustomRGB(liveScrollRGB);
    }
  }, [liveScrollRGB, rgbLocked]);

  const toggleRgbLock = useCallback(() => {
    setRgbLocked((locked) => {
      setCustomRGB(liveScrollRGB);
      return !locked;
    });
  }, [liveScrollRGB]);

  const themeColor = rgbString(customRGB);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--brand", themeColor);
    root.style.setProperty(
      "--brand-glow",
      `rgba(${customRGB.r}, ${customRGB.g}, ${customRGB.b}, 0.85)`,
    );
    root.style.setProperty(
      "--scroll-rgb",
      `${customRGB.r}, ${customRGB.g}, ${customRGB.b}`,
    );
    root.style.setProperty("--scroll-progress", `${scrollProgress}`);

    const stopColors = activeHueSequence.map((hue) => rgbString(hslToRgb(hue, 95, 48)));
    root.style.setProperty("--rgb-stop-a", stopColors[0] ?? themeColor);
    root.style.setProperty("--rgb-stop-b", stopColors[1] ?? themeColor);
    root.style.setProperty("--rgb-stop-c", stopColors[2] ?? themeColor);
    root.classList.toggle("rgb-color-locked", rgbLocked);
  }, [activeHueSequence, customRGB, rgbLocked, scrollProgress, themeColor]);

  const gradientColors = useMemo(() => {
    const main = `rgb(${customRGB.r}, ${customRGB.g}, ${customRGB.b})`;
    const light = `rgb(${Math.min(255, customRGB.r + 50)}, ${Math.min(255, customRGB.g + 50)}, ${Math.min(255, customRGB.b + 50)})`;
    const dark = `rgb(${Math.max(0, customRGB.r - 50)}, ${Math.max(0, customRGB.g - 50)}, ${Math.max(0, customRGB.b - 50)})`;

    return [main, light, dark];
  }, [customRGB.r, customRGB.g, customRGB.b]);

  return (
    <div
      id="top"
      className="min-h-screen text-foreground selection:bg-brand/20 relative isolate overflow-x-hidden pb-12"
    >
      <Suspense fallback={<LandingSkeleton mobile={isMobile} />}>
        {isMobile ? (
          <MobileLanding
            progress={scrollProgress}
            locked={rgbLocked}
            onToggleLock={toggleRgbLock}
            rgb={customRGB}
            activeSection={activeSection}
          />
        ) : (
          <DesktopLanding
            activeSection={activeSection}
            activeStepIndex={activeStepIndex}
            setActiveStepIndex={setActiveStepIndex}
            scrollProgress={scrollProgress}
            rgbLocked={rgbLocked}
            toggleRgbLock={toggleRgbLock}
            customRGB={customRGB}
            gradientColors={gradientColors}
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
