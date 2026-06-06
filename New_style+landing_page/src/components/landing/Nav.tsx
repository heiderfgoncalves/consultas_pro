import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";

const links = [
  { label: "Plataforma", href: "#plataforma" },
  { label: "Pipeline", href: "#pipeline" },
  { label: "Integrações", href: "#integracoes" },
  { label: "Templates", href: "#templates" },
  { label: "Docs", href: "#docs" },
];

export function Nav() {
  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.2, 0.7, 0.2, 1] }}
      className="fixed top-0 inset-x-0 z-50 border-b border-hairline bg-background/70 backdrop-blur-xl"
    >
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
        <a href="#" className="flex items-center gap-2 mono text-[12px] tracking-[0.16em] uppercase">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-sm border border-brand/60 bg-brand/10 text-brand text-[10px]">
            ◆
          </span>
          <span className="text-foreground">CONSULTAS</span>
          <span className="text-brand">_PRO</span>
        </a>
        <nav className="hidden md:flex items-center gap-1">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="px-3 py-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors"
            >
              {l.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <a href="#login" className="px-3 py-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors">
            Entrar
          </a>
          <a
            href="#cta"
            className="group inline-flex items-center gap-1 rounded-md bg-brand px-3 py-1.5 text-[13px] font-medium text-primary-foreground shadow-[0_0_24px_-6px_var(--color-brand)] hover:shadow-[0_0_36px_-4px_var(--color-brand)] transition-shadow"
          >
            Começar grátis
            <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </a>
        </div>
      </div>
    </motion.header>
  );
}
