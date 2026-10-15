import { createBrowserRouter, Navigate } from 'react-router-dom';
import { useAdminUser } from '@rentflow/api';
import { ComingSoon, LoadingState } from '@rentflow/ui';
import { AdminLayout } from './AdminLayout';
import { BillDetailPage } from './pages/BillDetailPage';
import { BillingSettingsPage } from './pages/BillingSettingsPage';
import { LoginPage } from './pages/LoginPage';
import { PaymentsPage } from './pages/PaymentsPage';
import { WhatsAppSettingsPage } from './pages/WhatsAppSettingsPage';
import { homeFor } from './session';

/** "/" sends people to their portal home (or to login). */
function Home() {
  const session = useAdminUser();
  if (session.isPending) return <LoadingState className="min-h-screen" />;
  return <Navigate to={session.data ? homeFor(session.data) : '/login'} replace />;
}

export const router = createBrowserRouter([
  { path: '/', element: <Home /> },
  { path: '/login', element: <LoginPage /> },
  {
    path: '/admin',
    element: <AdminLayout variant="landlord" />,
    children: [
      { index: true, element: <ComingSoon title="Dashboard" /> },
      { path: 'properties', element: <ComingSoon title="Properties & units" /> },
      { path: 'properties/:propertyId', element: <ComingSoon title="Property & units" /> },
      { path: 'tenants', element: <ComingSoon title="Tenants" /> },
      { path: 'readings', element: <ComingSoon title="Meter readings" /> },
      { path: 'bills', element: <ComingSoon title="Bills" description="Open a bill from the Payments list for now." /> },
      { path: 'bills/:invoiceId', element: <BillDetailPage /> },
      { path: 'payments', element: <PaymentsPage /> },
      { path: 'settings/billing', element: <BillingSettingsPage /> },
      { path: 'settings/whatsapp', element: <WhatsAppSettingsPage /> },
      { path: 'team', element: <ComingSoon title="Team & caretakers" /> },
      { path: '*', element: <ComingSoon title="Not found" description="This page doesn't exist." /> },
    ],
  },
  {
    path: '/platform',
    element: <AdminLayout variant="super" />,
    children: [
      { index: true, element: <ComingSoon title="Platform overview" /> },
      { path: 'accounts', element: <ComingSoon title="Landlord accounts" /> },
      { path: '*', element: <ComingSoon title="Coming soon" /> },
    ],
  },
  // Caretaker phone screens are designed (ReadingsPage) but need the meter-readings API.
  { path: '/caretaker/*', element: <Navigate to="/admin/readings" replace /> },
  { path: '*', element: <Navigate to="/" replace /> },
]);
