import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Cpu, 
  Database, 
  Terminal, 
  Activity, 
  Layers, 
  CheckCircle2 
} from "lucide-react";

interface SplashScreenProps {
  onComplete: () => void;
}

const SYSTEM_LOGS = [
  { prg: 0, text: "SYS: Inicializando núcleo analítico Consultas PRO v3.2.4..." },
  { prg: 8, text: "NET: Conectando ao gateway de microsserviços em nuvem..." },
  { prg: 15, text: "DB: Estabelecendo canal seguro PostgreSQL/Prisma com pool..." },
  { prg: 22, text: "DB: Cache Redis sincronizado com sucesso." },
  { prg: 30, text: "LOAD: Carregando banco de templates e modelos de relatórios..." },
  { prg: 38, text: "LOAD: Mapeando 14 esquemas de dados tipados do bacen..." },
  { prg: 45, text: "CORE: Ativando interpretador matemático de fórmulas e DAX..." },
  { prg: 52, text: "CORE: Registrando funções analíticas sum(), avg() e count()..." },
  { prg: 60, text: "COMPILER: Compilando esquemas dinâmicos de renderização..." },
  { prg: 68, text: "UI: Carregando recursos visuais e biblioteca de ícones Lucide..." },
  { prg: 75, text: "UI: Inicializando canvas infinito de precisão com grade..." },
  { prg: 82, text: "UI: Renderizando Ribbon e barras de ferramentas analíticas..." },
  { prg: 90, text: "SYS: Validando integridade de segurança da sessão..." },
  { prg: 95, text: "SYS: Sincronizando paleta de azul corporativo do sistema..." },
  { prg: 100, text: "READY: Estúdio de relatórios pronto para edição!" }
];

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [statusText, setStatusText] = useState("Inicializando sistema...");
  const [show, setShow] = useState(true);

  // Reduzido para 8 partículas estratégicas simples para aliviar overhead de rasterização com backdrop-filter
  const particles = useMemo(() => {
    return Array.from({ length: 8 }).map((_, i) => ({
      id: i,
      x: 10 + Math.random() * 80,
      y: 15 + Math.random() * 70,
      size: Math.random() * 2 + 1.5,
      duration: Math.random() * 8 + 12,
      delay: Math.random() * -15,
    }));
  }, []);

  // Intervalo mais rápido (55ms) com incrementos menores para simular uma transição linear perfeitamente contínua
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }

        const increment = Math.floor(Math.random() * 3) + 2; // Passos menores e constantes para suavidade líquida
        const next = Math.min(100, prev + increment);

        if (next < 20) {
          setStatusText("Carregando templates analíticos...");
        } else if (next < 45) {
          setStatusText("Sincronizando esquemas de dados...");
        } else if (next < 70) {
          setStatusText("Iniciando interpretador de fórmulas...");
        } else if (next < 90) {
          setStatusText("Montando ambiente de relatórios...");
        } else {
          setStatusText("Sincronizando ambiente...");
        }

        return next;
      });
    }, 55);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const triggerLogs = SYSTEM_LOGS.filter(l => l.prg <= progress);
    const logTexts = triggerLogs.map(l => l.text).slice(-4);
    
    setLogs((prev) => {
      // Se o conteúdo e tamanho forem idênticos, preserva a referência do estado anterior para evitar re-render do DOM no React
      if (prev.length === logTexts.length && prev[prev.length - 1] === logTexts[logTexts.length - 1]) {
        return prev;
      }
      return logTexts;
    });
  }, [progress]);

  useEffect(() => {
    if (progress === 100) {
      const timeout = setTimeout(() => {
        setShow(false);
        setTimeout(() => {
          onComplete();
        }, 300); // Transição direta e acelerada de saída
      }, 400);
      return () => clearTimeout(timeout);
    }
  }, [progress, onComplete]);

  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 0.99 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-[#02050b] text-white overflow-hidden select-none transform-gpu"
          style={{ willChange: "opacity, transform" }}
        >
          {/* Estilos CSS nativos otimizados para GPU (Compositor Thread) */}
          <style dangerouslySetInnerHTML={{ __html: `
            @keyframes smoothSpin {
              from { transform: rotateZ(0deg); }
              to { transform: rotateZ(360deg); }
            }
            @keyframes softPulse {
              0%, 100% { transform: scale(1) translateZ(0); opacity: 0.7; }
              50% { transform: scale(1.05) translateZ(0); opacity: 1; }
            }
            @keyframes shimmerSweep {
              from { left: -100%; }
              to { left: 200%; }
            }
            @keyframes particleFloat {
              0% { transform: translateY(0) translateZ(0); opacity: 0; }
              15% { opacity: 0.45; }
              85% { opacity: 0.45; }
              100% { transform: translateY(-90px) translateZ(0); opacity: 0; }
            }
            .gpu-spin {
              animation: smoothSpin 12s linear infinite;
              will-change: transform;
            }
            .gpu-pulse-blue {
              animation: softPulse 14s ease-in-out infinite;
              will-change: transform, opacity;
            }
            .gpu-pulse-indigo {
              animation: softPulse 18s ease-in-out infinite reverse;
              will-change: transform, opacity;
            }
            .gpu-shimmer {
              animation: shimmerSweep 3s cubic-bezier(0.4, 0, 0.2, 1) infinite;
              will-change: left;
            }
            .circ-progress {
              transition: stroke-dashoffset 120ms cubic-bezier(0.1, 0.8, 0.25, 1);
              will-change: stroke-dashoffset;
            }
            .gpu-particle {
              animation: particleFloat var(--p-dur) ease-in-out infinite;
              animation-delay: var(--p-delay);
              will-change: transform, opacity;
            }
          `}} />

          {/* 1. Auroras de Brilho de Fundo (Aceleradas por hardware via radial-gradient de alta performance, sem filtros de blur lentos) */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute -top-1/4 -left-1/4 w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle_at_center,rgba(37,99,235,0.12)_0%,transparent_70%)] gpu-pulse-blue" />
            <div className="absolute -bottom-1/4 -right-1/4 w-[650px] h-[650px] rounded-full bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.09)_0%,transparent_70%)] gpu-pulse-indigo" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(37,99,235,0.06)_0%,transparent_60%)]" />
          </div>

          {/* 2. Grid de Engenharia 3D (Estático, sem custo de renderização de CPU) */}
          <div 
            className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[linear-gradient(to_right,#3b82f6_1px,transparent_1px),linear-gradient(to_bottom,#3b82f6_1px,transparent_1px)] bg-[size:32px_32px] transform-gpu" 
            style={{
              maskImage: "radial-gradient(ellipse 65% 65% at 50% 50%, black, transparent)",
              WebkitMaskImage: "radial-gradient(ellipse 65% 65% at 50% 50%, black, transparent)",
              transform: "perspective(800px) rotateX(45deg) scale(1.35)",
              transformOrigin: "center center",
              willChange: "transform"
            }}
          />

          {/* 3. Partículas Leves (Animação de flutuação em loop rodando inteiramente na thread de Compositor da GPU para zero CPU overhead) */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {particles.map((p) => (
              <div
                key={p.id}
                className="absolute rounded-full bg-blue-400/20 transform-gpu gpu-particle"
                style={{
                  width: `${p.size}px`,
                  height: `${p.size}px`,
                  left: `${p.x}%`,
                  top: `${p.y}%`,
                  "--p-dur": `${p.duration}s`,
                  "--p-delay": `${p.delay}s`,
                } as React.CSSProperties}
              />
            ))}
          </div>

          <div className="relative flex flex-col items-center max-w-md w-full px-6">
            
            {/* 4. Painel Principal Flutuante (Glassmorphism de Alto Desempenho) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.99, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full flex flex-col items-center bg-[#050915]/50 backdrop-blur-xl border border-blue-500/10 rounded-2xl p-7 shadow-[0_25px_60px_rgba(0,0,0,0.55)] overflow-hidden transform-gpu"
              style={{ willChange: "transform, opacity" }}
            >
              {/* Molduras de Brilho Sutil */}
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500/25 to-transparent" />
              <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-indigo-500/15 to-transparent" />

              {/* Logo com Shimmer e Rotação CSS Puros (Zero JS Overhead) */}
              <div className="relative flex items-center justify-center size-16 mb-4">
                {/* SVG de Rotação (Animado nativamente via CSS) */}
                <svg className="absolute inset-0 size-full text-blue-500/15 gpu-spin" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="1.2" strokeDasharray="5, 8" fill="none" />
                </svg>
                
                {/* Ping de Brilho */}
                <div className="absolute size-11 rounded-full bg-blue-500/5 border border-blue-500/10 animate-pulse" />

                {/* Ícone Analítico Principal (Favicon do Consultas PRO) */}
                <div className="relative z-10 flex items-center justify-center size-12 rounded-full bg-gradient-to-br from-blue-600 to-indigo-650 border border-blue-400/20 shadow-[0_0_15px_rgba(37,99,235,0.3)] overflow-hidden">
                  <img src="/favicon-32x32.png" alt="Favicon" className="size-6 object-contain" />
                  {/* Shimmer de reflexo (Animado nativamente via CSS) */}
                  <div className="absolute top-0 bottom-0 w-1/2 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 gpu-shimmer" style={{ left: "-100%" }} />
                </div>
              </div>

              {/* Título */}
              <div className="text-center">
                <h1 className="text-xl font-black tracking-widest bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-sky-300 to-indigo-300 uppercase">
                  Consultas PRO
                </h1>
                <div className="flex items-center justify-center gap-1.5 mt-0.5">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                    Report Analytics Studio
                  </p>
                </div>
              </div>

              {/* Console de logs otimizado com renderização mais leve */}
              <div className="w-full mt-6 bg-black/45 border border-blue-500/10 rounded-lg p-3 font-mono text-[9px] text-slate-400 h-24 flex flex-col justify-end gap-1 shadow-inner">
                <div className="flex items-center gap-1 border-b border-white/5 pb-1 mb-1 text-slate-500">
                  <Terminal className="size-3 text-blue-400 shrink-0" />
                  <span className="uppercase tracking-wider font-bold">Monitor do Sistema</span>
                  <div className="ml-auto flex gap-1 items-center">
                    <span className="size-1 rounded-full bg-slate-700" />
                    <span className="size-1 rounded-full bg-slate-700" />
                    <span className="size-1 rounded-full bg-blue-500/60" />
                  </div>
                </div>
                <div className="flex-1 flex flex-col justify-end gap-0.5 overflow-hidden">
                  {logs.map((log) => (
                    <div
                      key={log}
                      className={`truncate flex items-center gap-1.5 ${
                        log.startsWith("SYS:") ? "text-blue-300/90" :
                        log.startsWith("DB:") ? "text-sky-300/90" :
                        log.startsWith("READY:") ? "text-emerald-450 font-bold" : "text-slate-350/90"
                      }`}
                    >
                      <span className="opacity-30 text-blue-500 font-bold">&gt;</span>
                      {log}
                    </div>
                  ))}
                </div>
              </div>

              {/* Seção de Progresso Circular & Status (Ultra-Suave) */}
              <div className="mt-6 flex items-center gap-4 w-full">
                
                {/* Anel Circular de Progresso com Transição CSS Direta na GPU */}
                <div className="relative size-14 shrink-0 flex items-center justify-center transform-gpu">
                  <svg className="size-full transform -rotate-90">
                    <circle
                      cx="28"
                      cy="28"
                      r="24"
                      className="stroke-slate-800/80"
                      strokeWidth="3"
                      fill="transparent"
                    />
                    <circle
                      cx="28"
                      cy="28"
                      r="24"
                      className="stroke-blue-500 drop-shadow-[0_0_3px_rgba(59,130,246,0.5)] circ-progress"
                      strokeWidth="3"
                      strokeDasharray={2 * Math.PI * 24}
                      strokeDashoffset={2 * Math.PI * 24 - (progress / 100) * 2 * Math.PI * 24}
                      strokeLinecap="round"
                      fill="transparent"
                    />
                  </svg>
                  <span className="absolute text-[10px] font-mono font-bold text-blue-400">
                    {progress}%
                  </span>
                </div>

                {/* Status Ativo */}
                <div className="flex-1 flex flex-col justify-center min-w-0">
                  <div className="flex items-center gap-1 text-[10.5px] font-bold text-slate-300">
                    <Activity className="size-3.5 text-blue-400 animate-pulse shrink-0" />
                    <span className="truncate">{statusText}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-[8px] text-slate-500 font-semibold uppercase tracking-wider">
                    <span className="flex items-center gap-1">
                      <Cpu className="size-2.5 text-slate-600" />
                      v2.0 (Active)
                    </span>
                    <span className="flex items-center gap-1">
                      <Layers className="size-2.5 text-slate-600" />
                      GPU-Accel
                    </span>
                  </div>
                </div>

              </div>

            </motion.div>

            {/* Rodapé */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.35 }}
              transition={{ delay: 0.5 }}
              className="mt-6 text-center"
            >
              <div className="flex items-center justify-center gap-1.5">
                <CheckCircle2 className="size-3 text-blue-400" />
                <p className="text-[8.5px] uppercase tracking-widest text-slate-500 font-black">
                  Conexão Segura &bull; Consultas PRO Editor &copy; 2026
                </p>
              </div>
            </motion.div>

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
