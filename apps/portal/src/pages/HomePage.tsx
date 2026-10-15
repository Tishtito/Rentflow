import { useNavigate } from 'react-router-dom';
import { useTenant, useTenantLogout } from '@rentflow/api';
import { Button } from '@rentflow/ui';
import { SoonCard } from '../PortalLayout';

/** Tenant home. The bill and payments cards (AmountDueCard, TenantBillCard…) wait for the portal bills API. */
export function HomePage() {
  const tenant = useTenant().data;
  const logout = useTenantLogout();
  const navigate = useNavigate();
  if (!tenant) return null;

  return (
    <>
      <header className="flex items-center justify-between gap-3 px-5 pb-2 pt-6">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm text-muted">Hi {tenant.first_name}</span>
          <span className="font-display text-[22px] font-bold">{tenant.account.name}</span>
        </div>
        <Button variant="ghost" onClick={() => logout.mutate(undefined, { onSettled: () => navigate('/login', { replace: true }) })}>
          Log out
        </Button>
      </header>

      <div className="flex flex-col gap-4 px-4 pt-3">
        <SoonCard title="Your bill">Your latest bill and the amount due will show here. Until then, check the bill sent to you by email or WhatsApp.</SoonCard>
        <SoonCard title="Pay with M-Pesa">Paying from here is coming soon.</SoonCard>
        <SoonCard title="Payments">Your payment history will show here soon.</SoonCard>
      </div>
    </>
  );
}
