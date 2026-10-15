import { formatDate, formatDateTime, type BillingRun } from '@rentflow/core';
import { BillingRunStatusBadge } from '../primitives/Badge';
import { DataTable, type Column } from '../primitives/DataTable';

/** Billing runs, newest first: when, how many bills, how many leases skipped and why. */
export function BillingRunsTable({ runs }: { runs: BillingRun[] }) {
  const columns: Column<BillingRun>[] = [
    {
      key: 'date',
      header: 'Bills as of',
      cell: (r) => (
        <>
          {formatDate(r.run_date, { year: true })}
          <span className="block text-xs text-muted">{r.trigger === 'manual' ? 'Run by hand' : 'Daily schedule'}</span>
        </>
      ),
    },
    { key: 'started', header: 'Started', cell: (r) => (r.started_at ? formatDateTime(r.started_at) : '—') },
    { key: 'created', header: 'Bills', align: 'right', numeric: true, cell: (r) => r.invoices_created },
    {
      key: 'skipped',
      header: 'Skipped',
      cell: (r) =>
        r.leases_skipped === 0 ? (
          <span className="text-muted">—</span>
        ) : (
          <>
            <span className="num font-semibold">{r.leases_skipped}</span>
            <ul className="m-0 list-none p-0 text-xs text-muted">
              {r.errors.map((e) => (
                <li key={e.lease_id}>
                  Lease {e.lease_id}: {e.reason}
                </li>
              ))}
            </ul>
          </>
        ),
    },
    { key: 'status', header: 'Status', cell: (r) => <BillingRunStatusBadge status={r.status} /> },
  ];
  return <DataTable caption="Billing runs" columns={columns} rows={runs} rowKey={(r) => r.id} empty="No billing runs yet." />;
}
