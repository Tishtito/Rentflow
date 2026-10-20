import { useState } from 'react';
import { usePortalPayments } from '@rentflow/api';
import { ErrorState, LoadingState, Notice, Pager, PaymentHistoryList } from '@rentflow/ui';
import { PortalPage } from '../PortalLayout';

/** Every payment the landlord has recorded for me, newest first. */
export function PaymentsPage() {
  const [page, setPage] = useState(1);
  const payments = usePortalPayments(page);

  return (
    <PortalPage title="Payments">
      {payments.isPending ? (
        <LoadingState />
      ) : payments.isError ? (
        <ErrorState message="We couldn't load your payments." onRetry={() => payments.refetch()} />
      ) : payments.data.data.length === 0 ? (
        <Notice tone="info" title="No payments yet">
          Payments show here once your landlord records them.
        </Notice>
      ) : (
        <section className="rounded-xl border border-line bg-surface px-5 py-1">
          <PaymentHistoryList payments={payments.data.data} />
          <Pager meta={payments.data.meta} page={page} onPage={setPage} busy={payments.isFetching} />
        </section>
      )}
    </PortalPage>
  );
}
