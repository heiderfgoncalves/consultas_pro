import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTheme } from "@/hooks/use-theme";

const KEY = "consultas_pro_splash_seen_v1";

interface InitializationStep {
  maxProgress: number;
  text: string;
}

const STEPS: InitializationStep[] = [
  { maxProgress: 20, text: "Sincronizando barramento seguro (OKLCH)…" },
  { maxProgress: 45, text: "Carregando algoritmos de consulta e inteligência…" },
  { maxProgress: 70, text: "Estabelecendo conexões criptografadas de gateway…" },
  { maxProgress: 90, text: "Estruturando componentes do painel operacional…" },
  { maxProgress: 100, text: "Módulos prontos. Inicializando plataforma…" },
];

export function SplashScreen() {
  const { theme, resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark" || theme === "dark";

  const [show, setShow] = useState(false);
  const [progress, setProgress] = useState(0);
  const [activeStepText, setActiveStepText] = useState(STEPS[0].text);

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
  }, []);

  // Simulação realista e não-linear de progresso (aceleração/desaceleração)
  useEffect(() => {
    if (!show) return;

    let currentProgress = 0;
    let timerId: NodeJS.Timeout;

    const tick = () => {
      // Determina um incremento aleatório e orgânico baseado na faixa atual
      let increment = 1;
      if (currentProgress < 30) {
        increment = Math.floor(Math.random() * 4) + 3; // Carregamento inicial rápido
      } else if (currentProgress < 65) {
        increment = Math.floor(Math.random() * 3) + 1; // Desaceleração intermediária
      } else if (currentProgress < 90) {
        increment = Math.floor(Math.random() * 4) + 2; // Recuperação de velocidade
      } else if (currentProgress < 98) {
        increment = Math.random() > 0.85 ? 1 : 0; // Trava sutil em 95%-98% simulando checks finais
      } else {
        increment = 1; // Salto para o final
      }

      currentProgress = Math.min(currentProgress + increment, 100);
      setProgress(currentProgress);

      // Sincroniza o texto do terminal com base no percentual
      const matchingStep = STEPS.find((step) => currentProgress <= step.maxProgress);
      if (matchingStep) {
        setActiveStepText(matchingStep.text);
      }

      if (currentProgress < 100) {
        // Velocidade variável para dar sensação orgânica de processamento
        const delay = currentProgress > 90 && currentProgress < 98
          ? Math.floor(Math.random() * 250) + 100 // mais devagar no final
          : Math.floor(Math.random() * 40) + 20; // rápido no geral

        timerId = setTimeout(tick, delay);
      } else {
        // Aguarda um pequeno momento no estado 100% para o usuário ler o log final
        timerId = setTimeout(() => {
          setShow(false);
        }, 600);
      }
    };

    // Pequeno atraso inicial para o usuário absorver a montagem do logo
    const initialDelay = setTimeout(tick, 300);

    return () => {
      clearTimeout(initialDelay);
      clearTimeout(timerId);
    };
  }, [show]);

  // Total de 12 blocos para a barra de progresso segmentada
  const totalBlocks = 12;
  const activeBlocksCount = Math.round((progress / 100) * totalBlocks);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ scale: 1.05, filter: "blur(16px)", opacity: 0 }}
          transition={{ duration: 0.65, ease: [0.25, 1, 0.5, 1] }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-background overflow-hidden select-none"
        >
          {/* 1. Atmosfera e Efeitos de Fundo */}
          {/* Textura de Ruído Orgânico */}
          <div className="absolute inset-0 bg-noise-pattern opacity-[0.035] pointer-events-none" />

          {/* Grade Tecnológica Focalizada no Centro */}
          <div className="absolute inset-0 bg-grid-pattern opacity-[0.16] ripple-grid-mask pointer-events-none" />

          {/* Orbes de Respiração Luminosa em OKLCH */}
          <div className="mesh-blob w-[550px] h-[550px] -top-[10%] -left-[10%] opacity-[0.14] pointer-events-none" />
          <div className="mesh-blob w-[550px] h-[550px] -bottom-[10%] -right-[10%] opacity-[0.14] [animation-delay:4s] pointer-events-none" />

          {/* Feixe de Luz de Varredura Sutil */}
          <div className="absolute inset-x-0 scanning-line-primary opacity-[0.04] pointer-events-none" />

          {/* 2. HUD Core Terminal (Painel Central de Vidro) */}
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="hud-frame glass-card hud-corners p-8 md:p-12 rounded-2xl w-[90%] max-w-[450px] flex flex-col items-center gap-6 text-center shadow-2xl relative z-10"
          >
            {/* Elementos de cantoneiras do HUD do Compozy */}
            <div className="hud-tl" />
            <div className="hud-tr" />
            <div className="hud-bl" />
            <div className="hud-br" />

            {/* 3. Logo SVG Animado Auto-Desenhável */}
            <div className="relative flex items-center justify-center w-20 h-20">
              {/* Efeito Halo / Brilho Traseiro Pulsante */}
              <div className="absolute inset-0 bg-brand/10 blur-xl rounded-full animate-pulse [animation-duration:3s]" />

              <svg
                width="72"
                height="72"
                viewBox="0 0 100 100"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="relative z-10 drop-shadow-[0_0_12px_var(--brand-glow)]"
              >
                {/* Hexágono Geométrico Externo Principal */}
                <motion.path
                  d="M 50 12 L 84 32 L 84 68 L 50 88 L 16 68 L 16 32 Z"
                  stroke="var(--brand)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
                />

                {/* Linhas de Barramento Internas (Pontilhadas de Precisão) */}
                <motion.path
                  d="M 50 12 L 50 88"
                  stroke="var(--brand-glow)"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 0.4 }}
                  transition={{ duration: 1.2, delay: 0.4, ease: "easeInOut" }}
                />
                <motion.path
                  d="M 16 32 L 84 68"
                  stroke="var(--brand-glow)"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 0.4 }}
                  transition={{ duration: 1.2, delay: 0.4, ease: "easeInOut" }}
                />
                <motion.path
                  d="M 16 68 L 84 32"
                  stroke="var(--brand-glow)"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 0.4 }}
                  transition={{ duration: 1.2, delay: 0.4, ease: "easeInOut" }}
                />

                {/* Núcleo Central de Diamante Inteligente (Flutuante com Mola) */}
                <motion.path
                  d="M 50 38 L 62 50 L 50 62 L 38 50 Z"
                  fill="var(--brand)"
                  stroke="var(--brand-glow)"
                  strokeWidth="1.5"
                  initial={{ scale: 0, opacity: 0, rotate: -45 }}
                  animate={{ scale: 1, opacity: 0.95, rotate: 0 }}
                  transition={{
                    type: "spring",
                    stiffness: 120,
                    damping: 14,
                    delay: 0.7,
                  }}
                />
              </svg>
            </div>

            {/* 4. Textos de Identificação */}
            <div className="flex flex-col gap-1.5 mt-1">
              <h1 className="brand-text font-mono text-xl font-bold tracking-[0.26em] uppercase">
                CONSULTAS_PRO
              </h1>
              <span className="font-mono text-[9px] tracking-[0.3em] uppercase text-muted-foreground/80">
                SISTEMA OPERACIONAL INTELEGENTE
              </span>
            </div>

            {/* Divisor Tecnológico Minimalista */}
            <div className="h-[1px] w-full bg-border-hairline" />

            {/* 5. Painel de Status Técnico e Progresso Digital */}
            <div className="w-full flex flex-col items-center gap-4">
              {/* Display de Mensagem de Status Rotativa */}
              <div className="h-5 flex items-center justify-center">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeStepText}
                    initial={{ opacity: 0, y: 5, filter: "blur(2px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0, y: -5, filter: "blur(2px)" }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="font-mono text-[10px] tracking-[0.16em] uppercase text-muted-foreground/90 max-w-[340px] truncate"
                  >
                    {activeStepText}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Barra de Progresso Modular Segmentada de Alta Precisão */}
              <div className="flex items-center gap-1.5 justify-center py-1">
                {Array.from({ length: totalBlocks }).map((_, index) => {
                  const isActive = index < activeBlocksCount;
                  return (
                    <div
                      key={index}
                      className="relative h-2.5 w-2 rounded-sm overflow-hidden bg-muted-foreground/10 border border-border/10"
                    >
                      <motion.div
                        initial={false}
                        animate={{
                          y: isActive ? "0%" : "100%",
                        }}
                        transition={{ duration: 0.25, ease: "easeOut" }}
                        className="absolute inset-0 bg-brand shadow-[0_0_8px_var(--brand)]"
                      />
                    </div>
                  );
                })}
              </div>

              {/* Contador Numérico Digital Estilo Console */}
              <div className="flex items-center gap-1 justify-center">
                <span className="font-mono text-xs tracking-[0.2em] text-muted-foreground/60 uppercase">
                  STATUS:
                </span>
                <span className="font-mono text-[13px] font-bold text-brand tracking-widest min-w-[3.5ch]">
                  {progress.toString().padStart(3, "0")}%
                </span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
