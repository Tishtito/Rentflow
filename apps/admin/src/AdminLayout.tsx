import { Link, useNavigate } from 'react-router-dom';
import { RequireAuth, useAdminLogout, useAdminUser } from '@rentflow/api';
import type { AuthUser } from '@rentflow/core';
import { AdminShell, LoadingState, landlordNav, superAdminNav } from '@rentflow/ui';
import { caretakerPaths, initials, roleLabel } from './session';

/** Logged-in frame for /admin (landlords, caretakers) and /platform (super admins). */
export function AdminLayout({ variant }: { variant: 'landlord' | 'super' }) {
  const session = useAdminUser();
  const logout = useAdminLogout();
  const navigate = useNavigate();

  const allow = (user: AuthUser) => (variant === 'super' ? user.role === 'super_admin' : user.role !== 'super_admin');

  return (
    <RequireAuth
      session={session}
      loginPath="/login"
      fallback={<LoadingState className="min-h-screen" />}
      allow={allow}
      forbidden={<Forbidden />}
    >
      {session.data && (
        <AdminShell
          variant={variant}
          nav={
            variant === 'super'
              ? superAdminNav
              : session.data.role === 'caretaker'
                ? landlordNav.filter((n) => caretakerPaths.includes(n.to))
                : landlordNav
          }
          user={{ name: session.data.name, roleLabel: roleLabel[session.data.role], initials: initials(session.data.name) }}
          onLogout={() => logout.mutate(undefined, { onSettled: () => navigate('/login', { replace: true }) })}
        />
      )}
    </RequireAuth>
  );
}

function Forbidden() {
  return (
    <main className="mx-auto flex max-w-[480px] flex-col gap-3 px-6 py-16 text-center">
      <h1 className="m-0 font-display text-2xl font-bold">Not available</h1>
      <p className="m-0 text-muted">Your login doesn't have access to this part of Rentflow.</p>
      <Link to="/">Go to your home page</Link>
    </main>
  );
}
