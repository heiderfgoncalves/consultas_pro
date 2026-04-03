import { Bell, Wallet, Plus, User, ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore, accessLevelLabels, type AccessLevel } from '@/stores/authStore';
import { Badge } from '@/components/ui/badge';
import { useState, useRef, useEffect } from 'react';

export default function TopBar() {
  const { user, switchProfile } = useAuthStore();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowProfileMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header className="h-14 border-b border-border bg-card/80 backdrop-blur-md flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <div className="lg:hidden w-10" />
        <h2 className="text-sm font-semibold text-foreground hidden sm:block">
          Olá, {user?.name?.split(' ')[0] || 'Usuário'}
        </h2>
        <Badge variant="outline" className="text-[10px] font-medium border-primary/20 text-primary bg-primary/5 hidden sm:inline-flex">
          {accessLevelLabels[user?.accessLevel ?? 2]}
        </Badge>
      </div>

      <div className="flex items-center gap-2">
        {/* Balance pill */}
        <Link
          to="/financeiro"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-success/10 border border-success/20 hover:bg-success/20 transition-all duration-200 group"
        >
          <Wallet className="w-3.5 h-3.5 text-success" />
          <span className="text-xs font-semibold text-success group-hover:scale-105 transition-transform">
            R$ {user?.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </Link>

        {/* Recharge */}
        <Link
          to="/financeiro/recarga"
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg gradient-primary text-primary-foreground text-xs font-medium hover:opacity-90 hover:shadow-glow transition-all duration-200"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Recarregar</span>
        </Link>

        {/* Notifications */}
        <button className="relative p-2 rounded-lg hover:bg-accent transition-all duration-200 group">
          <Bell className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:scale-110 transition-all" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-destructive animate-pulse" />
        </button>

        {/* Profile switcher */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-accent transition-all duration-200 group"
          >
            <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-xs font-bold group-hover:shadow-glow transition-shadow">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform duration-200 ${showProfileMenu ? 'rotate-180' : ''}`} />
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-card border border-border rounded-xl shadow-elevated py-2 z-50 animate-scale-in">
              <div className="px-3 py-2 border-b border-border">
                <p className="text-xs font-semibold text-foreground">{user?.name}</p>
                <p className="text-[10px] text-muted-foreground">{user?.email}</p>
              </div>
              {user?.backendRole === 'PLATFORM_ADMIN' && (
                <div className="px-1 py-1">
                  <p className="text-[9px] uppercase font-semibold text-muted-foreground px-2 py-1 tracking-wider">Simular perfil (UI)</p>
                  {([0, 1, 2] as AccessLevel[]).map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => { switchProfile(level); setShowProfileMenu(false); }}
                      className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-all duration-200 flex items-center gap-2 ${
                        user?.accessLevel === level ? 'bg-primary/10 text-primary font-semibold' : 'text-foreground hover:bg-accent'
                      }`}
                    >
                      <User className="w-3 h-3" />
                      {accessLevelLabels[level]}
                      {user?.accessLevel === level && <span className="ml-auto text-[9px] bg-primary/20 px-1.5 py-0.5 rounded-full">Ativo</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
