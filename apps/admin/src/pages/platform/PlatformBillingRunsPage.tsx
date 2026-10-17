import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { usePlatformBillingRun, usePlatformBillingRuns } from '@rentflow/api';
import { formatDate, formatDateTime, type PlatformBillingRun } from '@rentflow/core';
import {
  BillingRunStatusBadge,
  Card,
  DataTable,
  ErrorState,
  EyeIcon,
  FilterChips,
  HomeIcon,
  LoadingState,
  Notice,
  PageHeader,
  Pager,
  SidePanel,
  actionsColumn,
} from '@rentflow/ui';

type Filter = 'all' | 'problems';

/** Billing runs across every account; open one to see which leases were skipped and why. */
export function PlatformBillingRunsPage() {
  const [params, setParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const filter: Filter = params.get('problems') === '1' ? 'problems' : 'all';
  const openId = params.get('run') ? Number(params.get('run')) : null;
  const runs = usePlatformBillingRuns({ problems: filter === 'problems' ? 1 : undefined, page });
  const set = (k: string, v: string | null) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    setParams(next, { replace: true });
  };

  return (
    <>
      <PageHeader title="Billing runs" subtitle="Daily at 06:00 Nairobi for every active account, plus runs started by hand" />
      {/* The panel sits beside the table on wide screens and wraps below it on narrow ones. */}
      <div className="flex flex-wrap items-start gap-6">
        <Card padded={false} className="min-w-0 flex-[3_1_560px]">
          <div className="px-4 pb-1.5 pt-4">
            <FilterChips<Filter>
              label="Show"
              value={filter}
              onChange={(v) => {
                set('problems', v === 'problems' ? '1' : null);
                setPage(1);
              }}
              options={[
                { value: 'all', label: 'All runs' },
                { value: 'problems', label: 'Skipped or failed' },
              ]}
            />
          </div>
          {runs.isPending ? (
            <LoadingState />
          ) : runs.isError ? (
            <ErrorState className="m-4" message={runs.error.message} onRetry={() => void runs.refetch()} />
          ) : (
            <>
              <DataTable<PlatformBillingRun>
                caption="Billing runs"
                rows={runs.data.data}
                rowKey={(r) => r.id}
                empty={filter === 'problems' ? 'No problems. Every run billed every lease.' : 'No billing runs yet.'}
                columns={[
                  {
                    key: 'date',
                    header: 'Date',
                    cell: (r) => (
                      <button
                        type="button"
                        className="min-h-touch border-0 bg-transparent p-0 font-semibold text-brand"
                        onClick={() => set('run', String(r.id))}
                      >
                        {formatDate(r.run_date)}
                      </button>
                    ),
                  },
                  {
                    key: 'account',
                    header: 'Account',
                    cell: (r) => (r.account ? <Link to={`/platform/accounts/${r.account.id}`}>{r.account.name}</Link> : '—'),
                  },
                  {
                    key: 'how',
                    header: 'How',
                    cell: (r) => (r.trigger === 'manual' ? `Manual${r.triggered_by ? ` · ${r.triggered_by}` : ''}` : 'Daily'),
                  },
                  { key: 'bills', header: 'Bills', align: 'right', numeric: true, cell: (r) => r.invoices_created },
                  { key: 'skipped', header: 'Skipped', align: 'right', numeric: true, cell: (r) => r.leases_skipped },
                  { key: 'status', header: 'Status', cell: (r) => <BillingRunStatusBadge status={r.status} /> },
                  actionsColumn<PlatformBillingRun>((r) => [
                    { label: `View billing run of ${formatDate(r.run_date)}`, icon: EyeIcon, onClick: () => set('run', String(r.id)) },
                    {
                      label: `View ${r.account?.name ?? 'account'}`,
                      icon: HomeIcon,
                      to: `/platform/accounts/${r.account?.id}`,
                      hidden: !r.account,
                    },
                  ]),
                ]}
              />
              <Pager meta={runs.data.meta} page={page} onPage={setPage} busy={runs.isFetching} />
            </>
          )}
        </Card>
        {openId !== null && <RunPanel id={openId} onClose={() => set('run', null)} />}
      </div>
    </>
  );
}

function RunPanel({ id, onClose }: { id: number; onClose: () => void }) {
  const run = usePlatformBillingRun(id);
  const r = run.data;

  return (
    <SidePanel title={r ? `Billing run · ${formatDate(r.run_date)}` : 'Billing run'} subtitle={r?.account?.name} onClose={onClose}>
      {run.isPending ? (
        <LoadingState />
      ) : run.isError || !r ? (
        <ErrorState message={run.error?.message ?? 'Not found'} />
      ) : (
        <div className="flex flex-col gap-4 text-sm">
          <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2">
            <dt className="text-muted">Status</dt>
            <dd className="m-0">
              <BillingRunStatusBadge status={r.status} />
            </dd>
            <dt className="text-muted">Started</dt>
            <dd className="m-0">
              {r.started_at ? formatDateTime(r.started_at) : '—'} ·{' '}
              {r.trigger === 'manual' ? `by ${r.triggered_by ?? 'someone'}` : 'daily schedule'}
            </dd>
            <dt className="text-muted">Bills made</dt>
            <dd className="num m-0">{r.invoices_created}</dd>
            <dt className="text-muted">Leases skipped</dt>
            <dd className="num m-0">{r.leases_skipped}</dd>
          </dl>
          {(r.skipped ?? []).length === 0 ? (
            <Notice tone="success">Every due lease was billed.</Notice>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {r.skipped!.map((s, i) => (
                <li key={i} className="rounded-md border border-line-soft px-3 py-2.5">
                  <strong className="font-semibold">
                    {[s.property, s.unit && `Unit ${s.unit}`].filter(Boolean).join(' · ') || `Lease #${s.lease_id}`}
                  </strong>
                  {s.tenant && <span className="text-muted"> · {s.tenant}</span>}
                  <span className="block text-subtle">{s.reason}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="m-0 text-xs text-muted">
            Skipped leases are billed by the next run once the reason is fixed (usually a missing meter reading).
          </p>
        </div>
      )}
    </SidePanel>
  );
}
