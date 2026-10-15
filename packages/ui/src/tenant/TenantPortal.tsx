import { cn } from '@rentflow/core';
import { formatAmount, formatDate, formatKES, formatPeriod, formatQuantity, methodLabel, toCents } from '@rentflow/core';
import type { Invoice, Payment } from '@rentflow/core';
import { Badge } from '../primitives/Badge';
import { Button } from '../primitives/Button';
import { ChevronRightIcon } from '../icons';

/** Dark hero card: what the tenant owes now, with the pay button. */
export function AmountDueCard({
  invoice,
  balance,
  paybill,
  accountRef,
  onPay,
  paying,
}: {
  invoice: Invoice;
  balance: string; // lease balance (may differ from invoice total after part payments)
  paybill: string;
  accountRef: string;
  onPay: () => void; // M-Pesa STK push
  paying?: boolean;
}) {
  const arrears = toCents(invoice.balance_brought_forward);
  const settled = toCents(balance) <= 0;
  return (
    <section aria-labelledby="due-h" className="flex flex-col gap-4 rounded-[20px] bg-nav p-[22px] text-white">
      <div className="flex items-center justify-between">
        <h2 id="due-h" className="m-0 text-sm font-medium text-nav-text">
          {settled ? 'All paid up' : 'Amount due'}
        </h2>
        {!settled && <Badge tone="gold" className="font-bold">Due {formatDate(invoice.due_date)}</Badge>}
      </div>
      <span className="num font-display text-[42px] font-bold leading-none">{formatKES(Math.max(0, toCents(balance) / 100))}</span>
      {!settled && (
        <span className="num text-sm text-nav-text">
          {arrears > 0
            ? `This bill ${formatAmount(invoice.current_charges)} + arrears ${formatAmount(invoice.balance_brought_forward)}`
            : `This bill ${formatAmount(invoice.current_charges)}`}
        </span>
      )}
      {!settled && (
        <>
          <Button variant="mint" size="xl" onClick={onPay} disabled={paying}>
            {paying ? 'Check your phone…' : 'Pay with M-Pesa'}
          </Button>
          <span className="text-center text-[13px] text-nav-text">
            Or Paybill {paybill} · Account {accountRef}
          </span>
        </>
      )}
    </section>
  );
}

/** Bill breakdown for the tenant, readings shown under each metered line. */
export function TenantBillCard({ invoice, onDownload }: { invoice: Invoice; onDownload?: () => void }) {
  const month = new Date(`${invoice.period_end}T00:00:00+03:00`).toLocaleDateString('en-GB', { month: 'long' });
  const row = 'num flex items-center justify-between border-b border-line-soft py-3 text-[15px]';
  return (
    <section aria-labelledby="bill-h" className="flex flex-col gap-1 rounded-xl border border-line bg-surface p-5">
      <div className="flex items-baseline justify-between pb-2">
        <h2 id="bill-h" className="m-0 text-[17px] font-semibold">
          {month} bill
        </h2>
        <span className="text-[13px] text-muted">{formatPeriod(invoice.period_start, invoice.period_end).replace(/ \d{4}$/, '')}</span>
      </div>
      {(invoice.items ?? []).map((it) => (
        <div key={`${it.charge_code}-${it.description}`} className={row}>
          <span className="flex flex-col gap-0.5">
            {it.description}
            {it.previous_reading !== null && (
              <span className="text-xs text-muted">
                {formatQuantity(it.previous_reading)} → {formatQuantity(it.current_reading!)} · {formatQuantity(it.quantity)}
                {it.unit_of_measure ? ` ${it.unit_of_measure}` : ''} × {formatAmount(it.rate)}
              </span>
            )}
          </span>
          <span>{formatAmount(it.amount)}</span>
        </div>
      ))}
      {toCents(invoice.balance_brought_forward) !== 0 && (
        <div className={cn(row, 'text-warn-strong')}>
          <span>Arrears</span>
          <span>{formatAmount(invoice.balance_brought_forward)}</span>
        </div>
      )}
      <div className="num flex justify-between pb-1 pt-3.5 text-base font-bold">
        <span>Total</span>
        <span>{formatKES(invoice.total_due)}</span>
      </div>
      {onDownload && (
        <button type="button" onClick={onDownload} className="inline-flex min-h-touch items-center self-start text-sm font-medium text-brand">
          Download PDF
        </button>
      )}
    </section>
  );
}

export function PaymentHistoryList({ payments }: { payments: Payment[] }) {
  return (
    <ul className="m-0 list-none p-0">
      {payments.map((p, i) => (
        <li key={p.id} className={cn('flex items-center justify-between py-3', i < payments.length - 1 && 'border-b border-line-soft')}>
          <span className="flex flex-col gap-0.5 text-[15px]">
            {formatDate(p.paid_at, { year: true })}
            <span className="text-xs text-muted">
              {methodLabel[p.method]} {p.reference}
            </span>
          </span>
          <span className="num font-semibold text-brand">{formatAmount(p.amount)}</span>
        </li>
      ))}
    </ul>
  );
}

/** "Which home?" choices when one login matches several landlords. */
export function HomeChoiceList({
  homes,
  selectedId,
  onChoose,
}: {
  homes: Array<{ tenant_id: number; unit_label: string; landlord?: string }>;
  selectedId?: number;
  onChoose: (tenantId: number) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      {homes.map((h) => {
        const on = h.tenant_id === selectedId;
        return (
          <button
            key={h.tenant_id}
            type="button"
            onClick={() => onChoose(h.tenant_id)}
            className={cn(
              'flex min-h-[72px] items-center justify-between gap-3 rounded-lg px-4 py-3.5 text-left',
              on ? 'border-2 border-brand bg-brand-soft' : 'border border-line-strong bg-surface',
            )}
          >
            <span className="flex flex-col gap-0.5">
              <strong className="text-base font-semibold">{h.unit_label}</strong>
              {h.landlord && <span className={cn('text-[13px]', on ? 'text-subtle' : 'text-muted')}>{h.landlord}</span>}
            </span>
            <ChevronRightIcon className={on ? 'text-brand' : 'text-muted'} />
          </button>
        );
      })}
    </div>
  );
}
