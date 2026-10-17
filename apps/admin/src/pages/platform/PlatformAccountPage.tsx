import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ApiError, useAccountStatus, usePlatformAccount, useRunAccountBilling } from '@rentflow/api';
import { channelLabel, formatDate, formatDateTime, formatKES, type PlatformAccountDetail } from '@rentflow/core';
import {
  AccountStatusBadge,
  Badge,
  BillingRunStatusBadge,
  Button,
  Card,
  DataTable,
  ErrorState,
  EyeIcon,
  LoadingState,
  Notice,
  PageHeader,
  SidePanel,
  StatCard,
  StatGrid,
  TextField,
  WhatsAppStatusBadge,
  actionsColumn,
} from '@rentflow/ui';
import { AccountEditPanel } from './AccountPanels';
import { ActivityTable } from './ActivityTable';
import { openAccount } from './openAccount';

type Team = PlatformAccountDetail['team'][number];
type Run = PlatformAccountDetail['billing_runs'][number];

/** /platform/accounts/:id — one landlord account: details, status, billing, messages, team, activity. */
export function PlatformAccountPage() {
  const id = Number(useParams().accountId);
  const account = usePlatformAccount(id);
  const navigate = useNavigate();
  const run = useRunAccountBilling();
  const [panel, setPanel] = useState<'edit' | 'status' | null>(null);

  if (account.isPending) return <LoadingState />;
  if (account.isError) return <ErrorState message={account.error.message} onRetry={() => void account.refetch()} />;
  const a = account.data;
  const sent = a.deliveries_7d.filter((d) => d.status === 'sent' || d.status === 'delivered').reduce((n, d) => n + d.count, 0);
  const failed = a.deliveries_7d.filter((d) => d.status === 'failed').reduce((n, d) => n + d.count, 0);
  const runError =
    run.error instanceof ApiError
      ? (run.error.field('account') ?? run.error.field('run_date') ?? run.error.message)
      : run.error
        ? "Can't reach the server."
        : null;

  return (
    <>
      <PageHeader
        breadcrumb={[{ label: 'Landlord accounts', to: '/platform/accounts' }, { label: a.name }]}
        title={a.name}
        badge={<AccountStatusBadge status={a.status} />}
        subtitle={[a.email, a.phone, `Since ${formatDate(a.created_at)}`].filter(Boolean).join(' · ')}
        actions={
          <>
            <Button onClick={() => setPanel('edit')}>Edit</Button>
            <Button onClick={() => setPanel('status')}>{a.status === 'active' ? 'Suspend or close…' : 'Reactivate…'}</Button>
            <Button variant="primary" disabled={a.status !== 'active'} onClick={() => openAccount(a, navigate)}>
              Open account
            </Button>
          </>
        }
      />

      {/* Opened from the header buttons, so show it right under them. */}
      {panel === 'edit' && <AccountEditPanel account={a} onClose={() => setPanel(null)} />}
      {panel === 'status' && <StatusPanel account={a} onClose={() => setPanel(null)} />}

      <StatGrid label="Account totals">
        <StatCard
          label="Properties · units"
          value={`${a.counts.properties} · ${a.counts.units}`}
          footnote={`${a.counts.occupied_units} occupied`}
        />
        <StatCard label="Tenants" value={a.counts.tenants} footnote={`${a.counts.active_leases} active leases`} />
        <StatCard
          label="Outstanding"
          value={formatKES(a.balance_outstanding)}
          tone={Number(a.balance_outstanding) > 0 ? 'warn' : 'default'}
        />
        <StatCard
          label="Messages · 7 days"
          value={sent}
          footnote={failed ? `${failed} failed` : 'none failed'}
          tone={failed ? 'danger' : 'default'}
        />
      </StatGrid>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card
          title="Billing"
          description={`Bills on day ${a.billing_day} of each month · due after ${a.payment_due_days} days · bills ${a.invoice_prefix}-… · ${a.timezone}`}
          action={
            <Button size="md" disabled={run.isPending || a.status !== 'active'} onClick={() => run.mutate({ id: a.id })}>
              {run.isPending ? 'Starting…' : 'Run billing now'}
            </Button>
          }
          padded={false}
        >
          {run.isSuccess && (
            <Notice className="mx-4 mb-3" tone="success">
              Billing run started. It shows here when it finishes.
            </Notice>
          )}
          {runError && (
            <Notice className="mx-4 mb-3" tone="danger">
              {runError}
            </Notice>
          )}
          <DataTable<Run>
            caption="Recent billing runs"
            rows={a.billing_runs}
            rowKey={(r) => r.id}
            empty="Not billed yet."
            columns={[
              { key: 'date', header: 'Date', cell: (r) => <Link to={`/platform/billing-runs?run=${r.id}`}>{formatDate(r.run_date)}</Link> },
              { key: 'trigger', header: 'How', cell: (r) => (r.trigger === 'manual' ? 'Manual' : 'Daily') },
              { key: 'bills', header: 'Bills', align: 'right', numeric: true, cell: (r) => r.invoices_created },
              { key: 'skipped', header: 'Skipped', align: 'right', numeric: true, cell: (r) => r.leases_skipped },
              { key: 'status', header: 'Status', cell: (r) => <BillingRunStatusBadge status={r.status} /> },
              actionsColumn<Run>((r) => [
                { label: `View billing run of ${formatDate(r.run_date)}`, icon: EyeIcon, to: `/platform/billing-runs?run=${r.id}` },
              ]),
            ]}
          />
        </Card>

        <Card
          title="Messages"
          action={
            <Link to={`/platform/messaging?account=${a.id}`} className="text-sm">
              All messages →
            </Link>
          }
        >
          <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
            <dt className="text-muted">WhatsApp</dt>
            <dd className="m-0">
              {a.whatsapp ? (
                <span className="flex flex-wrap items-center gap-2">
                  <WhatsAppStatusBadge status={a.whatsapp.status} /> {a.whatsapp.display_phone_number}
                  {a.whatsapp.verified_name && <span className="text-muted">· {a.whatsapp.verified_name}</span>}
                </span>
              ) : (
                <span className="text-muted">Not connected (bills go by email)</span>
              )}
            </dd>
            {a.deliveries_7d.map((d) => (
              <FragmentRow key={`${d.channel}-${d.status}`} label={`${channelLabel[d.channel]} · ${d.status}`} value={d.count} />
            ))}
          </dl>
        </Card>
      </div>

      <Card title="Team" padded={false}>
        <DataTable<Team>
          caption="Team"
          rows={a.team}
          rowKey={(m) => m.id}
          empty="Nobody yet."
          columns={[
            {
              key: 'name',
              header: 'Name',
              cell: (m) => (
                <span className="flex flex-wrap items-center gap-1.5">
                  <strong className="font-semibold">{m.name}</strong>
                  {m.is_owner && <Badge tone="gold">Owner</Badge>}
                </span>
              ),
            },
            { key: 'email', header: 'Email', cell: (m) => m.email },
            { key: 'phone', header: 'Phone', cell: (m) => m.phone ?? <span className="text-muted">—</span> },
            {
              key: 'status',
              header: 'Status',
              cell: (m) =>
                m.status === 'active' ? (
                  <Badge tone="success">Active</Badge>
                ) : m.status === 'invited' ? (
                  <Badge tone="info">Invited</Badge>
                ) : (
                  <Badge tone="danger">Suspended</Badge>
                ),
            },
            {
              key: 'login',
              header: 'Last login',
              cell: (m) => (m.last_login_at ? formatDateTime(m.last_login_at) : <span className="text-muted">Never</span>),
            },
          ]}
        />
      </Card>

      <Card
        title="Activity"
        padded={false}
        action={
          <Link to={`/platform/activity?account=${a.id}`} className="text-sm">
            All activity →
          </Link>
        }
      >
        <ActivityTable entries={a.activity} showAccount={false} />
      </Card>
    </>
  );
}

