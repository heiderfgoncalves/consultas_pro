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

const subThemePresetRGB = {
  classic: hslToRgb(212, 95, 48),
  cyberpunk: hslToRgb(32, 95, 48),
  oceanic: hslToRgb(174, 95, 42),
  emerald: hslToRgb(142, 88, 42),
  minimal: { r: 210, g: 214, b: 220 },
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

const applyBrandCssVars = (
  rgb: { r: number; g: number; b: number },
  progress: number,
  sequence: number[],
  locked: boolean,
) => {
  const root = document.documentElement;
  const themeColor = rgbString(rgb);
  root.style.setProperty("--brand", themeColor);
  root.style.setProperty("--brand-glow", `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.85)`);
  root.style.setProperty("--scroll-rgb", `${rgb.r}, ${rgb.g}, ${rgb.b}`);
  root.style.setProperty("--scroll-progress", `${progress}`);

  const stopColors = sequence.map((hue) => rgbString(hslToRgb(hue, 95, 48)));
  root.style.setProperty("--rgb-stop-a", stopColors[0] ?? themeColor);
  root.style.setProperty("--rgb-stop-b", stopColors[1] ?? themeColor);
  root.style.setProperty("--rgb-stop-c", stopColors[2] ?? themeColor);
  root.classList.toggle("rgb-color-locked", locked);
};

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
  const rgbLockedRef = useRef(false);
  const activeHueSequenceRef = useRef(scrollHueSequences.classic);

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

  useEffect(() => {
    activeHueSequenceRef.current = activeHueSequence;
  }, [activeHueSequence]);

  useEffect(() => {
    rgbLockedRef.current = rgbLocked;
  }, [rgbLocked]);

  useEffect(() => {
    let frame = 0;

    const updateProgress = () => {
      frame = 0;
      const maxScroll = Math.max(
        1,
        document.documentElement.scrollHeight - window.innerHeight,
      );
      const nextProgress = Math.min(1, Math.max(0, window.scrollY / maxScroll));
      scrollProgressRef.current = nextProgress;
      setScrollProgress((current) =>
        Math.abs(nextProgress - current) > 0.0015 ? nextProgress : current,
      );

      if (!rgbLockedRef.current) {
        const nextRgb = rgbFromProgress(nextProgress, activeHueSequenceRef.current);
        setCustomRGB(nextRgb);
        applyBrandCssVars(nextRgb, nextProgress, activeHueSequenceRef.current, false);
      }
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

  const toggleRgbLock = useCallback(() => {
    const progress = scrollProgressRef.current;
    const liveRgb = rgbFromProgress(progress, activeHueSequenceRef.current);
    setRgbLocked((locked) => {
      const nextLocked = !locked;
      setCustomRGB(liveRgb);
      applyBrandCssVars(liveRgb, progress, activeHueSequenceRef.current, nextLocked);
      return nextLocked;
    });
  }, []);

  useEffect(() => {
    const handlePresetColor = (event: Event) => {
      const nextSubTheme = (event as CustomEvent<keyof typeof subThemePresetRGB>).detail;
      const presetRgb = subThemePresetRGB[nextSubTheme] ?? subThemePresetRGB.classic;
      const sequence = scrollHueSequences[nextSubTheme] ?? scrollHueSequences.classic;
      setRgbLocked(true);
      setCustomRGB(presetRgb);
      applyBrandCssVars(presetRgb, scrollProgressRef.current, sequence, true);
    };

    window.addEventListener("sub-theme-change", handlePresetColor);
    return () => window.removeEventListener("sub-theme-change", handlePresetColor);
  }, []);

  const themeColor = rgbString(customRGB);

  useEffect(() => {
    applyBrandCssVars(customRGB, scrollProgress, activeHueSequence, rgbLocked);
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
