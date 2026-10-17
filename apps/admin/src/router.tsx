import { createBrowserRouter, Navigate } from 'react-router-dom';
import { can, useAdminUser } from '@rentflow/api';
import { ComingSoon, LoadingState } from '@rentflow/ui';
import { AdminLayout } from './AdminLayout';
import { BillDetailPage } from './pages/BillDetailPage';
import { BillsPage } from './pages/BillsPage';
import { MeterSetupPage } from './pages/MeterSetupPage';
import { DashboardPage } from './pages/DashboardPage';
import { PropertiesPage } from './pages/PropertiesPage';
import { PropertyPage } from './pages/PropertyPage';
import { CaretakerReadingsPage, ReadingsPage } from './pages/ReadingsPage';
import { TenantPage } from './pages/TenantPage';
import { TenantsPage } from './pages/TenantsPage';
import { BillingSettingsPage } from './pages/BillingSettingsPage';
import { AuthPage } from './pages/AuthPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { PaymentsPage } from './pages/PaymentsPage';
import { WhatsAppSettingsPage } from './pages/WhatsAppSettingsPage';
import { RolesPage } from './pages/RolesPage';
import { SetPasswordPage } from './pages/SetPasswordPage';
import { TeamPage } from './pages/TeamPage';
import { PlatformAccountPage } from './pages/platform/PlatformAccountPage';
import { PlatformAccountsPage } from './pages/platform/PlatformAccountsPage';
import { PlatformActivityPage } from './pages/platform/PlatformActivityPage';
import { PlatformAdminsPage } from './pages/platform/PlatformAdminsPage';
import { PlatformBillingRunsPage } from './pages/platform/PlatformBillingRunsPage';
import { PlatformMessagingPage } from './pages/platform/PlatformMessagingPage';
import { PlatformOverviewPage } from './pages/platform/PlatformOverviewPage';
import { PlatformRolesPage } from './pages/platform/PlatformRolesPage';
import { homeFor } from './session';

/** /admin: the dashboard, or (no "dashboard.view") the first section the user may open. */
function AdminHome() {
  const user = useAdminUser().data;
  if (user && !can(user, 'dashboard.view')) {
    const to = homeFor(user);
    return to === '/admin' ? <ComingSoon title="Nothing to show yet" description="Your roles don't include any admin sections. Ask the account owner." /> : <Navigate to={to} replace />;
  }
  return <DashboardPage />;
}

/** "/" sends people to their portal home (or to login). */
function Home() {
  const session = useAdminUser();
  if (session.isPending) return <LoadingState className="min-h-screen" />;
  return <Navigate to={session.data ? homeFor(session.data) : '/login'} replace />;
}

export const router = createBrowserRouter([
  { path: '/', element: <Home /> },
  // One element for both, so switching between them plays the slide instead of remounting.
  { element: <AuthPage />, children: [{ path: '/login' }, { path: '/signup' }] },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/set-password', element: <SetPasswordPage /> },
  {
    path: '/admin',
    element: <AdminLayout variant="landlord" />,
    children: [
      { index: true, element: <AdminHome /> },
      { path: 'properties', element: <PropertiesPage /> },
      { path: 'properties/:propertyId', element: <PropertyPage /> },
      { path: 'properties/:propertyId/meters', element: <MeterSetupPage /> },
      { path: 'tenants', element: <TenantsPage /> },
      { path: 'tenants/:tenantId', element: <TenantPage /> },
      { path: 'readings', element: <ReadingsPage /> },
      { path: 'readings/:unitId', element: <ReadingsPage /> },
      { path: 'bills', element: <BillsPage /> },
      { path: 'bills/:invoiceId', element: <BillDetailPage /> },
      { path: 'payments', element: <PaymentsPage /> },
      { path: 'settings/billing', element: <BillingSettingsPage /> },
      { path: 'settings/whatsapp', element: <WhatsAppSettingsPage /> },
      { path: 'team', element: <TeamPage /> },
      { path: 'team/roles', element: <RolesPage /> },
      { path: '*', element: <ComingSoon title="Not found" description="This page doesn't exist." /> },
    ],
  },
  {
    path: '/platform',
    element: <AdminLayout variant="super" />,
    children: [
      { index: true, element: <PlatformOverviewPage /> },
      { path: 'accounts', element: <PlatformAccountsPage /> },
      { path: 'accounts/:accountId', element: <PlatformAccountPage /> },
      { path: 'billing-runs', element: <PlatformBillingRunsPage /> },
      { path: 'messaging', element: <PlatformMessagingPage /> },
      { path: 'roles', element: <PlatformRolesPage /> },
      { path: 'admins', element: <PlatformAdminsPage /> },
      { path: 'activity', element: <PlatformActivityPage /> },
      { path: '*', element: <ComingSoon title="Not found" description="This page doesn't exist." /> },
    ],
  },
  // Caretaker phone screens (no sidebar).
  { path: '/caretaker/readings', element: <CaretakerReadingsPage /> },
  { path: '/caretaker/readings/:unitId', element: <CaretakerReadingsPage /> },
  { path: '/caretaker/*', element: <Navigate to="/caretaker/readings" replace /> },
  { path: '*', element: <Navigate to="/" replace /> },
]);
