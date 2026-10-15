import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import type { UseQueryResult } from '@tanstack/react-query';

/**
 * Route guard for either portal: pass the "who am I" query (useAdminUser / useTenant).
 * Logged-out visitors go to `loginPath`, which gets the page they wanted in `state.from`.
 */
export function RequireAuth<T>({
  session,
  loginPath,
  fallback = null,
  allow,
  forbidden = null,
  children,
}: {
  session: UseQueryResult<T | null>;
  loginPath: string;
  fallback?: ReactNode; // while checking the session
  allow?: (user: T) => boolean; // e.g. role check
  forbidden?: ReactNode;
  children: ReactNode;
}) {
  const location = useLocation();

  if (session.isPending) return <>{fallback}</>;
  if (!session.data) return <Navigate to={loginPath} replace state={{ from: location.pathname + location.search }} />;
  if (allow && !allow(session.data)) return <>{forbidden}</>;

  return <>{children}</>;
}
