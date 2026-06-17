import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, Menu, X } from 'lucide-react';
import { useState } from 'react';
import ThemeToggle from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/authStore';

export function PublicHeader() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { user } = useAuthStore();

  const links = [
    { name: 'Início', path: '/' },
    { name: 'Planos', path: '/planos' },
    { name: 'Sobre Nós', path: '/sobre' },
  ];

  return (
    <header className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-md border-b border-border/40">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <div className="p-2 bg-brand/10 text-brand rounded-xl border border-brand/20 shadow-sm flex items-center justify-center">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <span className="text-xl font-mono font-bold tracking-tight text-foreground">
            CONSULTAS<span className="text-brand">PRO</span>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8 font-mono text-sm">
          {links.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`transition-colors hover:text-brand ${
                location.pathname === link.path ? 'text-brand font-bold' : 'text-muted-foreground'
              }`}
            >
              {link.name}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-4">
          <ThemeToggle />
          <div className="h-6 w-px bg-border/50" />
          {user ? (
            <Link to="/dashboard">
              <Button variant="default" className="font-mono font-bold">Painel</Button>
            </Link>
          ) : (
            <>
              <Link to="/login" className="text-sm font-mono font-bold text-muted-foreground hover:text-foreground">
                Entrar
              </Link>
              <Link to="/cadastro">
                <Button variant="default" className="font-mono font-bold bg-brand hover:bg-brand/90 text-primary-foreground">
                  Começar Grátis
                </Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile Toggle */}
        <div className="md:hidden flex items-center gap-4">
          <ThemeToggle />
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-foreground p-2">
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden absolute top-20 left-0 w-full bg-background border-b border-border shadow-xl p-6 flex flex-col gap-6"
        >
          {links.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => setIsMobileMenuOpen(false)}
              className={`text-lg font-mono ${
                location.pathname === link.path ? 'text-brand font-bold' : 'text-foreground'
              }`}
            >
              {link.name}
            </Link>
          ))}
          <div className="h-px w-full bg-border" />
          <div className="flex flex-col gap-4">
            {user ? (
              <Link to="/dashboard" onClick={() => setIsMobileMenuOpen(false)}>
                <Button className="w-full font-mono font-bold">Painel</Button>
              </Link>
            ) : (
              <>
                <Link to="/login" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button variant="outline" className="w-full font-mono font-bold">Entrar</Button>
                </Link>
                <Link to="/cadastro" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button className="w-full font-mono font-bold bg-brand text-primary-foreground">Começar Grátis</Button>
                </Link>
              </>
            )}
          </div>
        </motion.div>
      )}
    </header>
  );
}
