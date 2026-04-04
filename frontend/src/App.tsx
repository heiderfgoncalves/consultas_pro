import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
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
import NotFound from "@/pages/NotFound";
import { openRechargeModal } from "@/stores/rechargeModalStore";

function RechargeRouteRedirect() {
  const access = useAuthStore.getState().user?.accessLevel ?? 2;
  if (access <= 1) openRechargeModal();
  return <Navigate to="/financeiro" replace />;
}

const queryClient = new QueryClient({});

function AuthBootstrap() {
  const hydrate = useAuthStore((s) => s.hydrate);
  useEffect(() => {
    void hydrate();
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
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
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
