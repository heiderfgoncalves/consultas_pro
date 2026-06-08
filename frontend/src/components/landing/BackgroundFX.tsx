import { useTheme } from "@/hooks/use-theme";

/**
 * Global animated background.
 * Totalmente estático no React, delegando todas as auroras, blurs e animações
 * para o CSS puro (index.css) com aceleração de hardware (GPU), eliminando
 * cálculos do Framer Motion no scroll.
 */
export function BackgroundFX() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== "light";

  return (
    <div aria-hidden className={`landing-bg-fx ${isDark ? "is-dark" : "is-light"}`}>
      <div className="landing-bg-base" />
      <div className="landing-bg-aurora landing-bg-aurora-a" />
      <div className="landing-bg-aurora landing-bg-aurora-b" />
      <div className="landing-bg-aurora landing-bg-aurora-c" />
      <div className="landing-bg-grid" />
      <div className="landing-bg-scanlines" />
      <div className="landing-bg-grain" />
    </div>
  );
}
