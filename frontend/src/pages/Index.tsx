import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { Nav } from "@/components/landing/Nav";
import { Hero } from "@/components/landing/Hero";
import { WorkflowSplit } from "@/components/landing/WorkflowSplit";
import { SevenSteps } from "@/components/landing/SevenSteps";
import { FeaturesBento } from "@/components/landing/FeaturesBento";
import { DossierSection } from "@/components/landing/DossierSection";
import { LocalOrCloud } from "@/components/landing/LocalOrCloud";
import { FAQ } from "@/components/landing/FAQ";
import { FinalCTA } from "@/components/landing/FinalCTA";
import { Footer } from "@/components/landing/Footer";
import { BackgroundFX } from "@/components/landing/BackgroundFX";

// Novos componentes de animação premium
import Dock, { DockItemData } from "@/components/ui/Dock";
import TargetCursor from "@/components/ui/TargetCursor";
import Particles from "@/components/ui/Particles";
import GradientText from "@/components/ui/GradientText";

// Hook de subtema global do sistema
import { useSubTheme } from "@/hooks/use-subtheme";
import { useTheme } from "@/hooks/use-theme";

// Ícones de alta fidelidade
import { Home, Cpu, GitCommit, FolderOpen, LayoutGrid, LogIn, UserPlus, Sun, Moon } from "lucide-react";

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
    b: Math.round(255 * f(4))
  };
};

const themeHues: Record<string, number> = {
  classic: 212,
  cyberpunk: 271,
  oceanic: 174,
  emerald: 150,
  minimal: 240,
};

