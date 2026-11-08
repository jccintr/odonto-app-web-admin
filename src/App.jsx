import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import AppShell from './components/AppShell.jsx';
import { Alert, Loading } from './components/ui.jsx';
import { BillingProvider } from './context/BillingContext.jsx';
import { useAuth } from './context/AuthContext.jsx';
import AccountPage from './pages/AccountPage.jsx';
import AgendaPage from './pages/AgendaPage.jsx';
import { ForgotPasswordPage, LoginPage, ResetPasswordPage, VerifyEmailPage } from './pages/AuthPages.jsx';
import BudgetPage from './pages/BudgetPage.jsx';
import BudgetsPage from './pages/BudgetsPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import FinancePage from './pages/FinancePage.jsx';
import NoticesPage from './pages/NoticesPage.jsx';
import PatientPage from './pages/PatientPage.jsx';
import PatientsPage from './pages/PatientsPage.jsx';
import ProceduresPage from './pages/ProceduresPage.jsx';
import PayoutsPage from './pages/PayoutsPage.jsx';
import ReportsPage from './pages/ReportsPage.jsx';
import LegalPage from './pages/LegalPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import SignupPage from './pages/SignupPage.jsx';
import SubscriptionPage from './pages/SubscriptionPage.jsx';
import TeamPage from './pages/TeamPage.jsx';

function RequireAuth() {
  const { user, booting, role } = useAuth();
  const location = useLocation();
  if (booting) return <Loading />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  // o dentista usa o aplicativo no celular/tablet; aqui entram administração e secretária
  if (role === 'dentist') return <DentistNotice />;
  return <BillingProvider><AppShell /></BillingProvider>;
}

function DentistNotice() {
  const { logout } = useAuth();
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-4">
      <Alert tone="info">Este painel é da administração e da secretária. Dentistas usam o aplicativo OdontoApp no celular ou tablet.</Alert>
      <button className="text-sm text-primary hover:underline" onClick={logout}>Sair</button>
    </div>
  );
}

function RequireAdmin({ children }) {
  const { isAdmin } = useAuth();
  return isAdmin ? children : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/cadastro" element={<SignupPage />} />
      <Route path="/termos" element={<LegalPage type="terms" />} />
      <Route path="/privacidade" element={<LegalPage type="privacy" />} />
      <Route path="/verificar-email" element={<VerifyEmailPage />} />
      <Route path="/esqueci-senha" element={<ForgotPasswordPage />} />
      <Route path="/redefinir-senha" element={<ResetPasswordPage />} />
      <Route element={<RequireAuth />}>
        <Route index element={<DashboardPage />} />
        <Route path="agenda" element={<AgendaPage />} />
        <Route path="pacientes" element={<PatientsPage />} />
        <Route path="pacientes/:id" element={<PatientPage />} />
        <Route path="orcamentos" element={<BudgetsPage />} />
        <Route path="orcamentos/:id" element={<BudgetPage />} />
        <Route path="financeiro" element={<FinancePage />} />
        <Route path="procedimentos" element={<ProceduresPage />} />
        <Route path="avisos" element={<NoticesPage />} />
        <Route path="conta" element={<AccountPage />} />
        <Route path="repasse" element={<RequireAdmin><PayoutsPage /></RequireAdmin>} />
        <Route path="relatorios" element={<RequireAdmin><ReportsPage /></RequireAdmin>} />
        <Route path="assinatura" element={<RequireAdmin><SubscriptionPage /></RequireAdmin>} />
        <Route path="equipe" element={<RequireAdmin><TeamPage /></RequireAdmin>} />
        <Route path="configuracoes" element={<RequireAdmin><SettingsPage /></RequireAdmin>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
