import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { ReactNode } from 'react';

/**
 * Tema via next-themes (padrão shadcn + Vite): classe `light` | `dark` no `html`,
 * `disableTransitionOnChange` evita animar todas as cores do app na troca.
 * @see https://v3.shadcn.com/docs/dark-mode/vite
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      storageKey="theme"
      disableTransitionOnChange
      enableColorScheme
    >
      {children}
    </NextThemesProvider>
  );
}
