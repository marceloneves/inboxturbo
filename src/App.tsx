import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { I18nProvider } from "@/i18n";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import AppLayout from "./pages/AppLayout";
import MailPage from "./pages/MailPage";
import AccountsPage from "./pages/AccountsPage";
import ProfilePage from "./pages/ProfilePage";
import SettingsPage from "./pages/SettingsPage";
import StatsPage from "./pages/StatsPage";
import PlansPage from "./pages/PlansPage";
import LabelsPage from "./pages/LabelsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <I18nProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/app" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                <Route index element={<Navigate to="/app/inbox" replace />} />
                <Route path="inbox" element={<MailPage folder="inbox" />} />
                <Route path="sent" element={<MailPage folder="sent" />} />
                <Route path="archive" element={<MailPage folder="archive" />} />
                <Route path="trash" element={<MailPage folder="trash" />} />
                <Route path="accounts" element={<AccountsPage />} />
                <Route path="compose" element={<Navigate to="/app/inbox" replace />} />
                <Route path="profile" element={<ProfilePage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="stats" element={<StatsPage />} />
                <Route path="plans" element={<PlansPage />} />
                <Route path="labels" element={<LabelsPage />} />
              </Route>
              {/* Legacy Portuguese routes redirect */}
              <Route path="/cadastro" element={<Navigate to="/signup" replace />} />
              <Route path="/recuperar-senha" element={<Navigate to="/forgot-password" replace />} />
              <Route path="/redefinir-senha" element={<Navigate to="/reset-password" replace />} />
              <Route path="/app/contas" element={<Navigate to="/app/accounts" replace />} />
              <Route path="/app/perfil" element={<Navigate to="/app/profile" replace />} />
              <Route path="/app/configuracoes" element={<Navigate to="/app/settings" replace />} />
              <Route path="/app/estatisticas" element={<Navigate to="/app/stats" replace />} />
              <Route path="/app/planos" element={<Navigate to="/app/plans" replace />} />
              <Route path="/app/arquivo" element={<Navigate to="/app/archive" replace />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </I18nProvider>
  </QueryClientProvider>
);

export default App;
