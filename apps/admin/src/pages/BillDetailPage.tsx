import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { downloadInvoicePdf, useApi, useCan, useInvoice, usePayments } from '@rentflow/api';
import { formatDateTime, formatKES, toCents } from '@rentflow/core';
import {
  Badge,
  BillDocument,
  Button,
  ButtonLink,
  Card,
  DeliveryList,
  ErrorState,
  InvoiceStatusBadge,
  LoadingState,
  Notice,
  PageHeader,
  PaymentHistoryList,
} from '@rentflow/ui';
import { ResendBillPanel, VoidBillPanel } from '../panels/BillPanels';

/** One bill (GET /api/admin/invoices/{id}) with the payments on its lease. */
export function BillDetailPage() {
  const id = Number(useParams().invoiceId);
  const invoice = useInvoice(id);
  const leaseId = invoice.data?.lease_id;
  const payments = usePayments({ lease_id: leaseId }, { enabled: leaseId !== undefined });
  const api = useApi();
  const can = useCan();
  const [panel, setPanel] = useState<'resend' | 'void' | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  if (invoice.isPending) return <LoadingState />;
  if (invoice.isError) {
    return (
      <>
        <PageHeader breadcrumb={[{ label: 'Bills', to: '/admin/bills' }, { label: `#${id}` }]} title="Bill" />
        <ErrorState message={invoice.error.message} onRetry={() => void invoice.refetch()} />
      </>
    );
  }

  const bill = invoice.data;
  const owing = toCents(bill.balance_remaining) > 0;
  const isVoid = bill.status === 'void';
  const download = () => {
    setDownloading(true);
    setDownloadError(null);
    downloadInvoicePdf(api, bill)
      .catch((e: Error) => setDownloadError(`Couldn't download the PDF: ${e.message}`))
      .finally(() => setDownloading(false));
  };

  return (
    <>
      <PageHeader
        breadcrumb={[{ label: 'Bills', to: '/admin/bills' }, { label: bill.invoice_number }]}
        title={bill.invoice_number}
        badge={
          <span className="flex flex-wrap items-center gap-2">
            <InvoiceStatusBadge status={bill.status} />
            {bill.type === 'move_in' && <Badge tone="info">Move-in bill</Badge>}
          </span>
        }
        actions={
          <>
            <Button onClick={download} disabled={downloading}>
              {downloading ? 'Downloading…' : 'Download PDF'}
            </Button>
            {!isVoid && can('invoices.manage') && <Button onClick={() => setPanel('resend')}>Resend…</Button>}
            {!isVoid && can('invoices.manage') && (
              <Button variant="danger-outline" onClick={() => setPanel('void')}>
                Void…
              </Button>
            )}
            {!isVoid && owing && can('payments.record') && (
              <ButtonLink variant="primary" to={`/admin/payments?lease=${bill.lease_id}&invoice=${bill.id}`}>
                Record payment
              </ButtonLink>
            )}
          </>
        }
      />
      {notice && <Notice tone="success">{notice}</Notice>}
      {downloadError && <Notice tone="danger">{downloadError}</Notice>}
      {isVoid && (
        <Notice tone="warn" title="This bill is void">
          Voided{bill.voided_by ? ` by ${bill.voided_by}` : ''}
          {bill.voided_at ? ` on ${formatDateTime(bill.voided_at)}` : ''}
          {bill.void_reason ? `: “${bill.void_reason}”` : ''}. It doesn&apos;t count towards what the tenant owes. The next billing run
          bills this period again
          {can('billing.run') && (
            <>
              {' '}
              (or <Link to="/admin/settings/billing">run billing now</Link>)
            </>
          )}
          .
        </Notice>
      )}
      <div className="flex flex-wrap items-start gap-6">
        <BillDocument invoice={bill} />
        <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-4">
          {panel === 'resend' && (
            <ResendBillPanel
              bill={bill}
              onClose={() => setPanel(null)}
              onSent={() => {
                setPanel(null);
                setNotice('The bill is being sent again. It shows under Messages.');
              }}
            />
          )}
          {panel === 'void' && <VoidBillPanel bill={bill} onClose={() => setPanel(null)} />}
          <Card title="Balance on this bill" id="balance">
            <span className={`num font-display text-[28px] font-bold ${owing ? 'text-warn-strong' : 'text-brand'}`}>
              {formatKES(bill.balance_remaining, { decimals: 2 })}
            </span>
            <span className="text-sm text-muted">
              Paid so far {formatKES(bill.amount_paid, { decimals: 2 })} of {formatKES(bill.total_due, { decimals: 2 })} · lease{' '}
              {bill.lease_id}
            </span>
          </Card>
          {(bill.deliveries ?? []).length > 0 ? (
            <DeliveryList deliveries={bill.deliveries ?? []} title="Messages" />
          ) : (
            <Card title="Messages">
              <span className="text-sm text-muted">Not sent yet.</span>
            </Card>
          )}
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
