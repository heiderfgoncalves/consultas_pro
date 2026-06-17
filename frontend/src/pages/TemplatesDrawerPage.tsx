import { EditorApp } from '@/features/templates-drawer/components/EditorApp';
import { useAuthStore } from '@/stores/authStore';
import { Navigate } from 'react-router-dom';

export default function TemplatesDrawerPage() {
  const { user } = useAuthStore();
  const isPlatformAdmin = user?.backendRole === 'PLATFORM_ADMIN';
  const isCustomerAdmin = user?.backendRole === 'CUSTOMER_ADMIN';

  if (!isPlatformAdmin && !isCustomerAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="w-full h-full bg-background overflow-hidden relative">
      <EditorApp />
    </div>
  );
}
