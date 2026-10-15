import type { ReactNode } from 'react';
import { cn } from '@rentflow/core';
import type {
  AccountStatus,
  BillingRunStatus,
  DeliveryStatus,
  InvoiceStatus,
  LeaseStatus,
  PaymentStatus,
  UnitStatus,
  WhatsAppStatus,
} from '@rentflow/core';

export type Tone = 'success' | 'warn' | 'caution' | 'danger' | 'info' | 'neutral' | 'gold';

const tones: Record<Tone, string> = {
  success: 'bg-brand-soft text-brand-ink',
  warn: 'bg-warn-soft text-warn-ink',
  caution: 'bg-caution-soft text-caution-ink',
  danger: 'bg-danger-soft text-danger-ink',
  info: 'bg-info-soft text-info-ink',
  neutral: 'bg-line-soft text-subtle',
  gold: 'bg-gold-soft text-gold-ink',
};

export function Badge({ tone = 'neutral', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-[3px] text-xs font-semibold',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ---- Status → badge mappings, so every screen labels statuses the same way ---- */

const invoice: Record<InvoiceStatus, [Tone, string]> = {
  draft: ['neutral', 'Draft'],
  issued: ['info', 'Issued · unpaid'],
  partially_paid: ['caution', 'Part paid'],
  paid: ['success', 'Paid'],
  overdue: ['warn', 'Overdue'],
  void: ['danger', 'Void'],
};

const unit: Record<UnitStatus, [Tone, string]> = {
  occupied: ['success', 'Occupied'],
  vacant: ['neutral', 'Vacant'],
  reserved: ['info', 'Reserved'],
  maintenance: ['danger', 'Maintenance'],
};

const lease: Record<LeaseStatus, [Tone, string]> = {
  active: ['success', 'Active'],
  notice: ['caution', 'Notice'],
  ended: ['neutral', 'Ended'],
};

const payment: Record<PaymentStatus, [Tone, string]> = {
  confirmed: ['success', 'Confirmed'],
  pending: ['info', 'Pending'],
  reversed: ['danger', 'Reversed'],
};

const delivery: Record<DeliveryStatus, [Tone, string]> = {
  delivered: ['success', 'Delivered'],
  sent: ['info', 'Sent'],
  queued: ['neutral', 'Queued'],
  failed: ['danger', 'Failed'],
};

const account: Record<AccountStatus | 'onboarding', [Tone, string]> = {
  active: ['success', 'Active'],
  suspended: ['danger', 'Suspended'],
  closed: ['neutral', 'Closed'],
  onboarding: ['info', 'Onboarding'],
};

const billingRun: Record<BillingRunStatus, [Tone, string]> = {
  running: ['info', 'Running'],
  completed: ['success', 'Completed'],
  completed_with_errors: ['warn', 'Some skipped'],
  failed: ['danger', 'Failed'],
};

const whatsapp: Record<WhatsAppStatus, [Tone, string]> = {
  active: ['success', 'Connected'],
  disabled: ['neutral', 'Disconnected'],
};

function make<K extends string>(map: Record<K, [Tone, string]>) {
  return function StatusBadge({ status, className }: { status: K; className?: string }) {
    const [tone, label] = map[status];
    return (
      <Badge tone={tone} className={className}>
        {label}
      </Badge>
    );
  };
}

export const InvoiceStatusBadge = make(invoice);
export const UnitStatusBadge = make(unit);
export const LeaseStatusBadge = make(lease);
export const PaymentStatusBadge = make(payment);
export const DeliveryStatusBadge = make(delivery);
export const AccountStatusBadge = make(account);
export const BillingRunStatusBadge = make(billingRun);
export const WhatsAppStatusBadge = make(whatsapp);
