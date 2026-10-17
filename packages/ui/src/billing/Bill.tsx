import { cn } from '@rentflow/core';
import { formatAmount, formatDate, formatDateTime, formatPeriod, formatQuantity, channelLabel, toCents } from '@rentflow/core';
import type { Invoice, InvoiceItem, NotificationDelivery, StatementLine } from '@rentflow/core';
import { DeliveryStatusBadge } from '../primitives/Badge';
import { Card } from '../primitives/Card';

/**
 * The bill as the tenant sees it on paper:
 * Item | Previous reading | Current reading | Units used | Rate | Total
 * Fixed charges (rent, garbage) leave the reading columns empty.
 */
export function BillLinesTable({ items }: { items: InvoiceItem[] }) {
  const th = 'border-b border-line-strong px-3 py-2.5 align-bottom text-xs font-medium uppercase tracking-[.04em] text-muted';
  const td = 'whitespace-nowrap border-b border-line-soft px-3 py-3.5 text-[15px]';
  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse">
          <caption className="sr-only">Bill lines</caption>
          <thead>
            <tr>
              <th scope="col" className={cn(th, 'text-left')}>
                Item
              </th>
              <th scope="col" className={cn(th, 'text-right')}>
                Previous reading
              </th>
              <th scope="col" className={cn(th, 'text-right')}>
                Current reading
              </th>
              <th scope="col" className={cn(th, 'text-right')}>
                Units used
              </th>
              <th scope="col" className={cn(th, 'text-right')}>
                Rate (KES)
              </th>
              <th scope="col" className={cn(th, 'text-right')}>
                Total (KES)
              </th>
            </tr>
          </thead>
          <tbody className="num">
            {items.map((it) => {
              const metered = it.previous_reading !== null;
              return (
                <tr key={`${it.charge_code}-${it.description}`}>
                  <td className={td}>{it.description}</td>
                  <td className={cn(td, 'text-right')}>{metered ? formatQuantity(it.previous_reading!) : ''}</td>
                  <td className={cn(td, 'text-right')}>{metered ? formatQuantity(it.current_reading!) : ''}</td>
                  <td className={cn(td, 'text-right')}>
                    {metered ? `${formatQuantity(it.quantity)}${it.unit_of_measure ? ` ${it.unit_of_measure}` : ''}` : ''}
                  </td>
                  <td className={cn(td, 'text-right')}>{metered ? formatAmount(it.rate, { decimals: 2 }) : ''}</td>
                  <td className={cn(td, 'text-right')}>{formatAmount(it.amount, { decimals: 2 })}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Phones: one line per item, readings × rate underneath for metered lines. */}
      <ul aria-label="Bill lines" className="m-0 flex list-none flex-col p-0 md:hidden">
        {items.map((it) => {
          const metered = it.previous_reading !== null;
          return (
            <li key={`${it.charge_code}-${it.description}`} className="num flex flex-col gap-0.5 border-b border-line-soft py-3">
              <span className="flex items-baseline justify-between gap-3 text-[15px]">
                <span className="min-w-0 break-words">{it.description}</span>
                <span className="shrink-0 font-semibold">{formatAmount(it.amount, { decimals: 2 })}</span>
              </span>
              {metered && (
                <span className="text-xs text-muted">
                  {formatQuantity(it.previous_reading!)} → {formatQuantity(it.current_reading!)} · {formatQuantity(it.quantity)}
                  {it.unit_of_measure ? ` ${it.unit_of_measure}` : ''} × {formatAmount(it.rate, { decimals: 2 })}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}

/** Charges + arrears = total due (+ paid so far). */
export function BillTotals({ invoice }: { invoice: Invoice }) {
  const arrears = toCents(invoice.balance_brought_forward);
  return (
    <dl className="num m-0 grid w-full max-w-[420px] grid-cols-[1fr_auto] gap-x-6 gap-y-2.5 text-[15px]">
      <dt className="text-muted">This month's charges</dt>
      <dd className="m-0 text-right">{formatAmount(invoice.current_charges, { decimals: 2 })}</dd>
      {arrears !== 0 && (
        <>
          <dt className={cn('whitespace-nowrap', arrears > 0 ? 'text-warn-strong' : 'text-brand')}>
            {arrears > 0 ? 'Arrears brought forward' : 'Credit brought forward'}
          </dt>
          <dd className={cn('m-0 text-right', arrears > 0 ? 'text-warn-strong' : 'text-brand')}>
            {formatAmount(invoice.balance_brought_forward, { decimals: 2 })}
          </dd>
        </>
      )}
      <dt className="border-t-2 border-ink pt-3 font-semibold">Total due</dt>
      <dd className="m-0 whitespace-nowrap border-t-2 border-ink pt-2 text-right font-display text-[21px] font-bold md:text-[26px]">
        KES {formatAmount(invoice.total_due, { decimals: 2 })}
      </dd>
      <dt className="text-muted">Paid so far</dt>
      <dd className="m-0 text-right text-muted">{formatAmount(invoice.amount_paid, { decimals: 2 })}</dd>
    </dl>
  );
}

/** The whole printable bill card (admin Bill detail). */
export function BillDocument({
  invoice,
  paybill,
  caretakerPhone,
}: {
  invoice: Invoice;
  paybill?: string; // M-Pesa paybill; the pay line is hidden until the account has one
  caretakerPhone?: string;
}) {
  const monthName = new Date(`${invoice.period_end}T00:00:00+03:00`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  return (
    <article
      aria-label="Bill"
      className="box-border flex min-w-0 flex-[3_1_600px] flex-col gap-7 rounded-lg border border-line bg-surface p-6 md:p-8"
    >
      <div className="flex flex-wrap justify-between gap-6">
        <div className="flex flex-col gap-1">
          <span className="font-display text-[22px] font-bold">Bill for {monthName}</span>
          <span className="text-sm text-muted">
            {invoice.unit?.property_name} · <strong className="font-semibold text-ink">House No {invoice.unit?.unit_number}</strong>
          </span>
        </div>
        <dl className="m-0 grid grid-cols-[auto_auto] gap-x-[18px] gap-y-1 text-sm">
          <dt className="text-muted">Tenant</dt>
          <dd className="m-0 font-medium">{invoice.tenant?.full_name}</dd>
          <dt className="text-muted">Period</dt>
          <dd className="m-0">{formatPeriod(invoice.period_start, invoice.period_end)}</dd>
          <dt className="text-muted">Issued</dt>
          <dd className="m-0">{formatDate(invoice.issue_date, { year: true })}</dd>
          <dt className="text-muted">Due</dt>
          <dd className="m-0 font-semibold">{formatDate(invoice.due_date, { year: true })}</dd>
        </dl>
      </div>

      <BillLinesTable items={invoice.items ?? []} />

      <div className="flex justify-end">
        <BillTotals invoice={invoice} />
      </div>

      {(paybill || caretakerPhone) && (
        <div className="flex flex-wrap justify-between gap-3 rounded-md bg-canvas px-[18px] py-4 text-sm">
          {paybill && (
            <span>
              <strong className="font-semibold">Pay via M-Pesa</strong> · Paybill {paybill} · Account{' '}
              <span className="num font-semibold">{invoice.unit?.unit_number}</span>
            </span>
          )}
          {caretakerPhone && <span className="text-muted">Questions? Call the caretaker on {caretakerPhone}</span>}
        </div>
      )}
    </article>
  );
}

/** One row per channel the bill went out on. */
export function DeliveryList({ deliveries, title = 'Sent to tenant' }: { deliveries: NotificationDelivery[]; title?: string }) {
  return (
    <Card title={title} id="deliveries">
      <ul className="m-0 flex list-none flex-col p-0">
        {deliveries.map((d, i) => (
          <li
            key={d.id}
            className={cn('flex items-center justify-between gap-3 py-2.5', i < deliveries.length - 1 && 'border-b border-line-soft')}
          >
            <span className="flex flex-col gap-0.5 text-sm">
              <strong className="font-semibold">
                {channelLabel[d.channel]}
                {d.type === 'bill_resent' && <span className="font-normal text-muted"> · sent again</span>}
              </strong>
              <span className="text-xs text-muted">
                {d.recipient}
                {(d.sent_at ?? d.created_at) && ` · ${formatDateTime((d.sent_at ?? d.created_at)!)}`}
              </span>
              {d.error && <span className="text-xs text-danger-strong">{d.error}</span>}
            </span>
            <DeliveryStatusBadge status={d.status} />
          </li>
        ))}
      </ul>
    </Card>
  );
}

/** Running balance for a lease: charges (+) and payments (−) ending in the balance. */
export function LeaseStatement({ title, lines, balance }: { title: string; lines: StatementLine[]; balance: string }) {
  return (
    <Card title={title} id="statement">
      <div className="num grid grid-cols-[1fr_auto] gap-x-4 gap-y-2.5 text-sm">
        {lines.map((l) => {
          const negative = toCents(l.amount) < 0;
          return (
            <div key={`${l.date}-${l.label}`} className="contents">
              <span className="text-muted">
                {formatDate(l.date)} · {l.label}
              </span>
              <span className={cn('text-right', negative && 'text-brand')}>
                {negative ? '−' : '+'}
                {formatAmount(Math.abs(Number(l.amount)))}
              </span>
            </div>
          );
        })}
        <span className="border-t border-line pt-2.5 font-semibold">Balance now</span>
        <span className="border-t border-line pt-2.5 text-right font-bold">{formatAmount(balance)}</span>
      </div>
    </Card>
  );
}
