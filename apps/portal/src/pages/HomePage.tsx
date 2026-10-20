import { Link } from 'react-router-dom';
import { CreditCard, House, Receipt, User } from 'lucide-react';
import { formatDate, formatKES, toCents, type PortalHomeEntry } from '@rentflow/core';
import { usePortalHome, useTenant } from '@rentflow/api';
import { AmountDueCard, GlassAvatar, GlassCard, GlassError, GlassLoading, IconCircle, TenantBillCard, glassLink, type GlassIcon } from '@rentflow/ui';
import { useBillDownload } from './bills';
import { PaymentRow } from './PaymentsPage';

const homeLabel = (h: PortalHomeEntry) => (h.unit_number ? `House ${h.unit_number}${h.property_name ? `, ${h.property_name}` : ''}` : undefined);

const quickActions: Array<{ to: string; label: string; icon: GlassIcon }> = [
  { to: '/bills', label: 'Bills', icon: Receipt },
  { to: '/payments', label: 'Payments', icon: CreditCard },
  { to: '/profile', label: 'Profile', icon: User },
];

/** Tenant home: what's due per home, shortcuts, the latest bill and the last payments. */
export function HomePage() {
  const tenant = useTenant().data;
  const home = usePortalHome();
  const download = useBillDownload();
  if (!tenant) return null;

  const homes = home.data?.homes ?? [];

  return (
    <>
      <header className="flex items-center justify-between gap-3 px-5 pb-3 pt-6">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-sm text-glass-muted">Hi {tenant.first_name}</span>
          <h1 className="m-0 truncate font-serif text-[28px] font-semibold leading-tight">{tenant.account.name}</h1>
        </div>
        <Link to="/profile" aria-label="Your profile" className="grid h-touch w-touch shrink-0 place-items-center rounded-full">
          <GlassAvatar name={tenant.full_name} size={44} />
        </Link>
      </header>

      <div className="flex flex-col gap-3.5 px-5 pt-1">
        {home.isPending ? (
          <GlassLoading />
        ) : home.isError ? (
          <GlassError message="We couldn't load your bill." onRetry={() => home.refetch()} />
        ) : homes.length === 0 ? (
          <GlassCard className="flex flex-col gap-1.5 p-5">
            <h2 className="m-0 text-[17px] font-semibold">No home yet</h2>
            <p className="m-0 text-sm text-glass-muted">Your bills will show here once {tenant.account.name} adds your lease.</p>
          </GlassCard>
        ) : (
          <>
            {homes.map((h) =>
              h.latest_invoice ? (
                <AmountDueCard key={h.lease_id} invoice={h.latest_invoice} balance={h.balance} home={homes.length > 1 ? homeLabel(h) : undefined} />
              ) : (
                <GlassCard key={h.lease_id} strong className="flex items-center gap-3 p-5">
                  <IconCircle icon={House} tone="sage" />
                  <span className="flex flex-col gap-0.5">
                    <h2 className="m-0 text-[17px] font-semibold">{homeLabel(h) ?? 'Your home'}</h2>
                    <span className="num text-sm text-glass-muted">
                      {toCents(h.balance) > 0 ? `You owe ${formatKES(h.balance)}. ` : ''}
                      {h.next_billing_date ? `Your next bill comes on ${formatDate(h.next_billing_date)}.` : 'No bills yet.'}
                    </span>
                  </span>
                </GlassCard>
              ),
            )}

            <nav aria-label="Shortcuts" className="grid grid-cols-3 gap-3">
              {quickActions.map(({ to, label, icon }) => (
                <Link
                  key={to}
                  to={to}
                  className="glass flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-glass text-[13px] font-medium text-glass-text no-underline shadow-none transition duration-200 hover:bg-glass-raised hover:text-glass-text active:scale-[.98] motion-reduce:active:scale-100"
                >
                  <IconCircle icon={icon} tone="sage" />
                  {label}
                </Link>
              ))}
            </nav>

            {homes.map((h) => {
              const bill = h.latest_invoice;
              return bill && <TenantBillCard key={h.lease_id} invoice={bill} onDownload={() => download(bill)} />;
            })}

            <GlassCard aria-labelledby="pay-h" className="flex flex-col p-1.5">
              <div className="flex items-center justify-between px-3.5 pt-2">
                <h2 id="pay-h" className="m-0 text-[17px] font-semibold">
                  Recent payments
                </h2>
                <Link to="/payments" className={`inline-flex min-h-touch items-center text-sm ${glassLink}`}>
                  See all
                </Link>
              </div>
              {home.data.recent_payments.length ? (
                home.data.recent_payments.map((p, i) => <PaymentRow key={p.id} payment={p} divider={i > 0} />)
              ) : (
                <p className="m-0 px-3.5 pb-4 pt-1 text-sm text-glass-muted">No payments recorded yet.</p>
              )}
            </GlassCard>
          </>
        )}
      </div>
    </>
  );
}
