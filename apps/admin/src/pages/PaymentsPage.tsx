import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { MessagePlan } from '@rentflow/core';
import { ApiError, downloadPaymentReceipt, useApi, usePayments, useRecordPayment } from '@rentflow/api';
import {
  Button,
  Card,
  ErrorState,
  LoadingState,
  MessagesNotice,
  Notice,
  PageHeader,
  PaymentsTable,
  RecordPaymentPanel,
  TextField,
} from '@rentflow/ui';

/** Fields the panel shows errors beside; anything else goes in the notice at the top. */
const formFields = ['lease_id', 'amount', 'paid_at', 'reference'];

const positiveInt = (v: string | null) => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
};

/**
 * Payments: list (GET /api/admin/payments) + record cash/bank/cheque (POST, 202).
 * `?lease=&invoice=` (from a bill page) pre-fills and opens the record panel.
 */
export function PaymentsPage() {
  const [params, setParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [panelOpen, setPanelOpen] = useState(params.has('lease'));
  const [leaseId, setLeaseId] = useState(params.get('lease') ?? '');
  const [saved, setSaved] = useState<MessagePlan[] | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const api = useApi();
  const invoiceId = positiveInt(params.get('invoice'));

  const payments = usePayments({ page });
  const record = useRecordPayment();
  const lease = positiveInt(leaseId);

  const apiError = record.error instanceof ApiError ? record.error : null;
  const fieldErrors = apiError ? Object.fromEntries(Object.keys(apiError.errors).map((k) => [k, apiError.field(k)])) : undefined;
  const otherErrors = apiError
    ? Object.keys(apiError.errors)
        .filter((k) => !formFields.includes(k))
        .map((k) => apiError.field(k))
    : [];
  const meta = payments.data?.meta;

  const closePanel = () => {
    setPanelOpen(false);
    record.reset();
    if (params.has('lease')) setParams({}, { replace: true });
  };

  return (
    <>
      <PageHeader
        title="Payments"
        subtitle="M-Pesa payments will arrive automatically. Record cash, bank and cheque payments here."
        actions={
          <Button
            variant="primary"
            onClick={() => {
              setSaved(null);
              setPanelOpen(true);
            }}
          >
            + Record payment
          </Button>
        }
      />

      {saved && (
        <MessagesNotice title="Payment recorded" messages={saved}>
          <span>The bill's balance and status are updated. Receipt:</span>
        </MessagesNotice>
      )}
      {downloadError && <Notice tone="danger">{downloadError}</Notice>}

      <div className="flex flex-wrap items-start gap-6">
        <Card id="all" title="All payments" padded={false} className="min-w-0 flex-[3_1_560px]">
          {payments.isPending ? (
            <LoadingState />
          ) : payments.isError ? (
            <ErrorState className="m-4" message={payments.error.message} onRetry={() => void payments.refetch()} />
          ) : (
            <>
              <PaymentsTable
                payments={payments.data.data}
                invoiceHref={(p) => `/admin/bills/${p.invoice_id}`}
                onDownloadReceipt={(p) => {
                  setDownloadError(null);
                  downloadPaymentReceipt(api, p).catch((e: Error) =>
                    setDownloadError(`Couldn't download ${p.receipt_number}: ${e.message}`),
                  );
                }}
              />
              {meta && (
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 text-[13px] text-muted">
                  <span className="num">{meta.total === 0 ? 'No payments yet' : `Showing ${meta.from}–${meta.to} of ${meta.total}`}</span>
                  <span className="flex gap-2">
                    <Button disabled={page <= 1 || payments.isFetching} onClick={() => setPage((p) => p - 1)}>
                      Newer
                    </Button>
                    <Button disabled={page >= meta.last_page || payments.isFetching} onClick={() => setPage((p) => p + 1)}>
                      Older
                    </Button>
                  </span>
                </div>
              )}
            </>
          )}
        </Card>

        {panelOpen && (
          <RecordPaymentPanel
            onClose={closePanel}
            lease={lease ? { id: lease, label: `Lease ${lease}`, open_invoice_number: null, balance: null } : null}
            tenantPicker={
              // Until the leases API exists the lease is picked by its number (shown on the bill).
              <TextField
                label="Lease number"
                inputMode="numeric"
                numeric
                required
                value={leaseId}
                onChange={(e) => setLeaseId(e.target.value)}
                error={fieldErrors?.lease_id}
                hint={invoiceId ? `Applied to bill #${invoiceId}` : 'Applied to the latest bill on this lease.'}
              />
            }
            showReceiptChannels={false}
            submitting={record.isPending}
            errors={fieldErrors}
            message={
              apiError && (otherErrors.length > 0 || Object.keys(apiError.errors).length === 0) ? (
                <Notice tone="danger">{otherErrors.length > 0 ? otherErrors.join(' ') : apiError.message}</Notice>
              ) : null
            }
            onSubmit={(input) =>
              record.mutate(
                {
                  lease_id: input.lease_id,
                  invoice_id: invoiceId,
                  amount: input.amount,
                  method: input.method,
                  reference: input.reference || null,
                  paid_at: input.paid_at,
                },
                {
                  onSuccess: (sent) => {
                    setSaved(sent.messages);
                    setPage(1);
                    closePanel();
                  },
                },
              )
            }
          />
        )}
      </div>
    </>
  );
}
