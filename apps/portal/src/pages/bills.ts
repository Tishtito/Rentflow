import { useCallback } from 'react';
import type { Invoice, TenantPayment } from '@rentflow/core';
import { downloadPortalInvoicePdf, downloadPortalReceipt, useApi } from '@rentflow/api';

/** "Download PDF" on a bill. A failed download (offline, logged out) shows a plain alert. */
export function useBillDownload() {
  const api = useApi();
  return useCallback(
    (invoice: Pick<Invoice, 'id' | 'invoice_number'>) =>
      downloadPortalInvoicePdf(api, invoice).catch(() => window.alert("Couldn't download the bill. Check your connection and try again.")),
    [api],
  );
}

/** "Receipt" on a payment: saves the receipt PDF. */
export function useReceiptDownload() {
  const api = useApi();
  return useCallback(
    (payment: Pick<TenantPayment, 'id' | 'receipt_number'>) =>
      downloadPortalReceipt(api, payment).catch(() => window.alert("Couldn't download the receipt. Check your connection and try again.")),
    [api],
  );
}
