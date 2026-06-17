import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';

export function Footer() {
  return (
    <footer className="w-full border-t border-hairline bg-background/50 backdrop-blur-md relative z-10 font-mono">
      <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-brand" />
          <span className="text-sm font-bold tracking-tight text-foreground">
            CONSULTAS<span className="text-brand">PRO</span>
          </span>
        </div>
        <div className="flex items-center gap-6 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground transition-colors">Início</Link>
          <Link to="/planos" className="hover:text-foreground transition-colors">Planos</Link>
          <Link to="/sobre" className="hover:text-foreground transition-colors">Sobre Nós</Link>
        </div>
        <div className="text-xs text-muted-foreground/60">
          © {new Date().getFullYear()} Consultas PRO. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  );
}
