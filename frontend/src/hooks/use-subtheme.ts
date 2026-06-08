import { useEffect, useState } from 'react';

export type SubTheme = 'classic' | 'cyberpunk' | 'oceanic' | 'emerald' | 'minimal';

export const SUB_THEMES: Array<{ id: SubTheme; label: string; color: string }> = [
  { id: 'classic', label: 'Classic Blue', color: 'bg-[#0070f3]' },
  { id: 'cyberpunk', label: 'Cyberpunk', color: 'bg-[#a855f7]' },
  { id: 'oceanic', label: 'Oceanic Teal', color: 'bg-[#0d9488]' },
  { id: 'emerald', label: 'Emerald Compozy', color: 'bg-[#10b981]' },
  { id: 'minimal', label: 'Minimal Monochrome', color: 'bg-[#ffffff] dark:bg-white border border-border' },
];

const THEME_CLASSES: SubTheme[] = ['classic', 'cyberpunk', 'oceanic', 'emerald', 'minimal'];

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

export function useSubTheme() {
  const [subTheme, setSubThemeState] = useState<SubTheme>(() => {
    const saved = localStorage.getItem('sub-theme') as SubTheme;
    return THEME_CLASSES.includes(saved) ? saved : 'classic';
  });

  const setSubTheme = (newTheme: SubTheme) => {
    setSubThemeState(newTheme);
    localStorage.setItem('sub-theme', newTheme);
    
    // Atualiza as classes no documentElement para herança global de variáveis CSS
    THEME_CLASSES.forEach((themeName) => {
      document.documentElement.classList.remove(`theme-${themeName}`);
    });
    document.documentElement.classList.add(`theme-${newTheme}`);

    window.dispatchEvent(new CustomEvent('sub-theme-change', { detail: newTheme }));
  };

  useEffect(() => {
    const handleSubThemeChange = (e: Event) => {
      const customEvent = e as CustomEvent<SubTheme>;
      setSubThemeState(customEvent.detail);
    };
    window.addEventListener('sub-theme-change', handleSubThemeChange);
    return () => window.removeEventListener('sub-theme-change', handleSubThemeChange);
  }, []);

  useEffect(() => {
    // Sincroniza a classe inicialmente no carregamento do componente
    THEME_CLASSES.forEach((themeName) => {
      document.documentElement.classList.remove(`theme-${themeName}`);
    });
    document.documentElement.classList.add(`theme-${subTheme}`);
  }, [subTheme]);

  // Sincroniza e aplica a cor de Hue customizada do localStorage
  useEffect(() => {
    const applyCustomHue = () => {
      const savedHue = localStorage.getItem('custom-hue');
      if (savedHue) {
        const hueVal = parseInt(savedHue);
        const rgb = hslToRgb(hueVal, 95, 48);
        const themeColor = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
        
        document.documentElement.style.setProperty('--brand', themeColor);
        document.documentElement.style.setProperty('--brand-glow', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.85)`);
        document.documentElement.style.setProperty('--scroll-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);

        const sequence = [hueVal, (hueVal + 290) % 360, (hueVal + 150) % 360];
        const stopColors = sequence.map((h) => {
          const stopRgb = hslToRgb(h, 95, 48);
          return `rgb(${stopRgb.r}, ${stopRgb.g}, ${stopRgb.b})`;
        });
        document.documentElement.style.setProperty("--rgb-stop-a", stopColors[0]);
        document.documentElement.style.setProperty("--rgb-stop-b", stopColors[1]);
        document.documentElement.style.setProperty("--rgb-stop-c", stopColors[2]);
      }
    };

    applyCustomHue();

    // Ouve alterações no custom-hue vindo do slider
    const handleCustomHueChange = () => {
      applyCustomHue();
    };

    window.addEventListener('custom-hue-change', handleCustomHueChange);
    window.addEventListener('custom-hue-reset', handleCustomHueChange);
    return () => {
      window.removeEventListener('custom-hue-change', handleCustomHueChange);
      window.removeEventListener('custom-hue-reset', handleCustomHueChange);
    };
  }, []);

  return { subTheme, setSubTheme };
}
