import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { AUTH_STORAGE_KEYS } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";

import AuthenticatedLayout from "@/components/layout/AuthenticatedLayout";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import RecoverAccessPage from "@/pages/RecoverAccessPage";
import DashboardPage from "@/pages/DashboardPage";
import NewConsultationPage from "@/pages/NewConsultationPage";

import HistoryPage from "@/pages/HistoryPage";
import FinancialPage from "@/pages/FinancialPage";
import TeamPage from "@/pages/TeamPage";
import ProfilePage from "@/pages/ProfilePage";
import AdminPage from "@/pages/AdminPage";
import IntegrationsPage from "@/pages/IntegrationsPage";
import ApiDocsPage from "@/pages/ApiDocsPage";
import TemplatesDrawerPage from "@/pages/TemplatesDrawerPage";
import NotFound from "@/pages/NotFound";
import Index from "@/pages/Index";
import { openRechargeModal } from "@/stores/rechargeModalStore";
import { ThemeRouteObserver } from "@/components/layout/ThemeRouteObserver";
import { SplashScreen } from "@/components/layout/SplashScreen";

function RechargeRouteRedirect() {
  const access = useAuthStore.getState().user?.accessLevel ?? 2;
  if (access <= 1) openRechargeModal();
  return <Navigate to="/financeiro" replace />;
}

function RootRoute() {
  const { isAuthenticated } = useAuthStore();
  const location = useLocation();
  const dest = isAuthenticated ? "/dashboard" : "/index";
  return <Navigate to={`${dest}${location.search}`} replace />;
}

const queryClient = new QueryClient({});

function AuthBootstrap() {
  const hydrate = useAuthStore((s) => s.hydrate);
  useEffect(() => {
    void hydrate();
    const onStorage = (ev: StorageEvent) => {
      if (!ev.key) {
        void hydrate();
        return;
      }
      if (
        ev.key === AUTH_STORAGE_KEYS.TOKEN ||
        ev.key === AUTH_STORAGE_KEYS.USER ||
        ev.key === AUTH_STORAGE_KEYS.PREVIEW
      ) {
        void hydrate();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [hydrate]);
  return null;
}

const App = () => (
  <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <AuthBootstrap />
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <ThemeRouteObserver />
          <SplashScreen />
          <Routes>
            <Route path="/" element={<RootRoute />} />
            <Route path="/index" element={<Index />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/cadastro" element={<RegisterPage />} />
            <Route path="/recuperar-acesso" element={<RecoverAccessPage />} />

            <Route element={<AuthenticatedLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/consulta/nova" element={<NewConsultationPage />} />
              
              <Route path="/consulta/historico" element={<HistoryPage />} />
              <Route path="/financeiro" element={<FinancialPage />} />
              <Route path="/financeiro/recarga" element={<RechargeRouteRedirect />} />
              <Route path="/equipe" element={<TeamPage />} />
              <Route path="/perfil" element={<ProfilePage />} />
              <Route path="/configuracoes" element={<ProfilePage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/admin/canvas" element={<Navigate to="/admin" replace />} />
              <Route path="/admin/integracoes" element={<IntegrationsPage />} />
              <Route path="/admin/templates-drawer" element={<TemplatesDrawerPage />} />
              <Route path="/documentacao/api" element={<ApiDocsPage />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
