import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const KEY = "consultas_pro_splash_seen_v1";

export function SplashScreen() {
  // Exibir apenas no primeiro carregamento de uma sessão.
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (sessionStorage.getItem(KEY)) return;
      sessionStorage.setItem(KEY, "1");
    } catch {
      /* ignore */
    }
    setShow(true);
    const t = setTimeout(() => setShow(false), 1600);
    return () => clearTimeout(t);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: [0.2, 0.7, 0.2, 1] }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-background"
        >
          {/* Aurora */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(60% 50% at 50% 50%, oklch(0.7 0.18 250 / 0.35) 0%, transparent 70%), hsl(var(--background))",
            }}
          />
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.2, 0.7, 0.2, 1] }}
            className="relative flex flex-col items-center gap-5"
          >
            <div className="flex items-center gap-3 font-mono text-[13px] tracking-[0.24em] uppercase">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-sm border border-brand/60 bg-brand/10 text-brand">
                ◆
              </span>
              <span className="text-foreground">CONSULTAS</span>
              <span className="text-brand">_PRO</span>
            </div>

            {/* Progress bar */}
            <div className="relative h-px w-48 overflow-hidden bg-hairline">
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: "100%" }}
                transition={{ duration: 1.2, ease: "easeInOut" }}
                className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-brand to-transparent"
              />
            </div>
            <div className="font-mono text-[10px] tracking-[0.22em] uppercase text-muted-foreground">
              Inicializando plataforma…
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
