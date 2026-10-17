import { Link } from 'react-router-dom';
import { useCan, useDashboard, usePayments, useSetupProgress } from '@rentflow/api';
import { formatDate, formatKES, toCents, type Dashboard } from '@rentflow/core';
import {
  AmountRow,
  AttentionItem,
  AttentionPanel,
  Badge,
  ButtonLink,
  Card,
  CollectionBars,
  DataTable,
  ErrorState,
  EyeIcon,
  GaugeIcon,
  LoadingState,
  PageHeader,
  StatCard,
  SetupChecklist,
  StatGrid,
  actionsColumn,
} from '@rentflow/ui';

type Upcoming = Dashboard['upcoming'][number];

const readingsBadge = { ready: ['success', 'Ready'], missing: ['warn', 'Missing'], no_meters: ['neutral', 'No meters'] } as const;

/** This cycle's money, arrears, occupancy, what to fix before the next billing run, and upcoming bills. */
export function DashboardPage() {
  const dashboard = useDashboard();
  const payments = usePayments({ page: 1 });
  const can = useCan();
  const setup = useSetupProgress({ enabled: can('properties.manage') });

  if (dashboard.isPending) return <LoadingState />;
  if (dashboard.isError) return <ErrorState message={dashboard.error.message} onRetry={() => void dashboard.refetch()} />;
  const d = dashboard.data;
  const { missing_readings: missing, overdue_bills: overdue, failed_messages: failed } = d.attention;
  const needsAttention = missing.count > 0 || overdue.count > 0 || failed > 0;
  const today = new Date(`${d.today}T00:00:00+03:00`).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Africa/Nairobi',
  });
  const recent = (payments.data?.data ?? []).filter((p) => p.status === 'confirmed').slice(0, 5);

  return (
    <>
      <PageHeader
        eyebrow={today}
        title="Dashboard"
        actions={
          <>
            {can('payments.record') && <ButtonLink to="/admin/payments">Record payment</ButtonLink>}
            {can('leases.manage') && (
              <ButtonLink variant="primary" to="/admin/properties">
                + Add tenant
              </ButtonLink>
            )}
          </>
        }
      />

      {setup.data && !setup.data.complete && <SetupChecklist progress={setup.data} />}

      <StatGrid label="This billing cycle">
        <StatCard
          label="Billed this cycle"
          value={formatKES(d.cycle.billed)}
          footnote={`${d.cycle.bills_count} bills · ${formatDate(d.cycle.from)} – ${formatDate(d.cycle.to)}`}
        />
        <StatCard
          label="Collected"
          value={formatKES(d.cycle.collected)}
          progress={d.cycle.collection_rate ?? undefined}
          footnote={d.cycle.collection_rate === null ? `${d.cycle.payments_count} payments` : undefined}
        />
        <StatCard
          label="Total arrears"
          value={formatKES(d.arrears.total)}
          footnote={`across ${d.arrears.leases} lease${d.arrears.leases === 1 ? '' : 's'}`}
          tone={toCents(d.arrears.total) > 0 ? 'warn' : 'default'}
        />
        <StatCard
          label="Occupancy"
          value={`${d.occupancy.occupied} / ${d.occupancy.units}`}
          footnote={`${d.occupancy.vacant} vacant · ${d.occupancy.properties} propert${d.occupancy.properties === 1 ? 'y' : 'ies'}`}
        />
      </StatGrid>

      {needsAttention && (
        <AttentionPanel title="Needs attention before the next billing run (06:00)">
          {missing.count > 0 && (
            <AttentionItem
              to="/admin/readings"
              title={`${missing.count} meter reading${missing.count === 1 ? '' : 's'} missing`}
              detail={`Units ${missing.units.join(', ')} · bills will be skipped`}
              action="Capture"
            />
          )}
          {overdue.count > 0 && (
            <AttentionItem
              to="/admin/bills?status=overdue"
              title={`${overdue.count} bill${overdue.count === 1 ? '' : 's'} overdue`}
              detail={`${formatKES(overdue.amount)} past due date`}
              action="Review"
            />
          )}
          {failed > 0 && (
            <AttentionItem
              to="/admin/settings/whatsapp"
              title={`${failed} message${failed === 1 ? '' : 's'} failed`}
              detail="Bills that didn't reach the tenant"
              action="Check"
            />
          )}
        </AttentionPanel>
      )}

      <div className="flex flex-wrap items-start gap-6">
        <Card
          title="Bills due in the next 7 days"
          padded={false}
          className="min-w-0 flex-[3_1_520px]"
          action={
            <Link to="/admin/readings" className="text-sm">
              Readings
            </Link>
          }
          id="upcoming"
        >
          <DataTable<Upcoming>
            caption="Bills due in the next 7 days"
            rows={d.upcoming}
            rowKey={(r) => r.lease_id}
            empty="No bills due in the next 7 days."
            columns={[
              {
                key: 'unit',
                header: 'Unit',
                cell: (r) => (
                  <>
                    <strong className="font-semibold">{r.unit_number}</strong> <span className="text-muted">{r.property_name}</span>
                  </>
                ),
              },
              {
                key: 'tenant',
                header: 'Tenant',
                cell: (r) => (can('tenants.view') ? <Link to={`/admin/tenants/${r.tenant_id}`}>{r.tenant_name}</Link> : r.tenant_name),
              },
              { key: 'on', header: 'Bills on', cell: (r) => formatDate(r.bills_on) },
              {
                key: 'readings',
                header: 'Readings',
                cell: (r) => <Badge tone={readingsBadge[r.readings][0]}>{readingsBadge[r.readings][1]}</Badge>,
              },
              { key: 'rent', header: 'Rent', align: 'right', numeric: true, cell: (r) => formatKES(r.monthly_rent) },
              actionsColumn<Upcoming>((r) => [
                {
                  label: `Record readings for ${r.unit_number}`,
                  icon: GaugeIcon,
                  to: `/admin/readings/${r.unit_id}`,
                  hidden: !can('readings.record') || r.readings === 'no_meters',
                },
                { label: `View ${r.tenant_name}`, icon: EyeIcon, to: `/admin/tenants/${r.tenant_id}`, hidden: !can('tenants.view') },
              ]),
            ]}
          />
        </Card>

        <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-4">
          {d.by_property.length > 0 && (
            <Card title="Collected this cycle" id="collection">
              <CollectionBars
                rows={d.by_property.map((p) => ({ name: p.name, billed: toCents(p.billed) / 100, collected: toCents(p.collected) / 100 }))}
              />
            </Card>
          )}
          <Card
            title="Recent payments"
            action={
              <Link to="/admin/payments" className="text-sm">
                All payments
              </Link>
            }
            id="recent"
          >
            {recent.length === 0 ? (
              <span className="text-sm text-muted">No payments yet.</span>
            ) : (
              <ul className="m-0 list-none p-0">
                {recent.map((p, i) => (
                  <AmountRow
                    key={p.id}
                    title={p.tenant?.full_name ?? `Lease ${p.lease_id}`}
                    meta={`${p.unit_number ?? ''} · ${formatDate(p.paid_at)}`}
                    amount={p.amount}
                    last={i === recent.length - 1}
                  />
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
