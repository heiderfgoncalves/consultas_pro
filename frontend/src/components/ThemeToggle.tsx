import { Moon, Sun, Monitor, Palette, Check } from 'lucide-react';
import { useTheme } from '@/hooks/use-theme';
import { useSubTheme, SUB_THEMES, type SubTheme } from '@/hooks/use-subtheme';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

type ThemeToggleProps = {
  triggerClassName?: string;
  contentSide?: 'top' | 'right' | 'bottom' | 'left';
  contentAlign?: 'start' | 'center' | 'end';
  onSubThemeSelect?: (theme: SubTheme) => void;
};

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

export default function ThemeToggle({
  triggerClassName,
  contentSide = 'right',
  contentAlign = 'end',
  onSubThemeSelect,
}: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const { subTheme, setSubTheme } = useSubTheme();
  const activeMode = theme ?? 'dark';

  const ModeIcon = activeMode === 'dark' ? Moon : activeMode === 'light' ? Sun : Monitor;

  const [hue, setHue] = useState<number>(() => {
    const saved = localStorage.getItem('custom-hue');
    if (saved) return parseInt(saved);
    const themeHues: Record<string, number> = {
      classic: 212,
      cyberpunk: 32,
      oceanic: 174,
      emerald: 142,
      minimal: 240,
    };
    return themeHues[subTheme] ?? 174;
  });

  const [shadow, setShadow] = useState<number>(() => {
    const saved = localStorage.getItem('custom-shadow');
    return saved ? parseInt(saved) : 0;
  });

  useEffect(() => {
    const saved = localStorage.getItem('custom-hue');
    if (!saved) {
      const themeHues: Record<string, number> = {
        classic: 212,
        cyberpunk: 32,
        oceanic: 174,
        emerald: 142,
        minimal: 240,
      };
      setHue(themeHues[subTheme] ?? 174);
    }
  }, [subTheme]);

  const applyColors = (currentHue: number, currentShadow: number) => {
    const L = 48 * (1 - currentShadow / 100);
    const rgb = hslToRgb(currentHue, 95, L);
    const themeColor = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
    
    document.documentElement.style.setProperty('--brand', themeColor);
    document.documentElement.style.setProperty('--brand-glow', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.85)`);
    document.documentElement.style.setProperty('--scroll-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
    document.documentElement.style.setProperty('--primary', `${currentHue} 95% ${L}%`);
    document.documentElement.style.setProperty('--ring', `${currentHue} 95% ${L}%`);
    document.documentElement.style.setProperty('--primary-foreground', '0 0% 100%');
    document.documentElement.style.setProperty('--sidebar-primary', `${currentHue} 95% ${L}%`);
    document.documentElement.style.setProperty('--sidebar-primary-foreground', '0 0% 100%');

    // Atualiza as cores de parada do gradiente para o scrollbar
    const sequence = [currentHue, (currentHue + 290) % 360, (currentHue + 150) % 360];
    const stopColors = sequence.map((h) => {
      const stopRgb = hslToRgb(h, 95, L);
      return `rgb(${stopRgb.r}, ${stopRgb.g}, ${stopRgb.b})`;
    });
    document.documentElement.style.setProperty("--rgb-stop-a", stopColors[0]);
    document.documentElement.style.setProperty("--rgb-stop-b", stopColors[1]);
    document.documentElement.style.setProperty("--rgb-stop-c", stopColors[2]);
  };

  const handleHueChange = (newHue: number) => {
    setHue(newHue);
    localStorage.setItem('custom-hue', newHue.toString());
    applyColors(newHue, shadow);

    // Dispara evento para outros componentes que precisem ouvir a mudança
    window.dispatchEvent(new CustomEvent('custom-hue-change', { detail: { hue: newHue, shadow } }));
  };

  const handleShadowChange = (newShadow: number) => {
    setShadow(newShadow);
    localStorage.setItem('custom-shadow', newShadow.toString());
    applyColors(hue, newShadow);

    // Dispara evento para outros componentes que precisem ouvir a mudança
    window.dispatchEvent(new CustomEvent('custom-hue-change', { detail: { hue, shadow: newShadow } }));
  };

  const handleSubThemeSelect = (themeId: SubTheme) => {
    localStorage.removeItem('custom-hue');
    localStorage.removeItem('custom-shadow');
    setSubTheme(themeId);
    setShadow(0);

    // Limpa os estilos inline do documentElement
    document.documentElement.style.removeProperty('--brand');
    document.documentElement.style.removeProperty('--brand-glow');
    document.documentElement.style.removeProperty('--scroll-rgb');
    document.documentElement.style.removeProperty('--primary');
    document.documentElement.style.removeProperty('--ring');
    document.documentElement.style.removeProperty('--primary-foreground');
    document.documentElement.style.removeProperty('--sidebar-primary');
    document.documentElement.style.removeProperty('--sidebar-primary-foreground');
    document.documentElement.style.removeProperty('--rgb-stop-a');
    document.documentElement.style.removeProperty('--rgb-stop-b');
    document.documentElement.style.removeProperty('--rgb-stop-c');

    const themeHues: Record<string, number> = {
      classic: 212,
      cyberpunk: 32,
      oceanic: 174,
      emerald: 142,
      minimal: 240,
    };
    setHue(themeHues[themeId] ?? 174);
    onSubThemeSelect?.(themeId);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "p-2 rounded-lg hover:bg-accent transition-all duration-200 group flex items-center justify-center relative active:scale-95",
            triggerClassName,
          )}
          title="Aparência & Temas"
          aria-label="Abrir troca de tema e cor"
        >
          <ModeIcon className="w-[17px] h-[18px] text-muted-foreground group-hover:text-foreground transition-colors" />
          <span className="absolute bottom-1 right-1 w-1.5 h-1.5 rounded-full border border-background bg-primary shadow-sm" />
        </button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent side={contentSide} align={contentAlign} className="w-56 bg-card/95 backdrop-blur-md border border-border/40 p-1.5 shadow-xl rounded-xl">
        <DropdownMenuLabel className="font-mono text-[9px] tracking-wider text-muted-foreground uppercase px-2 py-1 select-none">
          Aparência do App
        </DropdownMenuLabel>
        
        <DropdownMenuGroup className="grid grid-cols-3 gap-1 p-1">
          {(['light', 'dark', 'system'] as const).map((mode) => {
            const Icon = mode === 'light' ? Sun : mode === 'dark' ? Moon : Monitor;
            const label = mode === 'light' ? 'Claro' : mode === 'dark' ? 'Escuro' : 'Auto';
            const isActive = activeMode === mode;
            return (
              <button
                key={mode}
                onClick={() => setTheme(mode)}
                className={cn(
                  "flex flex-col items-center gap-1 py-1.5 px-1 rounded-md text-[10px] font-medium transition-all duration-150 select-none",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{label}</span>
              </button>
            );
          })}
        </DropdownMenuGroup>
        
        <DropdownMenuSeparator className="bg-border/30 my-1" />
        
        <DropdownMenuLabel className="font-mono text-[9px] tracking-wider text-muted-foreground uppercase px-2 py-1 select-none flex items-center gap-1.5">
          <Palette className="w-3 h-3" /> Paleta de Cores
        </DropdownMenuLabel>
        
        <DropdownMenuGroup className="space-y-0.5">
          {SUB_THEMES.map((themeItem) => {
            const isActive = subTheme === themeItem.id && !localStorage.getItem('custom-hue');
            return (
              <DropdownMenuItem
                key={themeItem.id}
                onClick={() => handleSubThemeSelect(themeItem.id)}
                className={cn(
                  "flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-xs cursor-pointer select-none transition-all duration-150",
                  isActive 
                    ? "bg-accent/50 text-foreground font-semibold" 
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/30"
                )}
              >
                <span className={cn("w-3 h-3 rounded-full flex-shrink-0 shadow-sm", themeItem.color)} />
                <span className="flex-1">{themeItem.label}</span>
                {isActive && <Check className="w-3.5 h-3.5 text-primary" />}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuGroup>

        <DropdownMenuSeparator className="bg-border/30 my-1" />
        
        <DropdownMenuLabel className="font-mono text-[9px] tracking-wider text-muted-foreground uppercase px-2 py-1 select-none flex items-center gap-1.5">
          <Palette className="w-3 h-3" /> Matriz Personalizada
        </DropdownMenuLabel>

        <div className="px-2.5 py-2 space-y-3 select-none">
          {/* Slider de Tonalidade */}
          <div className="space-y-1">
            <div className="relative flex items-center h-5 group/slider select-none">
              <input
                type="range"
                min="0"
                max="360"
                value={hue}
                onChange={(e) => handleHueChange(parseInt(e.target.value))}
                style={{
                  background: 'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)'
                }}
                className="w-full h-2 rounded-full appearance-none cursor-pointer border border-white/5 shadow-inner focus:outline-none spectral-slider"
              />
            </div>
            <div className="flex justify-between items-center text-[8.5px] font-mono text-muted-foreground">
              <span>Tonalidade:</span>
              <span className="text-foreground font-bold">{hue}°</span>
            </div>
          </div>

          {/* Slider de Sombra (Escurecimento) */}
          <div className="space-y-1">
            <div className="relative flex items-center h-5 group/slider select-none">
              <input
                type="range"
                min="0"
                max="80"
                value={shadow}
                onChange={(e) => handleShadowChange(parseInt(e.target.value))}
                style={{
                  background: `linear-gradient(to right, hsl(${hue} 95% 48%) 0%, hsl(${hue} 95% 9.6%) 100%)`
                }}
                className="w-full h-2 rounded-full appearance-none cursor-pointer border border-white/5 shadow-inner focus:outline-none shadow-slider"
              />
            </div>
            <div className="flex justify-between items-center text-[8.5px] font-mono text-muted-foreground">
              <span>Sombra:</span>
              <span className="text-foreground font-bold">{shadow}%</span>
            </div>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
