import { useCallback } from 'react';
import type { Invoice } from '@rentflow/core';
import { downloadPortalInvoicePdf, useApi } from '@rentflow/api';

/** "Download PDF" on a bill. A failed download (offline, logged out) shows a plain alert. */
export function useBillDownload() {
  const api = useApi();
  return useCallback(
    (invoice: Pick<Invoice, 'id' | 'invoice_number'>) =>
      downloadPortalInvoicePdf(api, invoice).catch(() => window.alert("Couldn't download the bill. Check your connection and try again.")),
    [api],
  );
}
