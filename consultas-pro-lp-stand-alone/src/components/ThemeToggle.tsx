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

type ThemeToggleProps = {
  triggerClassName?: string;
  contentSide?: 'top' | 'right' | 'bottom' | 'left';
  contentAlign?: 'start' | 'center' | 'end';
  onSubThemeSelect?: (theme: SubTheme) => void;
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

  const handleSubThemeSelect = (themeId: SubTheme) => {
    setSubTheme(themeId);
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
            const isActive = subTheme === themeItem.id;
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
