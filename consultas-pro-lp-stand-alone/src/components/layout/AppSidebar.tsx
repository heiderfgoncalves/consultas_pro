import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Search, History, Receipt,
  Users, UserCircle, LogOut, Settings,
  Menu, X, Shield, PanelLeftClose, PanelLeft, Server, BookOpen,
  ChevronDown, ClipboardList,
} from 'lucide-react';
import { useAuthStore, accessLevelLabels } from '@/stores/authStore';
import ThemeToggle from '@/components/ThemeToggle';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

const navItems = [
  { label: 'Início', icon: LayoutDashboard, path: '/dashboard', minLevel: 2 },
  { label: 'Nova Consulta', icon: Search, path: '/consulta/nova', minLevel: 2 },

  { label: 'Histórico', icon: History, path: '/consulta/historico', minLevel: 2 },
  { label: 'Financeiro', icon: Receipt, path: '/financeiro', minLevel: 1 },
  { label: 'Equipe', icon: Users, path: '/equipe', minLevel: 1 },
  { label: 'Documentação API', icon: BookOpen, path: '/documentacao/api', minLevel: 2, apiDocsOnly: true },
  { label: 'Perfil', icon: UserCircle, path: '/perfil', minLevel: 2 },
];

const adminSubItems = [
  { label: 'Painel', icon: LayoutDashboard, path: '/admin' as const },
  { label: 'Templates Drawer', icon: ClipboardList, path: '/admin/templates-drawer' as const },
  { label: 'Integrações', icon: Server, path: '/admin/integracoes' as const },
];

function isAdminSubActive(path: string, pathname: string) {
  if (path === '/admin') return pathname === '/admin';
  return pathname === path || pathname.startsWith(`${path}/`);
}

