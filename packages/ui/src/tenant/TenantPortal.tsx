import { useId } from 'react';
import { CalendarClock, Download, Droplet, House, Info, KeyRound, Receipt, Trash2, Zap } from 'lucide-react';
import { cn } from '@rentflow/core';
import { formatAmount, formatDate, formatPeriod, formatQuantity, methodLabel, toCents } from '@rentflow/core';
import type { Invoice, Payment, TenantPayment } from '@rentflow/core';
import { ChevronRightIcon } from '../icons';
import { GlassButton, GlassCard, LineItemRow, StatusPill, type GlassIcon } from '../portal/Glass';

/** Small glass chip under the hero amount ("This bill 18,500"). */
function StatChip({ label, value, tone }: { label: string; value: string; tone?: 'amber' }) {
  return (
    <span className="glass inline-flex items-baseline gap-1.5 rounded-full px-3 py-1.5 text-xs shadow-none">
      <span className="text-glass-muted">{label}</span>
      <span className={cn('num font-semibold', tone === 'amber' ? 'text-glass-amber' : 'text-glass-text')}>{value}</span>
    </span>
  );
}

/**
 * Hero glass card: what the tenant owes now (the lease balance), the bill's due date (coral when
 * overdue), this bill / arrears / paid-so-far chips, and the pay button. Without `onPay` (no M-Pesa
 * yet) it says to pay the landlord as usual. `home` labels the card when the tenant has more than one.
 */
export function AmountDueCard({
  invoice,
  balance,
  home,
  paybill,
  accountRef,
  onPay,
  paying,
}: {
  invoice: Invoice;
  balance: string; // lease balance (may differ from invoice total after part payments)
  home?: string; // "House 7-7, Kims Apartments"
  paybill?: string;
  accountRef?: string;
  onPay?: () => void; // M-Pesa STK push
  paying?: boolean;
}) {
  const id = useId();
  const arrears = toCents(invoice.balance_brought_forward);
  const settled = toCents(balance) <= 0;
  return (
    <GlassCard strong aria-labelledby={id} className="relative flex flex-col gap-4 overflow-hidden p-[22px]">
      <span aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-glass-sage/25 blur-3xl" />
      <div className="relative flex items-start justify-between gap-3">
        <h2 id={id} className="m-0 flex flex-col gap-0.5 text-sm font-medium text-glass-muted">
          {settled ? 'All paid up' : 'Amount due'}
          {home && <span className="text-xs font-normal">{home}</span>}
        </h2>
        {settled ? (
          <StatusPill tone="sage">Paid</StatusPill>
        ) : (
          <StatusPill tone={invoice.status === 'overdue' ? 'coral' : 'amber'}>
            {invoice.status === 'overdue' ? `Overdue · was due ${formatDate(invoice.due_date)}` : `Due ${formatDate(invoice.due_date)}`}
          </StatusPill>
        )}
      </div>
      <p className="relative m-0 flex items-baseline gap-2">
        <span className="text-base font-medium text-glass-muted">KES</span>
        <span className="num text-[42px] font-semibold leading-none tracking-tight">{formatAmount(Math.max(0, toCents(balance) / 100))}</span>
      </p>
      {!settled && (
        <div className="relative flex flex-wrap gap-2">
          <StatChip label="This bill" value={formatAmount(invoice.current_charges)} />
          {arrears !== 0 && <StatChip label="Arrears" value={formatAmount(invoice.balance_brought_forward)} tone="amber" />}
          {toCents(invoice.amount_paid) > 0 && <StatChip label="Paid so far" value={formatAmount(invoice.amount_paid)} />}
        </div>
      )}
      {!settled &&
        (onPay ? (
          <>
            <GlassButton onClick={onPay} loading={paying} className="relative w-full">
              {paying ? 'Check your phone…' : 'Pay with M-Pesa'}
            </GlassButton>
            {paybill && (
              <span className="relative text-center text-[13px] text-glass-muted">
                Or Paybill {paybill} · Account {accountRef}
              </span>
            )}
          </>
        ) : (
          <p className="relative m-0 flex gap-2 text-[13px] leading-snug text-glass-muted">
            <Info size={16} strokeWidth={1.75} className="mt-px shrink-0" aria-hidden="true" />
            Pay your landlord the usual way; payments show here once they record them.
          </p>
        ))}
    </GlassCard>
  );
}

/** Line icons by charge code (anything else: a receipt). */
const chargeIcon: Record<string, GlassIcon> = {
  rent: House,
  electricity: Zap,
  water: Droplet,
  garbage: Trash2,
  deposit: KeyRound,
};

/** Bill breakdown for the tenant: icon per line, readings under metered lines, arrears in amber, serif total. */
export function TenantBillCard({ invoice, onDownload }: { invoice: Invoice; onDownload?: () => void }) {
  // Named for the month the period starts: the 5 Nov – 4 Dec bill is the November bill.
  const month = new Date(`${invoice.period_start}T00:00:00+03:00`).toLocaleDateString('en-GB', { month: 'long' });
  const id = useId();
  return (
    <GlassCard aria-labelledby={id} className="flex flex-col p-5">
      <div className="flex items-baseline justify-between gap-3 pb-1">
        <h2 id={id} className="m-0 text-[17px] font-semibold">
          {month} bill
        </h2>
        <span className="text-[13px] text-glass-muted">{formatPeriod(invoice.period_start, invoice.period_end).replace(/ \d{4}$/, '')}</span>
      </div>
      {(invoice.items ?? []).map((it) => (
        <LineItemRow
          key={`${it.charge_code}-${it.description}`}
          icon={chargeIcon[it.charge_code] ?? Receipt}
          label={it.description}
          sub={
            it.previous_reading !== null && (
              <>
                {formatQuantity(it.previous_reading)} → {formatQuantity(it.current_reading!)} · {formatQuantity(it.quantity)}
                {it.unit_of_measure ? ` ${it.unit_of_measure}` : ''} × {formatAmount(it.rate)}
              </>
            )
          }
          amount={formatAmount(it.amount)}
        />
      ))}
      {toCents(invoice.balance_brought_forward) !== 0 && (
        <LineItemRow icon={CalendarClock} label="Arrears" amount={formatAmount(invoice.balance_brought_forward)} tone="amber" />
      )}
      <div className="mt-1 flex items-baseline justify-between border-0 border-t border-solid border-glass-strong pt-4">
        <span className="text-[15px] font-semibold">Total</span>
        <span className="num font-serif text-[22px] font-semibold">
          <span className="mr-1.5 font-inter text-sm font-medium text-glass-muted">KES</span>
          {formatAmount(invoice.total_due)}
        </span>
      </div>
      {onDownload && (
        <GlassButton variant="glass" onClick={onDownload} className="mt-4 self-start shadow-none">
          <Download size={18} strokeWidth={1.75} aria-hidden="true" />
          Download PDF
        </GlassButton>
      )}
    </GlassCard>
  );
}

export function PaymentHistoryList({ payments }: { payments: Array<Payment | TenantPayment> }) {
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
