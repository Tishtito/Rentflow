import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@rentflow/core';
import { formatAmount, formatDateTime, formatKES, methodLabel, toCents } from '@rentflow/core';
import type { Channel, Payment, PaymentMethod, UnmatchedMpesaPayment } from '@rentflow/core';
import { Badge, PaymentStatusBadge } from '../primitives/Badge';
import { Button } from '../primitives/Button';
import { DataTable, type Column } from '../primitives/DataTable';
import { ChannelPicker, SegmentedControl, TextField } from '../primitives/Form';
import { SidePanel } from '../primitives/Overlay';
import { actionsColumn } from '../primitives/RowActions';
import { EyeIcon, ReceiptIcon } from '../icons';

/** Outcome pill: "Paid in full" · "Part · 15,350 left" · "Overpaid · 500 credit" · "Reversed". */
export function PaymentOutcomeBadge({ payment }: { payment: Payment }) {
  if (payment.status === 'reversed') return <Badge tone="danger">Reversed</Badge>;
  if (payment.status === 'pending') return <Badge tone="info">Pending</Badge>;
  const o = payment.outcome;
  if (o?.kind === 'partial') return <Badge tone="caution">Part · {formatAmount(o.remaining ?? 0)} left</Badge>;
  if (o?.kind === 'credit') return <Badge tone="success">Overpaid · {formatAmount(o.credit ?? 0)} credit</Badge>;
  if (o?.kind === 'paid') return <Badge tone="success">Paid in full</Badge>;
  // The API doesn't send `outcome` yet: show the payment's own status rather than guessing.
  return <PaymentStatusBadge status={payment.status} />;
}

export function PaymentsTable({
  payments,
  invoiceHref,
  onDownloadReceipt,
}: {
  payments: Payment[];
  invoiceHref: (p: Payment) => string;
  /** Shows "Download receipt" on payments that have one. */
  onDownloadReceipt?: (p: Payment) => void;
}) {
  const columns: Column<Payment>[] = [
    { key: 'date', header: 'Date', cell: (p) => formatDateTime(p.paid_at) },
    {
      key: 'tenant',
      header: 'Tenant',
      cell: (p) => (
        <>
          <strong className="font-semibold">{p.tenant?.full_name}</strong> <span className="text-muted">· {p.unit_number}</span>
        </>
      ),
    },
    {
      key: 'method',
      header: 'Method · reference',
      cell: (p) => (
        <>
          {methodLabel[p.method]}
          {p.reference && ` · ${p.reference}`}
          {p.recorded_by_name && <span className="block text-xs text-muted">by {p.recorded_by_name}</span>}
        </>
      ),
    },
    {
      key: 'applied',
      header: 'Applied to',
      cell: (p) => (p.invoice_number ? <Link to={invoiceHref(p)}>{p.invoice_number}</Link> : <span className="text-muted">—</span>),
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      numeric: true,
      cell: (p) => (
        <span className={cn('font-semibold', p.status === 'reversed' && 'text-muted line-through')}>{formatAmount(p.amount)}</span>
      ),
    },
    actionsColumn<Payment>((p) => [
      { label: `View bill ${p.invoice_number ?? ''}`.trim(), icon: EyeIcon, to: invoiceHref(p), hidden: !p.invoice_number },
      {
        label: `Download receipt ${p.receipt_number ?? ''} (PDF)`.trim(),
        icon: ReceiptIcon,
        onClick: () => onDownloadReceipt?.(p),
        hidden: !onDownloadReceipt || !p.receipt_number,
      },
    ]),
    { key: 'status', header: 'Status', cell: (p) => <PaymentOutcomeBadge payment={p} /> },
  ];
  return <DataTable caption="Payments" columns={columns} rows={payments} rowKey={(p) => p.id} empty="No payments in this period." />;
}

/** An M-Pesa payment whose account number matched no unit. */
export function UnmatchedPaymentRow({
  payment,
  onMatchSuggested,
  onChoose,
}: {
  payment: UnmatchedMpesaPayment;
  onMatchSuggested: (p: UnmatchedMpesaPayment) => void;
  onChoose: (p: UnmatchedMpesaPayment) => void;
}) {
  const s = payment.suggestion;
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-sunken px-4 py-3.5">
      <span className="flex flex-col gap-[3px] text-sm">
        <span>
          <strong className="num font-semibold">{formatKES(payment.amount)}</strong> · {payment.trans_id} · {formatDateTime(payment.received_at)}
        </span>
        <span className="text-[13px] text-muted">
          From {payment.msisdn_masked} · account typed: <strong className="font-semibold text-ink">“{payment.bill_ref}”</strong>
        </span>
        <span className={cn('text-[13px]', s ? 'text-brand-ink' : 'text-muted')}>
          {s ? `Suggested: House ${s.unit_number} · ${s.tenant_name} (${s.reason})` : 'No suggestion'}
        </span>
      </span>
      <span className="flex gap-2">
        {s ? (
          <>
            <Button variant="primary" onClick={() => onMatchSuggested(payment)}>
              Match to {s.unit_number}
            </Button>
            <Button onClick={() => onChoose(payment)}>Choose…</Button>
          </>
        ) : (
          <Button variant="outline-brand" onClick={() => onChoose(payment)}>
            Choose tenant…
          </Button>
        )}
      </span>
    </li>
  );
}

