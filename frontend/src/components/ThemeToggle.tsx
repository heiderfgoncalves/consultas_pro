import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from '@/hooks/use-theme';

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const active = theme ?? 'dark';

  const next = () => {
    const order: Array<'light' | 'dark' | 'system'> = ['light', 'dark', 'system'];
    const idx = order.indexOf(active);
    setTheme(order[(idx + 1) % 3]);
  };

  const Icon = active === 'dark' ? Moon : active === 'light' ? Sun : Monitor;

  return (
    <button
      onClick={next}
      className="p-2 rounded-lg hover:bg-accent transition-all duration-200 group"
      title={`Tema: ${active}`}
    >
      <Icon className="w-[18px] h-[18px] text-muted-foreground group-hover:text-foreground transition-colors" />
    </button>
  );
}