export default function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const isPlatformAdmin = user?.backendRole === 'PLATFORM_ADMIN';
  const adminSectionActive = location.pathname.startsWith('/admin');

  useEffect(() => {
    if (adminSectionActive) setAdminOpen(true);
  }, [adminSectionActive]);

  const filteredItems = navItems.filter((item) => {
    if ('apiDocsOnly' in item && item.apiDocsOnly) {
      const r = user?.backendRole;
      if (!r || !['PLATFORM_ADMIN', 'COMPANY_OWNER', 'COMPANY_MANAGER'].includes(r)) return false;
    }
    const level = user?.accessLevel ?? 2;
    return level <= item.minLevel;
  });

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navLinkClass = (active: boolean) =>
    cn(
      'group flex items-center gap-2 px-2 py-1.5 rounded-md text-[11.5px] font-normal tracking-wide transition-all duration-150 w-full select-none',
      active
        ? 'bg-sidebar-primary text-sidebar-primary-foreground font-medium shadow-[0_2px_8px_rgba(var(--primary),0.15)] hover:translate-x-[1px]'
        : 'text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent/45 hover:translate-x-[1px]',
    );

  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className="flex flex-col h-full">
      {!collapsed && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-3.5 py-3 border-b border-sidebar-border/30 bg-sidebar-accent/10">
          <p className="text-[11px] font-semibold text-sidebar-foreground/90 truncate tracking-wide uppercase">{user?.name}</p>
          <p className="text-[9px] font-mono text-sidebar-muted/75 truncate mt-0.5 tracking-wider uppercase">{accessLevelLabels[user?.accessLevel ?? 2]}</p>
          <div className="mt-1.5 flex items-center gap-1.5 select-none" aria-hidden="true">
            <span className="w-1 h-1 rounded-full bg-primary animate-pulse" />
            <span className="font-mono text-[8px] tracking-[0.1em] text-primary/80 uppercase">AI Node Active</span>
          </div>
        </motion.div>
      )}

      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto scrollbar-thin">
        {filteredItems.map((item) => {
          const isActive = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={navLinkClass(isActive)}
            >
              <item.icon className={cn('w-3.5 h-3.5 flex-shrink-0 transition-transform duration-200', !isActive && 'group-hover:scale-110')} />
              <AnimatePresence>
                {(!collapsed || isMobile) && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    className="overflow-hidden whitespace-nowrap"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          );
        })}

        {isPlatformAdmin && (
          <>
            {collapsed && !isMobile ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    title="Admin"
                    className={navLinkClass(adminSectionActive)}
                  >
                    <Shield className="w-4 h-4 flex-shrink-0" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="right" align="start" className="w-48">
                  {adminSubItems.map((sub) => {
                    const active = isAdminSubActive(sub.path, location.pathname);
                    return (
                      <DropdownMenuItem
                        key={sub.path}
                        className={cn(active && 'bg-accent')}
                        onClick={() => navigate(sub.path)}
                      >
                        <sub.icon className="mr-2 h-4 w-4" />
                        {sub.label}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Collapsible open={adminOpen} onOpenChange={setAdminOpen}>
                <CollapsibleTrigger
                  type="button"
                  className={cn(
                    'flex w-full items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 hover:text-sidebar-foreground hover:bg-sidebar-accent',
                    adminSectionActive
                      ? 'bg-sidebar-accent/50 text-sidebar-foreground'
                      : 'text-sidebar-muted',
                  )}
                >
                  <Shield className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1 text-left overflow-hidden whitespace-nowrap">Admin</span>
                  <ChevronDown className={cn('w-4 h-4 flex-shrink-0 transition-transform', adminOpen && 'rotate-180')} />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-0.5 pt-0.5 pl-2">
                  {adminSubItems.map((sub) => {
                    const isActive = isAdminSubActive(sub.path, location.pathname);
                    return (
                      <Link
                        key={sub.path}
                        to={sub.path}
                        onClick={() => setMobileOpen(false)}
                        className={cn(navLinkClass(isActive), 'pl-6')}
                      >
                        <sub.icon className={cn('w-3.5 h-3.5 flex-shrink-0', !isActive && 'group-hover:scale-110')} />
                        <span className="overflow-hidden whitespace-nowrap">{sub.label}</span>
                      </Link>
                    );
                  })}
                </CollapsibleContent>
              </Collapsible>
            )}
          </>
        )}
      </nav>

      <div className="px-2 py-3 border-t border-sidebar-border space-y-0.5">
        <div className="flex items-center justify-center px-1 py-1">
          <ThemeToggle />
        </div>
        <Link
          to="/configuracoes"
          onClick={() => setMobileOpen(false)}
          className="group flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent transition-all duration-200"
        >
          <Settings className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
          {(!collapsed || isMobile) && <span>Configurações</span>}
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          className="group flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] text-sidebar-muted hover:text-destructive hover:bg-sidebar-accent transition-all duration-200 w-full"
        >
          <LogOut className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform duration-200" />
          {(!collapsed || isMobile) && <span>Sair</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-xl bg-card shadow-elevated border border-border hover:bg-accent transition-colors"
      >
        <Menu className="w-5 h-5 text-foreground" />
      </button>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-foreground/50 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -240 }}
              animate={{ x: 0 }}
              exit={{ x: -240 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed left-0 top-0 bottom-0 w-[240px] z-50 gradient-sidebar lg:hidden"
            >
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="absolute top-3 right-3 p-1.5 rounded-lg text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              <SidebarContent isMobile />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <aside
        className={cn(
          'hidden lg:flex flex-col gradient-sidebar transition-all duration-300 relative',
          collapsed ? 'w-[56px]' : 'w-[200px]',
        )}
      >
        <SidebarContent />
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="absolute top-3 -right-3 w-6 h-6 rounded-full bg-card border border-border shadow-elevated flex items-center justify-center hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-200 z-10 group"
          title={collapsed ? 'Expandir' : 'Recolher'}
        >
          {collapsed ? (
            <PanelLeft className="w-3 h-3 text-muted-foreground group-hover:text-primary-foreground transition-colors" />
          ) : (
            <PanelLeftClose className="w-3 h-3 text-muted-foreground group-hover:text-primary-foreground transition-colors" />
          )}
        </button>
      </aside>
    </>
  );
}
