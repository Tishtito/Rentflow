import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { downloadInvoicePdf, useApi, useCan, useInvoices, useProperties } from '@rentflow/api';
import {
  formatAmount,
  formatDate,
  formatKES,
  formatPeriod,
  toCents,
  type Invoice,
  type InvoiceListStatus,
  type MessagePlan,
} from '@rentflow/core';
import {
  Badge,
  CardIcon,
  Card,
  DataTable,
  ErrorState,
  EyeIcon,
  FilterChips,
  InvoiceStatusBadge,
  LoadingState,
  MailIcon,
  MessagesNotice,
  Notice,
  PageHeader,
  Pager,
  ReceiptIcon,
  SearchInput,
  SelectField,
  StatCard,
  StatGrid,
  TextField,
  actionsColumn,
} from '@rentflow/ui';
import { ResendBillPanel } from '../panels/BillPanels';

type StatusFilter = '' | 'unpaid' | 'overdue' | 'paid' | 'void';

/** Every bill (limited to the properties you can see): search, filters, totals, download, resend. */
export function BillsPage() {
  const api = useApi();
  const can = useCan();
  const [params, setParams] = useSearchParams();
  const status = (params.get('status') ?? '') as StatusFilter;
  const propertyId = params.get('property') ?? '';
  const month = params.get('month') ?? '';
  const [search, setSearch] = useState(params.get('q') ?? '');
  const [debounced, setDebounced] = useState(search.trim());
  const [page, setPage] = useState(1);
  const [resending, setResending] = useState<Invoice | null>(null);
  const [notice, setNotice] = useState<{ title: string; messages: MessagePlan[] } | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);
  const properties = useProperties();
  const bills = useInvoices({
    search: debounced || undefined,
    status: (status || undefined) as InvoiceListStatus | undefined,
    property_id: propertyId ? Number(propertyId) : undefined,
    month: month || undefined,
    page,
  });
  const summary = bills.data?.meta.summary;
  const setParam = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    setParams(next, { replace: true });
    setPage(1);
  };
  const download = (bill: Invoice) => {
    setDownloadError(null);
    downloadInvoicePdf(api, bill).catch((e: Error) => setDownloadError(`Couldn't download ${bill.invoice_number}: ${e.message}`));
  };

  return (
    <>
      <PageHeader title="Bills" subtitle="Made by the daily billing run. Open one to see its lines, payments and messages." />
      <StatGrid label="Bills matching the filters">
        <StatCard
          label="Billed"
          value={summary ? formatKES(summary.total_due) : '—'}
          footnote={summary ? `${summary.count} bill${summary.count === 1 ? '' : 's'}` : undefined}
        />
        <StatCard label="Paid" value={summary ? formatKES(summary.amount_paid) : '—'} />
        <StatCard
          label="Outstanding"
          value={summary ? formatKES(summary.outstanding) : '—'}
          tone={summary && toCents(summary.outstanding) > 0 ? 'warn' : 'default'}
        />
      </StatGrid>
      {notice && <MessagesNotice title={notice.title} messages={notice.messages} />}
      {downloadError && <Notice tone="danger">{downloadError}</Notice>}
      {/* The panel sits beside the table on wide screens and wraps below it on narrow ones. */}
      <div className="flex flex-wrap items-start gap-6">
        <Card padded={false} className="min-w-0 flex-[3_1_560px]">
          <div className="flex flex-wrap items-end gap-4 px-4 pb-1.5 pt-4">
            <SearchInput
              label="Search bills"
              placeholder="Bill number, tenant, phone or unit"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:min-w-[220px] sm:max-w-[320px] sm:flex-1"
            />
            <SelectField
              label="Property"
              value={propertyId}
              onChange={(e) => setParam('property', e.target.value)}
              options={[
                { value: '', label: 'All properties' },
                ...(properties.data ?? []).map((p) => ({ value: String(p.id), label: p.name })),
              ]}
              className="w-full sm:w-[200px]"
            />
            <TextField
              label="Issued in"
              type="month"
              value={month}
              onChange={(e) => setParam('month', e.target.value)}
              className="w-full sm:w-[170px]"
            />
          </div>
          <div className="px-4 pb-2">
            <FilterChips<StatusFilter>
              label="Status"
              value={status}
              onChange={(v) => setParam('status', v)}
              options={[
                { value: '', label: 'All' },
                { value: 'unpaid', label: 'Unpaid' },
                { value: 'overdue', label: 'Overdue' },
                { value: 'paid', label: 'Paid' },
                { value: 'void', label: 'Void' },
              ]}
            />
          </div>
          {bills.isPending ? (
            <LoadingState />
          ) : bills.isError ? (
            <ErrorState className="m-4" message={bills.error.message} onRetry={() => void bills.refetch()} />
          ) : (
            <>
              <DataTable<Invoice>
                caption="Bills"
                rows={bills.data.data}
                rowKey={(b) => b.id}
                rowClassName={(b) => (b.status === 'void' ? 'text-muted' : undefined)}
                empty={
                  debounced || status || propertyId || month
                    ? 'No bills match.'
                    : 'No bills yet. The daily billing run makes them when each lease’s cycle ends.'
                }
                columns={[
                  {
                    key: 'no',
                    header: 'Bill',
                    cell: (b) => (
                      <span className="flex flex-wrap items-center gap-2">
                        <Link to={`/admin/bills/${b.id}`} className={b.status === 'void' ? 'font-semibold line-through' : 'font-semibold'}>
                          {b.invoice_number}
                        </Link>
                        {b.type === 'move_in' && <Badge tone="info">Move-in</Badge>}
                      </span>
                    ),
                  },
                  {
                    key: 'tenant',
                    header: 'Tenant',
                    cell: (b) => (
                      <>
                        {b.tenant ? <Link to={`/admin/tenants/${b.tenant.id}`}>{b.tenant.full_name}</Link> : '—'}
                        <span className="block text-xs text-muted">
                          {b.unit?.unit_number} · {b.unit?.property_name}
                        </span>
                      </>
                    ),
                  },
                  {
                    key: 'period',
                    header: 'Period',
                    cell: (b) => <span className="whitespace-nowrap">{formatPeriod(b.period_start, b.period_end)}</span>,
                  },
                  { key: 'due', header: 'Due', cell: (b) => <span className="whitespace-nowrap">{formatDate(b.due_date)}</span> },
                  { key: 'total', header: 'Total (KES)', align: 'right', numeric: true, cell: (b) => formatAmount(b.total_due) },
                  {
                    key: 'balance',
                    header: 'Balance',
                    align: 'right',
                    numeric: true,
                    cell: (b) =>
                      toCents(b.balance_remaining) > 0 ? (
                        <span className="font-semibold text-warn-strong">{formatAmount(b.balance_remaining)}</span>
                      ) : (
                        <span className="text-muted">—</span>
                      ),
                  },
                  { key: 'status', header: 'Status', cell: (b) => <InvoiceStatusBadge status={b.status} /> },
                  actionsColumn<Invoice>((b) => [
                    { label: `View ${b.invoice_number}`, icon: EyeIcon, to: `/admin/bills/${b.id}` },
                    { label: `Download ${b.invoice_number} (PDF)`, icon: ReceiptIcon, onClick: () => download(b) },
                    {
                      label: `Record a payment for ${b.invoice_number}`,
                      icon: CardIcon,
                      to: `/admin/payments?lease=${b.lease_id}&invoice=${b.id}`,
                      hidden: !can('payments.record') || b.status === 'void' || toCents(b.balance_remaining) <= 0,
                    },
                    {
                      label: `Resend ${b.invoice_number}`,
                      icon: MailIcon,
                      onClick: () => setResending(b),
                      hidden: !can('invoices.manage') || b.status === 'void',
                    },
                  ]),
                ]}
              />
              <Pager meta={bills.data.meta} page={page} onPage={setPage} busy={bills.isFetching} />
            </>
          )}
        </Card>
        {resending && (
          <ResendBillPanel
            bill={resending}
            onClose={() => setResending(null)}
            onSent={(sent) => {
              setNotice({ title: `${resending.invoice_number} is being sent again.`, messages: sent.messages });
              setResending(null);
            }}
          />
        )}
      </div>
    </>
  );
}