export default function Index() {
  const { isAuthenticated, hydrated, hydrate } = useAuthStore();
  const navigate = useNavigate();
  const { subTheme } = useSubTheme();
  const { theme, setTheme } = useTheme();
  const activeMode = theme ?? "dark";

  const [activeSection, setActiveSection] = useState("top");
  const [activeStepIndex, setActiveStepIndex] = useState(0);

  // Ciclo automático de alta fidelidade para as etapas da primeira seção (Hero Pipeline)
  const [isHoveredHeroPipeline, setIsHoveredHeroPipeline] = useState(false);

  useEffect(() => {
    const handleHoverStart = () => setIsHoveredHeroPipeline(true);
    const handleHoverEnd = () => setIsHoveredHeroPipeline(false);
    window.addEventListener('hero-pipeline-hover-start', handleHoverStart);
    window.addEventListener('hero-pipeline-hover-end', handleHoverEnd);
    return () => {
      window.removeEventListener('hero-pipeline-hover-start', handleHoverStart);
      window.removeEventListener('hero-pipeline-hover-end', handleHoverEnd);
    };
  }, []);

  useEffect(() => {
    if (isHoveredHeroPipeline) return;
    const interval = setInterval(() => {
      setActiveStepIndex((prev) => (prev + 1) % 6);
    }, 2800);
    return () => clearInterval(interval);
  }, [isHoveredHeroPipeline]);

  useEffect(() => {
    const handleScroll = () => {
      const sections = ["top", "plataforma", "pipeline", "integracoes", "templates", "dossie", "recursos"];
      let currentSection = "top";
      let minDistance = Infinity;

      for (const section of sections) {
        const el = document.getElementById(section);
        if (el) {
          const rect = el.getBoundingClientRect();
          const distance = Math.abs(rect.top - 120);
          if (rect.top <= 250 && rect.bottom >= 100) {
            if (distance < minDistance) {
              minDistance = distance;
              currentSection = section;
            }
          }
        }
      }
      setActiveSection(currentSection);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const [customRGB, setCustomRGB] = useState({ r: 0, g: 112, b: 243 });
  const [hasCustomColor, setHasCustomColor] = useState(false);
  const [hue, setHue] = useState(212);

  // Mapeamento dinâmico de cores hexadecimais de acordo com o subtema ativo
  const themeColors: Record<string, string> = {
    classic: "#0070f3",
    cyberpunk: "#a855f7",
    oceanic: "#0d9488",
    emerald: "#10b981",
    minimal: "#a1a1aa",
  };

  const activeSubThemeColor = themeColors[subTheme] || "#0070f3";

  // Sincroniza a cor do subtema inicial nos sliders e no Hue
  useEffect(() => {
    if (!hasCustomColor) {
      const initialHue = themeHues[subTheme] || 212;
      setHue(initialHue);
      const rgb = hslToRgb(initialHue, 95, 48);
      setCustomRGB(rgb);
    }
  }, [subTheme, hasCustomColor]);

  const handleHueChange = (newHue: number) => {
    setHue(newHue);
    setHasCustomColor(true);
    const rgb = hslToRgb(newHue, 95, 48);
    setCustomRGB(rgb);
  };

  const themeColor = `rgb(${customRGB.r}, ${customRGB.g}, ${customRGB.b})`;

  useEffect(() => {
    document.documentElement.style.setProperty('--brand', themeColor);
    document.documentElement.style.setProperty('--brand-glow', `rgba(${customRGB.r}, ${customRGB.g}, ${customRGB.b}, 0.85)`);
  }, [themeColor, customRGB]);

  // Paleta de gradiente dinâmica gerada matematicamente a partir da cor RGB do sintetizador
  const getCustomGradientColors = () => {
    const main = `rgb(${customRGB.r}, ${customRGB.g}, ${customRGB.b})`;
    const lightR = Math.min(255, customRGB.r + 50);
    const lightG = Math.min(255, customRGB.g + 50);
    const lightB = Math.min(255, customRGB.b + 50);
    const light = `rgb(${lightR}, ${lightG}, ${lightB})`;
    const darkR = Math.max(0, customRGB.r - 50);
    const darkG = Math.max(0, customRGB.g - 50);
    const darkB = Math.max(0, customRGB.b - 50);
    const dark = `rgb(${darkR}, ${darkG}, ${darkB})`;
    
    return [main, light, dark];
  };

  const gradientColors = getCustomGradientColors();



  useEffect(() => {
    // Carrega a sessão local armazenada para validar o estado de login
    if (!hydrated) {
      hydrate();
    }
  }, [hydrated, hydrate]);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Itens dinâmicos para o Dock institucional flutuante na base da LP (Unificados com o Tema Ativo)
  const dockItems: DockItemData[] = [
    {
      icon: <Home className={`h-[18px] w-[18px] transition-colors ${activeSection === "top" ? "text-brand" : "text-muted-foreground"}`} />,
      label: "Início",
      onClick: () => scrollToSection("top"),
      className: `cursor-target transition-all duration-300 ${
        activeSection === "top" 
          ? "border-brand bg-brand/15 shadow-[0_0_14px_var(--brand)] scale-110" 
          : "text-muted-foreground"
      }`,
    },
    {
      icon: <Cpu className={`h-[18px] w-[18px] transition-colors ${activeSection === "plataforma" || activeSection === "integracoes" ? "text-brand" : "text-muted-foreground"}`} />,
      label: "Plataforma",
      onClick: () => scrollToSection("plataforma"),
      className: `cursor-target transition-all duration-300 ${
        activeSection === "plataforma" || activeSection === "integracoes"
          ? "border-brand bg-brand/15 shadow-[0_0_14px_var(--brand)] scale-110" 
          : "text-muted-foreground"
      }`,
    },
    {
      icon: <GitCommit className={`h-[18px] w-[18px] transition-colors ${activeSection === "pipeline" ? "text-brand" : "text-muted-foreground"}`} />,
      label: "Pipeline",
      onClick: () => scrollToSection("pipeline"),
      className: `cursor-target transition-all duration-300 ${
        activeSection === "pipeline" 
          ? "border-brand bg-brand/15 shadow-[0_0_14px_var(--brand)] scale-110" 
          : "text-muted-foreground"
      }`,
    },
    {
      icon: <FolderOpen className={`h-[18px] w-[18px] transition-colors ${activeSection === "dossie" ? "text-brand" : "text-muted-foreground"}`} />,
      label: "Dossiê",
      onClick: () => scrollToSection("dossie"),
      className: `cursor-target transition-all duration-300 ${
        activeSection === "dossie" 
          ? "border-brand bg-brand/15 shadow-[0_0_14px_var(--brand)] scale-110" 
          : "text-muted-foreground"
      }`,
    },
    {
      icon: <LayoutGrid className={`h-[18px] w-[18px] transition-colors ${activeSection === "recursos" || activeSection === "templates" ? "text-brand" : "text-muted-foreground"}`} />,
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
      onClick: () => navigate("/login"),
      className: "border-brand/35 bg-brand/5 hover:bg-brand/15 transition-all duration-300 cursor-target",
    },
    {
      icon: <UserPlus className="h-[18px] w-[18px] text-primary-foreground" />,
      label: "Criar Conta",
      onClick: () => navigate("/cadastro"),
      className: "bg-brand text-primary-foreground border border-brand/20 hover:brightness-110 transition-all duration-300 cursor-target",
    }
  ];

  // Renderiza um loader elegante enquanto verifica se o usuário está logado
  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
          <span className="mono text-xs uppercase tracking-[0.16em] text-muted-foreground">Inicializando Consultas PRO...</span>
        </div>
      </div>
    );
  }

  // ROTEAMENTO DINÂMICO:
  // Se o usuário estiver autenticado, redireciona imediatamente para o dashboard
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  // Se o usuário estiver deslogado, exibe a landing page institucional premium e animada
  return (
    <div id="top" className="min-h-screen text-foreground selection:bg-brand/20 relative overflow-x-hidden pb-12">
      {/* Partículas flutuantes em 3D ocupando o fundo da página de ponta a ponta */}
      <Particles
        particleColors={gradientColors}
        particleCount={140}
        particleSpread={9}
        speed={0.12}
        particleBaseSize={85}
        moveParticlesOnHover={true}
        particleHoverFactor={0.8}
        alphaParticles={true}
        disableRotation={false}
        className="fixed inset-0 pointer-events-none -z-10"
      />

      {/* Mira de precisão Neon militar que segue e trava magneticamente sobre botões com a classe .cursor-target ou seletores interativos */}
      <TargetCursor targetSelector="button, a, [role='button'], .cursor-target, .interactive-modular-card, .dock-item, .folder, .paper, .faq-trigger, .theme-toggle" spinDuration={4} />

      {/* Background FX (auroras e grids) */}
      <BackgroundFX />

      {/* Navegação Institucional (com botões de Login / Cadastro) */}
      <Nav activeSection={activeSection} />

      {/* Hero Section */}
      <Hero activeStepIndex={activeStepIndex} setActiveStepIndex={setActiveStepIndex} />

      {/* Nova Seção de Transição Premium: Particles transparentes + GradientText interativo */}
      <div className="relative py-6 md:py-8 border-y border-hairline bg-surface/60 dark:bg-[#05070b]/60 backdrop-blur-sm overflow-hidden flex flex-col items-center justify-center text-center">
        {/* Gradiente de cobertura para mesclagem de bordas suave */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-transparent to-background/60 z-10 pointer-events-none" />

        <div className="relative z-20 px-6 max-w-4xl flex flex-col items-center gap-3">
          <span className="mono text-[9px] md:text-[10px] tracking-[0.25em] text-brand uppercase font-bold">
            ◆ ENGINE COGNITIVA INTEGRADA ◆
          </span>
          
          <h4 className="text-xl md:text-2xl font-semibold tracking-tight max-w-2xl leading-relaxed">
            Busca de alta precisão White-Label in lote.{" "}
            <span className="text-muted-foreground">Experimente uma plataforma modular ultraveloz.</span>
          </h4>

          <div className="mt-4 w-full max-w-2xl mx-auto space-y-4 p-5 rounded-lg bg-surface/30 border border-brand/20 backdrop-blur-md shadow-2xl relative overflow-hidden hud-corners">
            {/* HUD corners nas bordas para ficar ultra-premium */}
            <div className="hud-tl" />
            <div className="hud-tr" />
            <div className="hud-bl" />
            <div className="hud-br" />

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mono text-[10px] text-muted-foreground border-b border-hairline pb-2.5">
              <span className="text-brand font-bold uppercase tracking-wider flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-brand animate-pulse" />
                Sintetizador de Espectro RGB da Landing Page
              </span>
              <div className="flex items-center gap-3">
                {/* Theme Mode Toggle */}
                <div className="flex items-center gap-0.5 bg-background/50 border border-hairline p-0.5 rounded-md">
                  <button
                    onClick={() => setTheme("light")}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded text-[8.5px] uppercase tracking-wider transition-all duration-300 cursor-target ${
                      activeMode === "light"
                        ? "bg-brand text-primary-foreground font-bold shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/30"
                    }`}
                  >
                    <Sun className="h-2.5 w-2.5" /> Claro
                  </button>
                  <button
                    onClick={() => setTheme("dark")}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded text-[8.5px] uppercase tracking-wider transition-all duration-300 cursor-target ${
                      activeMode === "dark"
                        ? "bg-brand text-primary-foreground font-bold shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/30"
                    }`}
                  >
                    <Moon className="h-2.5 w-2.5" /> Escuro
                  </button>
                </div>
                <span className="text-hairline font-bold">|</span>
                <span className="font-mono">MATRIZ: <span className="text-foreground font-bold font-mono">{hue}°</span></span>
              </div>
            </div>
            
            {/* Slider de Hue linear colorido espectral maior */}
            <div className="relative flex items-center h-8 group/slider select-none">
              <input
                type="range"
                min="0"
                max="360"
                value={hue}
                onChange={(e) => handleHueChange(parseInt(e.target.value))}
                style={{
                  background: 'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)'
                }}
                className="w-full h-3.5 rounded-full appearance-none cursor-pointer border border-white/10 shadow-inner focus:outline-none spectral-slider"
              />
            </div>
            
            <p className="mono text-[8px] text-muted-foreground/60 uppercase tracking-[0.15em]">
              Arraste o cursor horizontalmente para modular a frequência de cor global do sistema de ponta a ponta
            </p>
          </div>
        </div>
      </div>

      {/* Workflow Split (com os cards modularizados "PIPELINE ESTRUTURADO" e "INTEGRAÇÕES") */}
      <WorkflowSplit />

      {/* Sete Etapas Estruturadas (com as 7 bolhas/cards modulares arrastáveis) */}
      <SevenSteps />

      {/* Bento Grid de Funcionalidades */}
      <FeaturesBento />

      {/* Seção Especial de Dossiê Comercial e Pasta Física de Relatórios Reais */}
      <DossierSection />

      {/* Detalhes Local vs Nuvem */}
      <LocalOrCloud />

      {/* Seção de Dúvidas Frequentes */}
      <FAQ />

      {/* Call to Action Final */}
      <FinalCTA />

      {/* Rodapé da Página */}
      <Footer />

      {/* Dock Institucional flutuante fixo na parte inferior com Magnificação elástica e Estabilidade absoluta */}
      <div className="hidden md:block">
        <Dock 
          items={dockItems}
          panelHeight={64}
          baseItemSize={48}
          magnification={66}
          distance={180}
        />
      </div>

      {/* Sintetizador RGB de Customização de Cores Futurista */}
      <div className="fixed bottom-24 left-6 z-50 hidden lg:flex flex-col gap-3.5 p-4 rounded-lg border border-brand/30 bg-card/90 dark:bg-[#060a12]/90 backdrop-blur-md shadow-2xl w-[200px] animate-scale-in hud-corners">
        <div className="hud-tl" />
        <div className="hud-tr" />
        <div className="hud-bl" />
        <div className="hud-br" />
        
        <div className="flex items-center justify-between border-b border-hairline pb-1.5">
          <span className="mono text-[8.5px] tracking-[0.18em] text-brand font-bold uppercase">Sintetizador RGB</span>
          <span className="mono text-[7px] text-muted-foreground/60">[ LIVE_CORE ]</span>
        </div>

        {/* Theme Mode Selector */}
        <div className="flex items-center gap-0.5 bg-background/50 border border-hairline p-0.5 rounded-md">
          <button
            onClick={() => setTheme("light")}
            className={`flex-1 flex items-center justify-center gap-1 py-1 rounded text-[8px] uppercase tracking-wider transition-all duration-300 cursor-target ${
              activeMode === "light"
                ? "bg-brand text-primary-foreground font-bold shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/30"
            }`}
          >
            <Sun className="h-2.5 w-2.5" /> Claro
          </button>
          <button
            onClick={() => setTheme("dark")}
            className={`flex-1 flex items-center justify-center gap-1 py-1 rounded text-[8px] uppercase tracking-wider transition-all duration-300 cursor-target ${
              activeMode === "dark"
                ? "bg-brand text-primary-foreground font-bold shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/30"
            }`}
          >
            <Moon className="h-2.5 w-2.5" /> Escuro
          </button>
        </div>

        <div className="space-y-2.5">
          {/* Red */}
          <div className="space-y-1">
            <div className="flex justify-between mono text-[8px] text-muted-foreground">
              <span>RED:</span>
              <span className="text-foreground font-bold">{customRGB.r}</span>
            </div>
            <input
              type="range"
              min="0"
              max="255"
              value={customRGB.r}
              onChange={(e) => {
                setHasCustomColor(true);
                setCustomRGB(prev => ({ ...prev, r: parseInt(e.target.value) }));
              }}
              className="w-full h-1 bg-surface rounded-lg appearance-none cursor-pointer accent-brand"
            />
          </div>

          {/* Green */}
          <div className="space-y-1">
            <div className="flex justify-between mono text-[8px] text-muted-foreground">
              <span>GREEN:</span>
              <span className="text-foreground font-bold">{customRGB.g}</span>
            </div>
            <input
              type="range"
              min="0"
              max="255"
              value={customRGB.g}
              onChange={(e) => {
                setHasCustomColor(true);
                setCustomRGB(prev => ({ ...prev, g: parseInt(e.target.value) }));
              }}
              className="w-full h-1 bg-surface rounded-lg appearance-none cursor-pointer accent-brand"
            />
          </div>

          {/* Blue */}
          <div className="space-y-1">
            <div className="flex justify-between mono text-[8px] text-muted-foreground">
              <span>BLUE:</span>
              <span className="text-foreground font-bold">{customRGB.b}</span>
            </div>
            <input
              type="range"
              min="0"
              max="255"
              value={customRGB.b}
              onChange={(e) => {
                setHasCustomColor(true);
                setCustomRGB(prev => ({ ...prev, b: parseInt(e.target.value) }));
              }}
              className="w-full h-1 bg-surface rounded-lg appearance-none cursor-pointer accent-brand"
            />
          </div>
        </div>

        {hasCustomColor && (
          <button
            onClick={() => setHasCustomColor(false)}
            className="w-full py-1 text-center border border-brand/20 bg-brand/5 hover:bg-brand/15 rounded mono text-[8px] text-brand tracking-wider font-bold transition-all duration-300 cursor-target focus:outline-none"
          >
            RESTAURAR SUBTEMA
          </button>
        )}
      </div>
    </div>
  );
}
