import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Search, FileText, History, Receipt,
  Wallet, Users, UserCircle, LogOut, Settings,
  Menu, X, Shield, Code2, PanelLeftClose, PanelLeft, Server, BookOpen
} from 'lucide-react';
import { useAuthStore, accessLevelLabels } from '@/stores/authStore';
import ThemeToggle from '@/components/ThemeToggle';

const navItems = [
  { label: 'Início', icon: LayoutDashboard, path: '/dashboard', minLevel: 2 },
  { label: 'Nova Consulta', icon: Search, path: '/consulta/nova', minLevel: 2 },
  
  { label: 'Histórico', icon: History, path: '/consulta/historico', minLevel: 2 },
  { label: 'Financeiro', icon: Receipt, path: '/financeiro', minLevel: 1 },
  { label: 'Recarregar', icon: Wallet, path: '/financeiro/recarga', minLevel: 1 },
  { label: 'Equipe', icon: Users, path: '/equipe', minLevel: 1 },
  { label: 'Admin', icon: Shield, path: '/admin', minLevel: 0, adminOnly: true },
  { label: 'Editor Canvas', icon: Code2, path: '/admin/canvas', minLevel: 0, adminOnly: true },
  { label: 'Integrações', icon: Server, path: '/admin/integracoes', minLevel: 0, adminOnly: true },
  { label: 'Documentação API', icon: BookOpen, path: '/documentacao/api', minLevel: 2, apiDocsOnly: true },
  { label: 'Perfil', icon: UserCircle, path: '/perfil', minLevel: 2 },
];

export default function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const filteredItems = navItems.filter(item => {
    if ('adminOnly' in item && item.adminOnly && user?.backendRole !== 'PLATFORM_ADMIN') return false;
    if ('apiDocsOnly' in item && item.apiDocsOnly) {
      const r = user?.backendRole;
      if (!r || !['PLATFORM_ADMIN', 'COMPANY_OWNER', 'COMPANY_MANAGER'].includes(r)) return false;
    }
    const level = user?.accessLevel ?? 2;
    return level <= item.minLevel;
  });

  const handleLogout = () => { logout(); navigate('/login'); };

  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className="flex flex-col h-full">
      {/* Compact header — no logo */}
      {!collapsed && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-3 py-3 border-b border-sidebar-border">
          <p className="text-xs font-semibold text-sidebar-foreground truncate">{user?.name}</p>
          <p className="text-[10px] text-sidebar-muted truncate">{accessLevelLabels[user?.accessLevel ?? 2]}</p>
        </motion.div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto scrollbar-thin">
        {filteredItems.map((item) => {
          const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={`group flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 ${
                isActive ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-glow' : 'text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent'
              }`}
            >
              <item.icon className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${!isActive ? 'group-hover:scale-110' : ''}`} />
              <AnimatePresence>
                {(!collapsed || isMobile) && (
                  <motion.span initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }} className="overflow-hidden whitespace-nowrap">
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-2 py-3 border-t border-sidebar-border space-y-0.5">
        <div className="flex items-center justify-center px-1 py-1"><ThemeToggle /></div>
        <Link to="/configuracoes" onClick={() => setMobileOpen(false)} className="group flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent transition-all duration-200">
          <Settings className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
          {(!collapsed || isMobile) && <span>Configurações</span>}
        </Link>
        <button onClick={handleLogout} className="group flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] text-sidebar-muted hover:text-destructive hover:bg-sidebar-accent transition-all duration-200 w-full">
          <LogOut className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform duration-200" />
          {(!collapsed || isMobile) && <span>Sair</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      <button onClick={() => setMobileOpen(true)} className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-xl bg-card shadow-elevated border border-border hover:bg-accent transition-colors">
        <Menu className="w-5 h-5 text-foreground" />
      </button>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-foreground/50 backdrop-blur-sm z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
            <motion.aside initial={{ x: -240 }} animate={{ x: 0 }} exit={{ x: -240 }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} className="fixed left-0 top-0 bottom-0 w-[240px] z-50 gradient-sidebar lg:hidden">
              <button onClick={() => setMobileOpen(false)} className="absolute top-3 right-3 p-1.5 rounded-lg text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"><X className="w-4 h-4" /></button>
              <SidebarContent isMobile />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <aside className={`hidden lg:flex flex-col gradient-sidebar transition-all duration-300 relative ${collapsed ? 'w-[56px]' : 'w-[200px]'}`}>
        <SidebarContent />
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute top-3 -right-3 w-6 h-6 rounded-full bg-card border border-border shadow-elevated flex items-center justify-center hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-200 z-10 group"
          title={collapsed ? 'Expandir' : 'Recolher'}
        >
          {collapsed ? <PanelLeft className="w-3 h-3 text-muted-foreground group-hover:text-primary-foreground transition-colors" /> : <PanelLeftClose className="w-3 h-3 text-muted-foreground group-hover:text-primary-foreground transition-colors" />}
        </button>
      </aside>
    </>
  );
}
