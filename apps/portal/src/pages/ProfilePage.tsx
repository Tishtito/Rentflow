import { useNavigate } from 'react-router-dom';
import { useTenant, useTenantLogout } from '@rentflow/api';
import { Button } from '@rentflow/ui';
import { PortalPage } from '../PortalLayout';

export function ProfilePage() {
  const tenant = useTenant().data;
  const logout = useTenantLogout();
  const navigate = useNavigate();
  if (!tenant) return null;

  return (
    <PortalPage title="Profile">
      <section className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-5">
        <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[15px]">
          <dt className="text-muted">Name</dt>
          <dd className="m-0 font-medium">{tenant.full_name}</dd>
          <dt className="text-muted">Phone</dt>
          <dd className="m-0">{tenant.phone}</dd>
          <dt className="text-muted">Email</dt>
          <dd className="m-0 break-all">{tenant.email ?? '—'}</dd>
          <dt className="text-muted">Landlord</dt>
          <dd className="m-0">{tenant.account.name}</dd>
        </dl>
      </section>
      <Button size="xl" onClick={() => logout.mutate(undefined, { onSettled: () => navigate('/login', { replace: true }) })} disabled={logout.isPending}>
        Log out
      </Button>
    </PortalPage>
  );
}
