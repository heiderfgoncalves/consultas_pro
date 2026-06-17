import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTheme } from "@/hooks/use-theme";

const KEY = "consultas_pro_splash_seen_v1";

export function SplashScreen() {
  const { theme, resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark" || theme === "dark";

  const [show, setShow] = useState(false);

  // Exibir apenas no primeiro carregamento de uma sessão
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (sessionStorage.getItem(KEY)) return;
      sessionStorage.setItem(KEY, "1");
    } catch {
      /* ignore */
    }
    setShow(true);

    // Tempo de exibição total muito elegante e rápido (1.8s)
    const t = setTimeout(() => setShow(false), 1800);
    return () => clearTimeout(t);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.5, ease: [0.25, 1, 0.5, 1] }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-background select-none overflow-hidden"
        >
          {/* Brilho radial de fundo extremamente sutil e difuso para profundidade neutra */}
          <div
            className="absolute inset-0 pointer-events-none transition-opacity duration-500"
            style={{
              background: isDark
                ? "radial-gradient(35% 35% at 50% 50%, oklch(0.65 0.15 190 / 0.05) 0%, transparent 100%)"
                : "radial-gradient(35% 35% at 50% 50%, oklch(0.65 0.15 190 / 0.02) 0%, transparent 100%)",
            }}
          />

          {/* Core Layout Sem Molduras (Borderless) */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center gap-5"
          >
            {/* Logo Diamante Fino SVG */}
            <div className="relative flex items-center justify-center w-14 h-14">
              <svg
                width="40"
                height="40"
                viewBox="0 0 100 100"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="text-foreground/90"
              >
                {/* Linha externa do diamante principal (fina, 1.5px) */}
                <motion.path
                  d="M 50 14 L 86 50 L 50 86 L 14 50 Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 0.75 }}
                  transition={{ duration: 1.3, ease: [0.25, 1, 0.5, 1] }}
                />

                {/* Pequeno núcleo circular na cor da marca (suave) */}
                <motion.circle
                  cx="50"
                  cy="50"
                  r="4"
                  fill="var(--brand)"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 0.9 }}
                  transition={{ delay: 0.5, duration: 0.7, ease: "easeOut" }}
                />
              </svg>
            </div>

            {/* Nome da Marca com Tipografia Fina e Espaçada */}
            <div className="flex flex-col items-center gap-1.5 mt-0.5">
              <h1 className="font-mono text-[13px] font-medium tracking-[0.32em] text-foreground/90 uppercase">
                CONSULTAS<span className="text-brand font-semibold">_PRO</span>
              </h1>
            </div>

            {/* Micro-Barra de Carregamento Contínua Minimalista (1px) */}
            <div className="relative h-[1.5px] w-32 overflow-hidden bg-border/40 rounded-full mt-1.5">
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: "0%" }}
                transition={{ duration: 1.6, ease: [0.25, 1, 0.5, 1] }}
                className="absolute inset-y-0 left-0 w-full bg-brand"
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
