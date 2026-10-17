import { Link, useNavigate } from 'react-router-dom';
import { RequireAuth, useAdminLogout, useAdminUser } from '@rentflow/api';
import type { AuthUser } from '@rentflow/core';
import { AdminShell, LoadingState, superAdminNav } from '@rentflow/ui';
import { actingAccount, setActingAccount } from './acting';
import { allowedNav, initials, roleLabel } from './session';

/**
 * Logged-in frame for /admin (staff of a landlord account, or a super admin acting inside one) and
 * /platform (super admins). The nav shows only what the user's roles allow.
 */
export function AdminLayout({ variant }: { variant: 'landlord' | 'super' }) {
  const session = useAdminUser();
  const logout = useAdminLogout();
  const navigate = useNavigate();
  const acting = actingAccount();

  const allow = (user: AuthUser) =>
    variant === 'super' ? user.role === 'super_admin' : user.role === 'staff' || (user.role === 'super_admin' && acting !== null);

  return (
    <RequireAuth session={session} loginPath="/login" fallback={<LoadingState className="min-h-screen" />} allow={allow} forbidden={<Forbidden />}>
      {session.data && (
        <>
          {variant === 'landlord' && session.data.role === 'super_admin' && acting && (
            <div role="status" className="sticky top-0 z-40 flex flex-wrap items-center justify-center gap-3 bg-gold-soft px-4 py-2 text-sm text-gold-ink">
              <span>
                Acting in <strong>{acting.name}</strong> as a platform admin · your actions are logged
              </span>
              <button
                type="button"
                className="min-h-touch rounded-md px-2 font-semibold underline"
                onClick={() => {
                  setActingAccount(null);
                  navigate('/platform/accounts');
                }}
              >
                Exit
              </button>
            </div>
          )}
          <AdminShell
            variant={variant}
            accountName={variant === 'landlord' && session.data.role === 'super_admin' ? acting?.name : undefined}
            nav={variant === 'super' ? superAdminNav : allowedNav(session.data)}
            user={{ name: session.data.name, roleLabel: roleLabel(session.data), initials: initials(session.data.name) }}
            onLogout={() =>
              logout.mutate(undefined, {
                onSettled: () => {
                  setActingAccount(null);
                  navigate('/login', { replace: true });
                },
              })
            }
          />
        </>
      )}
    </RequireAuth>
  );
}

function Forbidden() {
  return (
    <main className="mx-auto flex max-w-[480px] flex-col gap-3 px-6 py-16 text-center">
      <h1 className="m-0 font-display text-2xl font-bold">Not available</h1>
      <p className="m-0 text-muted">Your login doesn&apos;t have access to this part of Rentflow.</p>
      <Link to="/">Go to your home page</Link>
    </main>
  );
}