function FragmentRow({ label, value }: { label: string; value: number }) {
  return (
    <>
      <dt className="text-muted">{label}</dt>
      <dd className="num m-0">{value}</dd>
    </>
  );
}

/** Suspend / close (with a reason, kept in the activity log) or reactivate. Two steps, so it can't happen by accident. */
function StatusPanel({ account, onClose }: { account: PlatformAccountDetail; onClose: () => void }) {
  const change = useAccountStatus();
  const [reason, setReason] = useState('');
  const [confirm, setConfirm] = useState<'suspended' | 'closed' | 'active' | null>(null);
  const message = change.error instanceof ApiError ? change.error.message : change.error ? "Can't reach the server." : null;
  const act = (status: 'suspended' | 'closed' | 'active') =>
    confirm === status
      ? change.mutate({ id: account.id, status, reason: reason || undefined }, { onSuccess: onClose })
      : setConfirm(status);

  return (
    <SidePanel title={account.status === 'active' ? 'Suspend or close' : 'Reactivate'} subtitle={account.name} onClose={onClose}>
      <div className="flex flex-col gap-4">
        {message && <Notice tone="danger">{message}</Notice>}
        {account.status === 'active' ? (
          <>
            <Notice tone="warn">
              Nobody in this account (staff or tenants) can log in, app logins are signed out, and no bills are made until it&apos;s
              reactivated. Nothing is deleted.
            </Notice>
            <TextField label="Reason" hint="Kept in the activity log" value={reason} onChange={(e) => setReason(e.target.value)} />
            <Button variant="danger-outline" size="lg" disabled={change.isPending} onClick={() => act('suspended')}>
              {confirm === 'suspended' ? 'Click again to suspend' : 'Suspend account'}
            </Button>
            <Button variant="danger-outline" size="lg" disabled={change.isPending} onClick={() => act('closed')}>
              {confirm === 'closed' ? 'Click again to close' : 'Close account'}
            </Button>
          </>
        ) : (
          <>
            <Notice tone="info">
              The account is {account.status}. Reactivating lets its staff and tenants log in again and restarts daily billing.
            </Notice>
            <TextField label="Reason" hint="Kept in the activity log" value={reason} onChange={(e) => setReason(e.target.value)} />
            <Button variant="primary" size="lg" disabled={change.isPending} onClick={() => act('active')}>
              {confirm === 'active' ? 'Click again to reactivate' : 'Reactivate account'}
            </Button>
          </>
        )}
      </div>
    </SidePanel>
  );
}
