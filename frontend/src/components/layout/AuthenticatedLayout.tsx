import { Outlet, Navigate, useLocation } from 'react-router-dom';
import AppSidebar from './AppSidebar';
import TopBar from './TopBar';
import RechargeModal from '@/components/finance/RechargeModal';
import { useAuthStore } from '@/stores/authStore';

function isApiDocsPath(pathname: string) {
  return pathname === '/documentacao/api' || pathname.startsWith('/documentacao/api/');
}

export default function AuthenticatedLayout() {
  const { isAuthenticated } = useAuthStore();
  const { pathname } = useLocation();
  const hideTopBar = isApiDocsPath(pathname);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <RechargeModal />
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden relative min-w-0">
        {!hideTopBar && <TopBar />}
        {hideTopBar ? (
          <main className="flex-1 min-h-0 overflow-y-auto scrollbar-thin">
            <div className="p-3 lg:p-4">
              <Outlet />
            </div>
          </main>
        ) : (
          <main className="flex-1 overflow-y-auto scrollbar-thin">
            <div className="p-6 lg:p-8">
              <Outlet />
            </div>
          </main>
        )}
      </div>
    </div>
  );
}
