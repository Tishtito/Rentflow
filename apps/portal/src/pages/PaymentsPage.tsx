import { Fragment, useState } from 'react';
import { Banknote, CircleDollarSign, CreditCard, Download, FileText, Landmark, Smartphone } from 'lucide-react';
import { formatAmount, formatDate, methodLabel, type PaymentMethod, type TenantPayment } from '@rentflow/core';
import { usePortalPayments } from '@rentflow/api';
import { GlassCard, GlassEmpty, GlassError, GlassLoading, GlassPager, ListRow, type GlassIcon } from '@rentflow/ui';
import { PortalPage } from '../PortalLayout';
import { useReceiptDownload } from './bills';

const methodIcon: Record<PaymentMethod, GlassIcon> = {
  mpesa: Smartphone,
  cheque: FileText,
  bank: Landmark,
  cash: Banknote,
  other: CircleDollarSign,
};

const monthHeading = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'Africa/Nairobi' });

/** "October 2026" for a payment, in Nairobi time (same as the dates). */
const monthOf = (p: TenantPayment) => monthHeading.format(new Date(p.paid_at));

/** One payment: method icon, date, method + reference (monospace), sage "+amount", receipt download. */
export function PaymentRow({ payment: p, divider }: { payment: TenantPayment; divider?: boolean }) {
  const downloadReceipt = useReceiptDownload();
  return (
    <ListRow
      className={divider ? 'border-0 border-t border-solid border-glass-line' : undefined}
      icon={methodIcon[p.method]}
      iconTone="sage"
      title={formatDate(p.paid_at, { year: true })}
      subtitle={
        <>
          {methodLabel[p.method]}
          {p.reference && <span className="num font-mono"> {p.reference}</span>}
        </>
      }
      right={
        <>
          <span className="num text-[15px] font-semibold text-glass-sage">+{formatAmount(p.amount)}</span>
          {p.receipt_number && (
            <button
              type="button"
              onClick={() => void downloadReceipt(p)}
              aria-label={`Download receipt ${p.receipt_number}`}
              className="inline-flex min-h-[32px] cursor-pointer items-center gap-1 border-0 bg-transparent p-0 text-xs font-medium text-glass-muted hover:text-glass-text"
            >
              <Download size={14} strokeWidth={1.75} aria-hidden="true" />
              Receipt
            </button>
          )}
        </>
      }
    />
  );
}

/** Every payment the landlord has recorded for me, newest first, under month headers. */
export function PaymentsPage() {
  const [page, setPage] = useState(1);
  const payments = usePortalPayments(page);
  const list = payments.data?.data ?? [];

  return (
    <PortalPage title="Payments">
      {payments.isPending ? (
        <GlassLoading rows={4} />
      ) : payments.isError ? (
        <GlassError message="We couldn't load your payments." onRetry={() => payments.refetch()} />
      ) : list.length === 0 ? (
        <GlassEmpty icon={CreditCard} title="No payments yet">
          Payments show here once your landlord records them.
        </GlassEmpty>
      ) : (
        <>
          <GlassCard className="flex flex-col p-1.5">
            {list.map((p, i) => {
              const month = monthOf(p);
              const newMonth = i === 0 || monthOf(list[i - 1]!) !== month;
              return (
                <Fragment key={p.id}>
                  {newMonth && (
                    <h2 className="m-0 px-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-[.08em] text-glass-muted">{month}</h2>
                  )}
                  <PaymentRow payment={p} divider={!newMonth} />
                </Fragment>
              );
            })}
          </GlassCard>
          <GlassPager meta={payments.data.meta} page={page} onPage={setPage} busy={payments.isFetching} />
        </>
      )}
    </PortalPage>
  );
}
