import { Link } from 'react-router-dom';
import { usePlatformOverview } from '@rentflow/api';
import { formatKES } from '@rentflow/core';
import { ButtonLink, Card, ErrorState, LoadingState, PageHeader, StatCard, StatGrid } from '@rentflow/ui';
import { ActivityTable } from './ActivityTable';

/** /platform: how every landlord account is doing and what needs attention. */
export function PlatformOverviewPage() {
  const overview = usePlatformOverview();

  if (overview.isPending) return <LoadingState />;
  if (overview.isError) return <ErrorState message={overview.error.message} onRetry={() => void overview.refetch()} />;
  const o = overview.data;
  const a = o.attention;
  const month = new Date(`${o.month.from}T00:00:00`).toLocaleDateString('en-GB', { month: 'long' });

  const issues = [
    a.failed_deliveries > 0 && {
      to: '/platform/messaging?status=failed',
      text: `${a.failed_deliveries} failed message${a.failed_deliveries === 1 ? '' : 's'} (${a.failed_deliveries_24h} in the last 24 h)`,
    },
    a.billing_runs_with_problems_7d > 0 && {
      to: '/platform/billing-runs?problems=1',
      text: `${a.billing_runs_with_problems_7d} billing run${a.billing_runs_with_problems_7d === 1 ? '' : 's'} with skipped leases or errors this week`,
    },
    a.whatsapp_disabled > 0 && {
      to: '/platform/messaging?tab=whatsapp',
      text: `${a.whatsapp_disabled} WhatsApp number${a.whatsapp_disabled === 1 ? '' : 's'} disconnected`,
    },
    a.failed_jobs > 0 && {
      to: null,
      text: `${a.failed_jobs} failed background job${a.failed_jobs === 1 ? '' : 's'} (php artisan queue:failed)`,
    },
    o.accounts.suspended > 0 && {
      to: '/platform/accounts?status=suspended',
      text: `${o.accounts.suspended} suspended account${o.accounts.suspended === 1 ? '' : 's'}`,
    },
  ].filter(Boolean) as Array<{ to: string | null; text: string }>;

  return (
    <>
      <PageHeader
        title="Platform overview"
        subtitle="Every landlord account on Rentflow"
        actions={
          <ButtonLink variant="primary" to="/platform/accounts?new=1">
            + New landlord account
          </ButtonLink>
        }
      />
      <StatGrid label="Platform totals">
        <StatCard label="Active accounts" value={o.accounts.active} footnote={`${o.accounts.new_30d} new in 30 days`} />
        <StatCard label="Units managed" value={o.units.total} footnote={`${o.units.occupied} occupied · ${o.units.vacant} vacant`} />
        <StatCard
          label={`Billed · ${month}`}
          value={formatKES(o.month.billed)}
          footnote={`${o.month.bills_count} bill${o.month.bills_count === 1 ? '' : 's'}`}
        />
        <StatCard
          label={`Collected · ${month}`}
          value={formatKES(o.month.collected)}
          footnote={`${formatKES(o.balance_outstanding)} outstanding overall`}
        />
      </StatGrid>

      <Card title="Needs attention">
        {issues.length === 0 ? (
          <p className="m-0 text-sm text-muted">Nothing needs attention.</p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-2 p-0 text-sm">
            {issues.map((i) => (
              <li key={i.text} className="flex items-center gap-2">
                <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-danger-strong" />
                {i.to ? <Link to={i.to}>{i.text}</Link> : i.text}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card
        title="Recent activity"
        padded={false}
        action={
          <Link to="/platform/activity" className="text-sm">
            All activity →
          </Link>
        }
      >
        <ActivityTable entries={o.recent_activity} />
      </Card>
    </>
  );
}