/** "YYYY-MM-DD" today in Nairobi (toISOString() would give UTC, a day early before 03:00). */
const todayInNairobi = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Nairobi' }).format(new Date());

export interface RecordPaymentInput {
  lease_id: number;
  amount: string;
  method: Exclude<PaymentMethod, 'mpesa' | 'other'>;
  paid_at: string;
  reference: string;
  receipt_channels: Channel[];
}

/**
 * Record a cash / bank / cheque payment. Shows the open bill and a live
 * "balance after this payment" so the landlord sees the effect before saving.
 * Tenant search is passed in as `tenantPicker` so it can be wired to the API.
 */
export function RecordPaymentPanel({
  lease,
  tenantPicker,
  onSubmit,
  onClose,
  defaultChannels = ['sms', 'whatsapp'],
  showReceiptChannels = true,
  submitting = false,
  errors,
  message,
}: {
  /** `balance` null = unknown (no lease lookup yet): the live "balance after" line is hidden. */
  lease: { id: number; label: string; open_invoice_number: string | null; balance: string | null } | null;
  tenantPicker: ReactNode;
  onSubmit: (input: RecordPaymentInput) => void | Promise<void>;
  onClose?: () => void;
  defaultChannels?: Channel[];
  showReceiptChannels?: boolean; // hidden until payment receipts are sent
  submitting?: boolean;
  /** Validation errors from the API, by field. */
  errors?: Partial<Record<string, string>>;
  /** Shown above the form, e.g. the API's error or a "saved" note. */
  message?: ReactNode;
}) {
  const [method, setMethod] = useState<RecordPaymentInput['method']>('cash');
  const [amount, setAmount] = useState('');
  const [paidAt, setPaidAt] = useState(todayInNairobi);
  const [reference, setReference] = useState('');
  const [channels, setChannels] = useState<Channel[]>(defaultChannels);

  const after = useMemo(() => {
    if (!lease || lease.balance === null || !amount) return null;
    return (toCents(lease.balance) - toCents(amount.replace(/,/g, ''))) / 100;
  }, [lease, amount]);

  return (
    <SidePanel title="Record payment" subtitle="For cash, bank or cheque" onClose={onClose}>
      <form
        className="flex flex-col gap-[18px]"
        onSubmit={(e) => {
          e.preventDefault();
          if (!lease) return;
          void onSubmit({ lease_id: lease.id, amount: amount.replace(/,/g, ''), method, paid_at: paidAt, reference, receipt_channels: channels });
        }}
      >
        {message}
        {tenantPicker}
        {lease && lease.balance !== null && (
          <dl className="num m-0 grid grid-cols-[1fr_auto] gap-x-3 gap-y-1.5 rounded-md bg-canvas px-4 py-3.5 text-sm">
            <dt className="text-muted">Open bill</dt>
            <dd className="m-0">{lease.open_invoice_number ?? '—'}</dd>
            <dt className="text-muted">Balance owed</dt>
            <dd className="m-0 font-semibold">{formatKES(lease.balance)}</dd>
          </dl>
        )}

        <SegmentedControl
          legend="Method"
          name="method"
          value={method}
          onChange={setMethod}
          options={[
            { value: 'cash', label: 'Cash' },
            { value: 'bank', label: 'Bank' },
            { value: 'cheque', label: 'Cheque' },
          ]}
        />

        <div className="grid grid-cols-2 gap-3">
          <TextField
            label="Amount (KES)"
            inputMode="decimal"
            numeric
            emphasis
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            error={errors?.amount}
          />
          <TextField label="Date received" type="date" required value={paidAt} onChange={(e) => setPaidAt(e.target.value)} error={errors?.paid_at} />
        </div>
        <TextField
          label="Receipt / reference no."
          required={method === 'bank'}
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          error={errors?.reference}
        />

        {after !== null && (
          <div
            className={cn(
              'num flex items-center justify-between rounded-md px-4 py-3 text-sm',
              after > 0 ? 'bg-caution-soft text-caution-ink' : 'bg-brand-soft text-brand-ink',
            )}
            aria-live="polite"
          >
            <span>{after < 0 ? 'Credit after this payment' : 'Balance after this payment'}</span>
            <strong className="font-bold">{formatKES(Math.abs(after))}</strong>
          </div>
        )}

        {showReceiptChannels && <ChannelPicker legend="Send receipt by" value={channels} onChange={setChannels} />}

        <Button type="submit" variant="primary" size="lg" disabled={!lease || !amount || submitting}>
          {submitting ? 'Saving…' : 'Save payment'}
        </Button>
      </form>
    </SidePanel>
  );
}
