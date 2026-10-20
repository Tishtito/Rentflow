import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { formatDate, formatKES, formatPeriod } from '@rentflow/core';
import { ApiError, usePortalInvoice, usePortalInvoices } from '@rentflow/api';
import { ChevronRightIcon, ErrorState, InvoiceStatusBadge, LoadingState, Notice, Pager, TenantBillCard } from '@rentflow/ui';
import { PortalPage } from '../PortalLayout';
import { useBillDownload } from './bills';

/** All my bills, newest first; each opens the bill. */
export function BillsPage() {
  const [page, setPage] = useState(1);
  const bills = usePortalInvoices(page);

  return (
    <PortalPage title="Bills">
      {bills.isPending ? (
        <LoadingState />
      ) : bills.isError ? (
        <ErrorState message="We couldn't load your bills." onRetry={() => bills.refetch()} />
      ) : bills.data.data.length === 0 ? (
        <Notice tone="info" title="No bills yet">
          Your bills show here as soon as your landlord sends them.
        </Notice>
      ) : (
        <section className="rounded-xl border border-line bg-surface">
          <ul className="m-0 list-none p-0">
            {bills.data.data.map((bill, i) => (
              <li key={bill.id} className={i > 0 ? 'border-t border-line-soft' : undefined}>
                <Link to={`/bills/${bill.id}`} className="flex min-h-touch items-center gap-3 px-5 py-3.5 text-ink no-underline">
                  <span className="flex flex-1 flex-col gap-0.5">
                    <span className="text-[15px] font-medium">{formatPeriod(bill.period_start, bill.period_end)}</span>
                    <span className="text-xs text-muted">
                      {bill.invoice_number} · due {formatDate(bill.due_date)}
                    </span>
                  </span>
                  <span className="flex flex-col items-end gap-1">
                    <span className="num font-semibold">{formatKES(bill.total_due)}</span>
                    <InvoiceStatusBadge status={bill.status} />
                  </span>
                  <ChevronRightIcon className="shrink-0 text-muted" />
                </Link>
              </li>
            ))}
          </ul>
          <Pager meta={bills.data.meta} page={page} onPage={setPage} busy={bills.isFetching} />
        </section>
      )}
    </PortalPage>
  );
}

/** One bill: its lines, the total and the PDF. */
export function BillPage() {
  const id = Number(useParams().invoiceId);
  const bill = usePortalInvoice(id);
  const download = useBillDownload();

  return (
    <PortalPage title={bill.data ? bill.data.invoice_number : 'Bill'} back="/bills">
      {bill.isPending ? (
        <LoadingState />
      ) : bill.isError ? (
        bill.error instanceof ApiError && bill.error.status === 404 ? (
          <Notice tone="info" title="Bill not found">
            <span>This bill isn&apos;t available.</span>
            <Link to="/bills" className="inline-flex min-h-touch items-center self-start font-semibold">
              See all your bills
            </Link>
          </Notice>
        ) : (
          <ErrorState message="We couldn't load this bill." onRetry={() => bill.refetch()} />
        )
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
            <InvoiceStatusBadge status={bill.data.status} />
            <span>
              Issued {formatDate(bill.data.issue_date)} · due {formatDate(bill.data.due_date)}
            </span>
          </div>
          <TenantBillCard invoice={bill.data} onDownload={() => download(bill.data)} />
        </>
      )}
    </PortalPage>
  );
}
