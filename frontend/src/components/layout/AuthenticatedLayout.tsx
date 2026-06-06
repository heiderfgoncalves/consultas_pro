import { Outlet, Navigate, useLocation } from 'react-router-dom';
import AppSidebar from './AppSidebar';
import TopBar from './TopBar';
import RechargeModal from '@/components/finance/RechargeModal';
import { useAuthStore } from '@/stores/authStore';
import { useSubTheme } from '@/hooks/use-subtheme';
import { PageTransition } from '@/components/layout/PageTransition';

function isFullScreenPath(pathname: string) {
  return pathname === '/documentacao/api' || 
         pathname.startsWith('/documentacao/api/') || 
         pathname === '/admin/templates-drawer';
}

export default function AuthenticatedLayout() {
  const { hydrated, isAuthenticated } = useAuthStore();
  const { pathname } = useLocation();
  const hideTopBar = isFullScreenPath(pathname);
  const isTemplatesDrawer = pathname === '/admin/templates-drawer';

  if (!hydrated) {
    if (isTemplatesDrawer) {
      return null;
    }
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div
          className="h-9 w-9 rounded-full border-2 border-muted-foreground/25 border-t-primary animate-spin"
          aria-hidden
        />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background relative font-sans text-foreground isolate">

      <RechargeModal />
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden relative min-w-0 bg-transparent">
        {!hideTopBar && <TopBar />}
        {hideTopBar ? (
          <main className={isTemplatesDrawer ? "flex-1 min-h-0" : "flex-1 min-h-0 overflow-y-auto scrollbar-thin"}>
            <div className={isTemplatesDrawer ? "h-full w-full relative overflow-hidden" : "p-3 lg:p-4"}>
              <PageTransition key={pathname}><Outlet /></PageTransition>
            </div>
          </main>
        ) : (
          <main className="flex-1 overflow-y-auto scrollbar-thin">
            <div className="p-4 lg:p-5">
              <PageTransition key={pathname}><Outlet /></PageTransition>
            </div>
          </main>
        )}
      </div>
    </div>
  );
}
