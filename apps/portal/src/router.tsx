import { createBrowserRouter, Navigate } from 'react-router-dom';
import { PortalLayout } from './PortalLayout';
import { AcceptInvitePage } from './pages/AcceptInvitePage';
import { BillPage, BillsPage } from './pages/BillsPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { PaymentsPage } from './pages/PaymentsPage';
import { ProfilePage } from './pages/ProfilePage';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/invite/:token', element: <AcceptInvitePage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  {
    path: '/',
    element: <PortalLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'bills', element: <BillsPage /> },
      { path: 'bills/:invoiceId', element: <BillPage /> },
      { path: 'payments', element: <PaymentsPage /> },
      { path: 'profile', element: <ProfilePage /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
