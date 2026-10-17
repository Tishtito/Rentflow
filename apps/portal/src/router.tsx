import { createBrowserRouter, Navigate } from 'react-router-dom';
import { PortalLayout, PortalPage, SoonCard } from './PortalLayout';
import { AcceptInvitePage } from './pages/AcceptInvitePage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
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
      {
        path: 'bills',
        element: (
          <PortalPage title="Bills">
            <SoonCard title="Your bills">Your bills will show here. For now they're sent to you by email and WhatsApp.</SoonCard>
          </PortalPage>
        ),
      },
      {
        path: 'payments',
        element: (
          <PortalPage title="Payments">
            <SoonCard title="Your payments">Your payment history will show here soon.</SoonCard>
          </PortalPage>
        ),
      },
      { path: 'profile', element: <ProfilePage /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
