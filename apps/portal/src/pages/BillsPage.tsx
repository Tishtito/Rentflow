import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FileQuestion, Receipt } from 'lucide-react';
import { formatAmount, formatDate, formatKES, formatPeriod, toCents, type Invoice } from '@rentflow/core';
import { ApiError, usePortalInvoice, usePortalInvoices } from '@rentflow/api';
import { GlassCard, GlassEmpty, GlassError, GlassLoading, GlassPager, InvoicePill, ListRow, TenantBillCard, glassLink } from '@rentflow/ui';
import { PortalPage } from '../PortalLayout';
import { useBillDownload } from './bills';

/** Bills of one page, in year groups (newest first, as the API sends them). */
function byYear(bills: Invoice[]): Array<[string, Invoice[]]> {
  const groups = new Map<string, Invoice[]>();
  for (const bill of bills) {
    const year = bill.period_start.slice(0, 4);
    groups.set(year, [...(groups.get(year) ?? []), bill]);
  }
  return [...groups];
}

/** All my bills, newest first; each opens the bill. */
export function BillsPage() {
  const [page, setPage] = useState(1);
  const bills = usePortalInvoices(page);
  const groups = byYear(bills.data?.data ?? []);

  return (
    <PortalPage title="Bills">
      {bills.isPending ? (
        <GlassLoading rows={4} />
      ) : bills.isError ? (
        <GlassError message="We couldn't load your bills." onRetry={() => bills.refetch()} />
      ) : groups.length === 0 ? (
        <GlassEmpty icon={Receipt} title="No bills yet">
          Your bills show here as soon as your landlord sends them.
        </GlassEmpty>
      ) : (
        <>
          {groups.map(([year, list]) => (
            <section key={year} aria-label={year} className="flex flex-col gap-2">
              {groups.length > 1 && <h2 className="m-0 px-1 pt-1 text-xs font-semibold uppercase tracking-[.08em] text-glass-muted">{year}</h2>}
              {list.map((bill) => (
                <GlassCard key={bill.id} className="p-1.5">
                  <ListRow
                    to={`/bills/${bill.id}`}
                    icon={Receipt}
                    title={formatPeriod(bill.period_start, bill.period_end)}
                    subtitle={`${bill.invoice_number} · due ${formatDate(bill.due_date)}`}
                    right={
                      <>
                        <span className="num text-[15px] font-semibold">{formatAmount(bill.total_due)}</span>
                        <InvoicePill invoice={bill} />
                      </>
                    }
                    chevron
                  />
                </GlassCard>
              ))}
            </section>
          ))}
          <GlassPager meta={bills.data.meta} page={page} onPage={setPage} busy={bills.isFetching} />
        </>
      )}
    </PortalPage>
  );
}

/** One bill: status hero, its lines, the total and the PDF. */
export function BillPage() {
  const id = Number(useParams().invoiceId);
  const bill = usePortalInvoice(id);
  const download = useBillDownload();

  return (
    <PortalPage title={bill.data ? bill.data.invoice_number : 'Bill'} back="/bills">
      {bill.isPending ? (
        <GlassLoading rows={1} />
      ) : bill.isError ? (
        bill.error instanceof ApiError && bill.error.status === 404 ? (
          <GlassEmpty icon={FileQuestion} title="Bill not found">
            This bill isn&apos;t available.{' '}
            <Link to="/bills" className={glassLink}>
              See all your bills
            </Link>
          </GlassEmpty>
        ) : (
          <GlassError message="We couldn't load this bill." onRetry={() => bill.refetch()} />
        )
      ) : (
        <>
          <GlassCard strong className="flex flex-col gap-3 p-5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-glass-muted">
                Issued {formatDate(bill.data.issue_date)} · due {formatDate(bill.data.due_date)}
              </span>
              <InvoicePill invoice={bill.data} />
            </div>
            {toCents(bill.data.balance_remaining) > 0 ? (
              <p className="m-0 flex flex-col gap-1">
                <span className="text-sm text-glass-muted">Still to pay on this bill</span>
                <span className="num text-[30px] font-semibold leading-none">{formatKES(bill.data.balance_remaining)}</span>
              </p>
            ) : (
              <p className="m-0 text-[15px] text-glass-sage">This bill is paid. Thank you!</p>
            )}
          </GlassCard>
          <TenantBillCard invoice={bill.data} onDownload={() => download(bill.data)} />
        </>
      )}
    </PortalPage>
  );
}
