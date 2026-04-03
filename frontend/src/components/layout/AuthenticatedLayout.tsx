import { Outlet, Navigate } from 'react-router-dom';
import AppSidebar from './AppSidebar';
import TopBar from './TopBar';
import { useAuthStore } from '@/stores/authStore';

export default function AuthenticatedLayout() {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <TopBar />
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
