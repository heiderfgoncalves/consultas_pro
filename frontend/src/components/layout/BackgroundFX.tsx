import { motion, useScroll, useTransform } from "framer-motion";
import { useTheme } from "@/hooks/use-theme";

/**
 * Global animated background.
 * Top: soft institutional aurora (blues, gentle blur).
 * Bottom: progressively denser tech grid + scanlines as user scrolls.
 */
export function BackgroundFX() {
  const { theme, resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark" || theme === "dark";

  const { scrollYProgress } = useScroll();
  // Institutional → Tech transition
  const gridOpacity = useTransform(scrollYProgress, [0, 0.35, 1], [0.04, 0.12, 0.22]);
  const auroraOpacity = useTransform(scrollYProgress, [0, 0.5, 1], [0.9, 0.55, 0.25]);
  const scanlineOpacity = useTransform(scrollYProgress, [0, 0.4, 1], [0, 0.08, 0.18]);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Base radial vignette */}
      <div
        className="absolute inset-0"
        style={{
          background: isDark
            ? "radial-gradient(120% 80% at 50% -10%, oklch(0.22 0.06 256 / 0.65) 0%, transparent 55%), radial-gradient(80% 60% at 100% 110%, oklch(0.2 0.08 250 / 0.45) 0%, transparent 60%), var(--color-background)"
            : "radial-gradient(120% 80% at 50% -10%, oklch(0.94 0.03 250 / 0.4) 0%, transparent 55%), radial-gradient(80% 60% at 100% 110%, oklch(0.96 0.02 250 / 0.3) 0%, transparent 60%), var(--color-background)",
        }}
      />

      {/* Aurora blobs — institutional feel up top */}
      <motion.div style={{ opacity: auroraOpacity }} className="absolute inset-0">
        <motion.div
          className="absolute rounded-full"
          style={{
            width: 900,
            height: 900,
            left: "50%",
            top: "-300px",
            x: "-50%",
            background: isDark
              ? "radial-gradient(circle, oklch(0.7 0.18 250 / 0.45) 0%, transparent 65%)"
              : "radial-gradient(circle, oklch(0.93 0.04 250 / 0.45) 0%, transparent 65%)",
            filter: "blur(80px)",
          }}
          animate={{ y: [0, 30, 0], scale: [1, 1.06, 1] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute rounded-full"
          style={{
            width: 600,
            height: 600,
            right: "-150px",
            top: "20%",
            background: isDark
              ? "radial-gradient(circle, oklch(0.75 0.16 235 / 0.35) 0%, transparent 65%)"
              : "radial-gradient(circle, oklch(0.94 0.04 235 / 0.35) 0%, transparent 65%)",
            filter: "blur(90px)",
          }}
          animate={{ y: [0, -40, 0], x: [0, -20, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute rounded-full"
          style={{
            width: 500,
            height: 500,
            left: "-120px",
            top: "55%",
            background: isDark
              ? "radial-gradient(circle, oklch(0.65 0.2 265 / 0.32) 0%, transparent 65%)"
              : "radial-gradient(circle, oklch(0.92 0.04 265 / 0.32) 0%, transparent 65%)",
            filter: "blur(90px)",
          }}
          animate={{ y: [0, 30, 0], x: [0, 20, 0] }}
          transition={{ duration: 16, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        />
      </motion.div>

      {/* Tech grid — intensifies on scroll */}
      <motion.div
        className="absolute inset-0"
        style={{
          opacity: gridOpacity,
          backgroundImage: isDark
            ? "linear-gradient(to right, oklch(1 0 0 / 0.5) 1px, transparent 1px), linear-gradient(to bottom, oklch(1 0 0 / 0.5) 1px, transparent 1px)"
            : "linear-gradient(to right, oklch(0 0 0 / 0.05) 1px, transparent 1px), linear-gradient(to bottom, oklch(0 0 0 / 0.05) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage:
            "radial-gradient(ellipse 80% 60% at 50% 50%, black 40%, transparent 90%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 80% 60% at 50% 50%, black 40%, transparent 90%)",
        }}
      />

      {/* Scanline overlay — appears as page becomes more technical */}
      <motion.div
        className="absolute inset-0"
        style={{
          opacity: scanlineOpacity,
          backgroundImage: isDark
            ? "repeating-linear-gradient(0deg, oklch(1 0 0 / 0.06) 0px, oklch(1 0 0 / 0.06) 1px, transparent 1px, transparent 3px)"
            : "repeating-linear-gradient(0deg, oklch(0 0 0 / 0.035) 0px, oklch(0 0 0 / 0.035) 1px, transparent 1px, transparent 3px)",
        }}
      />

      {/* Noise/grain — premium texture */}
      <div
        className="absolute inset-0 opacity-[0.025] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.9'/></svg>\")",
        }}
      />
    </div>
  );
}
