import { useEffect, useState } from "react";

export type SubTheme =
  | "classic"
  | "cyberpunk"
  | "oceanic"
  | "emerald"
  | "minimal";

export const SUB_THEMES: Array<{ id: SubTheme; label: string; color: string }> =
  [
    { id: "classic", label: "Classic Blue", color: "bg-[#0070f3]" },
    { id: "cyberpunk", label: "Signal Amber", color: "bg-[#f59e0b]" },
    { id: "oceanic", label: "Oceanic Teal", color: "bg-[#0d9488]" },
    { id: "emerald", label: "Emerald Compozy", color: "bg-[#10b981]" },
    {
      id: "minimal",
      label: "Minimal Monochrome",
      color: "bg-[#ffffff] dark:bg-white border border-border",
    },
  ];

const THEME_CLASSES: SubTheme[] = [
  "classic",
  "cyberpunk",
  "oceanic",
  "emerald",
  "minimal",
];

export function useSubTheme() {
  const [subTheme, setSubThemeState] = useState<SubTheme>(() => {
    const saved = localStorage.getItem("sub-theme") as SubTheme;
    return THEME_CLASSES.includes(saved) ? saved : "classic";
  });

  const setSubTheme = (newTheme: SubTheme) => {
    setSubThemeState(newTheme);
    localStorage.setItem("sub-theme", newTheme);

    // Atualiza as classes no documentElement para herança global de variáveis CSS
    THEME_CLASSES.forEach((themeName) => {
      document.documentElement.classList.remove(`theme-${themeName}`);
    });
    document.documentElement.classList.add(`theme-${newTheme}`);

    window.dispatchEvent(
      new CustomEvent("sub-theme-change", { detail: newTheme }),
    );
  };

  useEffect(() => {
    const handleSubThemeChange = (e: Event) => {
      const customEvent = e as CustomEvent<SubTheme>;
      setSubThemeState(customEvent.detail);
    };
    window.addEventListener("sub-theme-change", handleSubThemeChange);
    return () =>
      window.removeEventListener("sub-theme-change", handleSubThemeChange);
  }, []);

  useEffect(() => {
    // Sincroniza a classe inicialmente no carregamento do componente
    THEME_CLASSES.forEach((themeName) => {
      document.documentElement.classList.remove(`theme-${themeName}`);
    });
    document.documentElement.classList.add(`theme-${subTheme}`);
  }, [subTheme]);

  return { subTheme, setSubTheme };
}
