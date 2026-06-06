const cols = [
  { title: "PLATAFORMA", links: ["Pipeline", "Templates Drawer", "De-Para Engine", "Motor math()", "White-Label"] },
  { title: "INTEGRAÇÕES", links: ["SOLLOS", "Serasa", "Boa Vista", "SCPC", "Ver todas (40+)"] },
  { title: "DOCS", links: ["Visão Geral", "API OpenAPI", "Frontend", "Backend", "Changelog"] },
  { title: "EMPRESA", links: ["Sobre", "Vendas", "Parceiros", "LGPD", "Status"] },
];

export function Footer() {
  return (
    <footer className="border-t border-hairline pt-16 pb-10 relative overflow-hidden bg-gradient-to-b from-background/20 via-surface/40 to-surface/90 dark:from-background/10 dark:via-[#03060a]/40 dark:to-[#020407]/90 backdrop-blur-md">
      {/* Brilho radial dinâmico sutil conectado ao Sintetizador RGB */}
      <div className="absolute -bottom-48 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[radial-gradient(ellipse_at_center,var(--brand-glow),transparent_70%)] opacity-[0.06] dark:opacity-[0.09] pointer-events-none blur-3xl rounded-full" />
      
      {/* Linha gradiente fina neon no topo */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-brand/40 to-transparent opacity-60 pointer-events-none" />

      <div className="mx-auto max-w-7xl px-6 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          <div className="col-span-2">
            <div className="flex items-center gap-2 mono text-[12px] tracking-[0.16em] uppercase">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-sm border border-brand/60 bg-brand/10 text-brand text-[10px]">◆</span>
              <span className="text-foreground">CONSULTAS</span>
              <span className="text-brand">_PRO</span>
            </div>
            <p className="mt-4 text-[13px] text-muted-foreground max-w-sm">
              SaaS modular para emissão de relatórios de crédito sob demanda. Você desenha o layout, escolhe os blocos, e nós entregamos.
            </p>
            <div className="mt-6 mono text-[10px] tracking-[0.18em] uppercase text-muted-foreground">
              v2.0.0 • build {new Date().toISOString().slice(0, 10)}
            </div>
          </div>
          {cols.map((c) => (
            <div key={c.title}>
              <div className="mono text-[10px] tracking-[0.2em] uppercase text-brand">{c.title}</div>
              <ul className="mt-4 space-y-2">
                {c.links.map((l) => (
                  <li key={l}>
                    <a href="#" className="text-[13px] text-muted-foreground hover:text-foreground transition-colors">{l}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-6 mono text-[10px] tracking-[0.18em] uppercase text-muted-foreground">
          <span>© 2026 CONSULTAS_PRO • todos os direitos reservados</span>
          <span className="flex items-center gap-4">
            <a href="#" className="hover:text-foreground transition-colors">PRIVACIDADE</a>
            <a href="#" className="hover:text-foreground transition-colors">TERMOS</a>
            <a href="#" className="hover:text-foreground transition-colors">LGPD</a>
          </span>
        </div>
      </div>
    </footer>
  );
}
