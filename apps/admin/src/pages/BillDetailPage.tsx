import { useParams } from 'react-router-dom';
import { useInvoice, usePayments } from '@rentflow/api';
import { formatKES, toCents } from '@rentflow/core';
import { BillDocument, ButtonLink, Card, ErrorState, InvoiceStatusBadge, LoadingState, PageHeader, PaymentHistoryList } from '@rentflow/ui';

/** One bill (GET /api/admin/invoices/{id}) with the payments on its lease. */
export function BillDetailPage() {
  const id = Number(useParams().invoiceId);
  const invoice = useInvoice(id);
  const leaseId = invoice.data?.lease_id;
  const payments = usePayments({ lease_id: leaseId }, { enabled: leaseId !== undefined });

  if (invoice.isPending) return <LoadingState />;
  if (invoice.isError) {
    return (
      <>
        <PageHeader breadcrumb={[{ label: 'Bills', to: '/admin/bills' }, { label: `#${id}` }]} title="Bill" />
        <ErrorState
          message={invoice.error.message}
          onRetry={() => void invoice.refetch()}
        />
      </>
    );
  }

  const bill = invoice.data;
  const owing = toCents(bill.balance_remaining) > 0;

  return (
    <>
      <PageHeader
        breadcrumb={[{ label: 'Bills', to: '/admin/bills' }, { label: bill.invoice_number }]}
        title={bill.invoice_number}
        badge={<InvoiceStatusBadge status={bill.status} />}
        actions={
          bill.status !== 'void' && (
            <ButtonLink variant="primary" to={`/admin/payments?lease=${bill.lease_id}&invoice=${bill.id}`}>
              Record payment
            </ButtonLink>
          )
        }
      />
      <div className="flex flex-wrap items-start gap-6">
        <BillDocument invoice={bill} />
        <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-4">
          <Card title="Balance on this bill" id="balance">
            <span className={`num font-display text-[28px] font-bold ${owing ? 'text-warn-strong' : 'text-brand'}`}>
              {formatKES(bill.balance_remaining, { decimals: 2 })}
            </span>
            <span className="text-sm text-muted">
              Paid so far {formatKES(bill.amount_paid, { decimals: 2 })} of {formatKES(bill.total_due, { decimals: 2 })} · lease {bill.lease_id}
            </span>
          </Card>
          <Card title="Payments on this lease" id="payments">
            {payments.isPending ? (
              <LoadingState />
            ) : payments.isError ? (
              <ErrorState message={payments.error.message} />
            ) : payments.data.data.length === 0 ? (
              <span className="text-sm text-muted">No payments yet.</span>
            ) : (
              <PaymentHistoryList payments={payments.data.data} />
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
