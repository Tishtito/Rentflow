import { Link, useNavigate } from 'react-router-dom';
import { formatDate, formatKES, toCents, type PortalHomeEntry } from '@rentflow/core';
import { usePortalHome, useTenant, useTenantLogout } from '@rentflow/api';
import { AmountDueCard, Button, ErrorState, LoadingState, PaymentHistoryList, TenantBillCard } from '@rentflow/ui';
import { useBillDownload } from './bills';

const homeLabel = (h: PortalHomeEntry) => (h.unit_number ? `House ${h.unit_number}${h.property_name ? `, ${h.property_name}` : ''}` : undefined);

/** Tenant home: what's due per home, the latest bill and the last payments. */
export function HomePage() {
  const tenant = useTenant().data;
  const home = usePortalHome();
  const logout = useTenantLogout();
  const navigate = useNavigate();
  const download = useBillDownload();
  if (!tenant) return null;

  const homes = home.data?.homes ?? [];

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
        {home.isPending ? (
          <LoadingState />
        ) : home.isError ? (
          <ErrorState message="We couldn't load your bill." onRetry={() => home.refetch()} />
        ) : homes.length === 0 ? (
          <section className="flex flex-col gap-1.5 rounded-xl border border-line bg-surface p-5">
            <h2 className="m-0 text-[17px] font-semibold">No home yet</h2>
            <p className="m-0 text-sm text-muted">Your bills will show here once {tenant.account.name} adds your lease.</p>
          </section>
        ) : (
          <>
            {homes.map((h) => {
              const bill = h.latest_invoice;
              return bill ? (
                <div key={h.lease_id} className="flex flex-col gap-4">
                  <AmountDueCard invoice={bill} balance={h.balance} home={homes.length > 1 ? homeLabel(h) : undefined} />
                  <TenantBillCard invoice={bill} onDownload={() => download(bill)} />
                </div>
              ) : (
                <section key={h.lease_id} className="flex flex-col gap-1.5 rounded-xl border border-line bg-surface p-5">
                  <h2 className="m-0 text-[17px] font-semibold">{homeLabel(h) ?? 'Your home'}</h2>
                  <p className="num m-0 text-sm text-muted">
                    {toCents(h.balance) > 0 ? `You owe ${formatKES(h.balance)}. ` : ''}
                    {h.next_billing_date ? `Your next bill comes on ${formatDate(h.next_billing_date)}.` : 'No bills yet.'}
                  </p>
                </section>
              );
            })}

            <section aria-labelledby="pay-h" className="flex flex-col gap-1 rounded-xl border border-line bg-surface p-5">
              <div className="flex items-baseline justify-between">
                <h2 id="pay-h" className="m-0 text-[17px] font-semibold">
                  Payments
                </h2>
                <Link to="/payments" className="inline-flex min-h-touch items-center text-sm font-medium text-brand">
                  See all
                </Link>
              </div>
              {home.data.recent_payments.length ? (
                <PaymentHistoryList payments={home.data.recent_payments} />
              ) : (
                <p className="m-0 py-2 text-sm text-muted">No payments recorded yet.</p>
              )}
            </section>
          </>
        )}
      </div>
    </>
  );
}
