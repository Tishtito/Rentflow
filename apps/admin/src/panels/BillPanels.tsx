import { useState } from 'react';
import { ApiError, useBillLeaseNow, useRebillInvoice, useResendInvoice, useVoidInvoice } from '@rentflow/api';
import { formatDate, formatKES, formatPeriod, type Channel, type Invoice, type RebillResponse, type SentResponse } from '@rentflow/core';
import { Button, ButtonLink, ChannelPicker, MessagesNotice, Notice, SidePanel, TextAreaField } from '@rentflow/ui';
import { fieldErrors, formMessage } from '../errors';

type Bill = Pick<Invoice, 'id' | 'invoice_number' | 'period_start' | 'period_end' | 'total_due'> & { tenant?: Invoice['tenant'] };

/** Send a bill again by email and/or WhatsApp, to the tenant's current contact details. */
export function ResendBillPanel({ bill, onClose, onSent }: { bill: Bill; onClose: () => void; onSent?: (sent: SentResponse) => void }) {
  const resend = useResendInvoice();
  const [channels, setChannels] = useState<Channel[]>(bill.tenant?.email ? ['email'] : ['whatsapp']);
  const message = formMessage(resend.error);

  return (
    <SidePanel title={`Resend ${bill.invoice_number}`} subtitle={bill.tenant?.full_name} onClose={onClose}>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          resend.mutate(
            { id: bill.id, channels: channels as Array<'email' | 'whatsapp'> },
            { onSuccess: (sent) => (onSent ? onSent(sent) : onClose()) },
          );
        }}
      >
        {message && <Notice tone="danger">{message}</Notice>}
        <ChannelPicker legend="Send by" channels={['email', 'whatsapp']} value={channels} onChange={setChannels} />
        <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
          <dt className="text-muted">Email</dt>
          <dd className="m-0">{bill.tenant?.email ?? <span className="text-muted">none on file</span>}</dd>
          <dt className="text-muted">WhatsApp</dt>
          <dd className="m-0">{bill.tenant?.phone ?? <span className="text-muted">none on file</span>}</dd>
        </dl>
        <p className="m-0 text-xs text-muted">The tenant gets the same bill and PDF again. Each send shows under Messages on the bill.</p>
        <Button type="submit" variant="primary" size="lg" disabled={resend.isPending || channels.length === 0}>
          {resend.isPending ? 'Sending…' : 'Send bill'}
        </Button>
      </form>
    </SidePanel>
  );
}

/** Void a wrong bill: needs a reason and a second click. The next billing run bills the period again. */
export function VoidBillPanel({ bill, onClose }: { bill: Bill; onClose: () => void }) {
  const voidBill = useVoidInvoice();
  const [reason, setReason] = useState('');
  const [confirm, setConfirm] = useState(false);
  const errors = fieldErrors(voidBill.error);
  const message =
    voidBill.error instanceof ApiError
      ? (errors.invoice ?? formMessage(voidBill.error, ['reason', 'invoice']))
      : formMessage(voidBill.error);

  return (
    <SidePanel
      title={`Void ${bill.invoice_number}`}
      subtitle={`${formatPeriod(bill.period_start, bill.period_end)} · ${formatKES(bill.total_due)}`}
      onClose={onClose}
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!confirm) return setConfirm(true);
          voidBill.mutate({ id: bill.id, reason }, { onSuccess: onClose, onError: () => setConfirm(false) });
        }}
      >
        {message && <Notice tone="danger">{message}</Notice>}
        <Notice tone="warn">
          The bill stays on record as <strong>void</strong> and stops counting towards what the tenant owes. The next billing run (or
          &quot;Run billing&quot; in Billing settings) makes a new bill for the same period, with today&apos;s readings and prices. Fix the
          reading or price first.
        </Notice>
        <TextAreaField
          label="Reason"
          required
          hint="Kept on the bill and in the activity log"
          value={reason}
          onChange={(e) => (setReason(e.target.value), setConfirm(false))}
          error={errors.reason}
        />
        <Button type="submit" variant="danger-outline" size="lg" disabled={voidBill.isPending || reason.trim() === ''}>
          {voidBill.isPending ? 'Voiding…' : confirm ? 'Click again to void' : 'Void bill'}
        </Button>
        <p className="m-0 text-xs text-muted">Only the latest bill of a lease can be voided, and only before a payment is applied to it.</p>
      </form>
    </SidePanel>
  );
}

/**
 * Re-bill: void this bill and make it again for this tenant only, with the current rent, prices and readings.
 * Same period and dates; the tenant gets the new bill.
 */
export function RebillPanel({ bill, onClose, onDone }: { bill: Bill; onClose: () => void; onDone: (result: RebillResponse) => void }) {
  const rebill = useRebillInvoice();
  const [reason, setReason] = useState('');
  const [confirm, setConfirm] = useState(false);
  const errors = fieldErrors(rebill.error);
  const message =
    rebill.error instanceof ApiError ? (errors.invoice ?? formMessage(rebill.error, ['reason', 'invoice'])) : formMessage(rebill.error);

  return (
    <SidePanel
      title={`Re-bill ${bill.invoice_number}`}
      subtitle={`${formatPeriod(bill.period_start, bill.period_end)} · ${formatKES(bill.total_due)}`}
      onClose={onClose}
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!confirm) return setConfirm(true);
          rebill.mutate({ id: bill.id, reason }, { onSuccess: onDone, onError: () => setConfirm(false) });
        }}
      >
        {message && <Notice tone="danger">{message}</Notice>}
        <Notice tone="info">
          This bill becomes <strong>void</strong> and a new one is made straight away for this tenant only, with the lease&apos;s current
          rent, today&apos;s prices and the latest readings. It keeps the same period and due date and is sent to the tenant. Change the
          rent, price or reading first.
        </Notice>
        <TextAreaField
          label="Reason"
          required
          maxLength={480}
          hint="Kept on the void bill and in the activity log"
          value={reason}
          onChange={(e) => (setReason(e.target.value), setConfirm(false))}
          error={errors.reason}
        />
        <Button type="submit" variant="primary" size="lg" disabled={rebill.isPending || reason.trim() === ''}>
          {rebill.isPending ? 'Making the new bill…' : confirm ? 'Click again to re-bill' : 'Re-bill'}
        </Button>
        <p className="m-0 text-xs text-muted">Only the latest bill of a lease, and only before a payment is applied to it.</p>
      </form>
    </SidePanel>
  );
}

/**
 * "Bill now": make one tenant's due monthly bill straight away (e.g. the run skipped it for a missing reading
 * that's now entered, or the unit switched to a fixed amount). Shows where it was sent and a link to it.
 */
export function BillNowPanel({
  lease,
  onClose,
}: {
  lease: { id: number; next_billing_date: string; unit_number?: string | null; tenant_name?: string | null };
  onClose: () => void;
}) {
  const bill = useBillLeaseNow();
  const errors = fieldErrors(bill.error);
  const message = bill.error instanceof ApiError ? (errors.lease ?? formMessage(bill.error, ['lease'])) : formMessage(bill.error);

  return (
    <SidePanel
      title={`Bill ${lease.unit_number ? `house ${lease.unit_number}` : 'now'}`}
      subtitle={lease.tenant_name ?? undefined}
      onClose={onClose}
      className="flex-none"
    >
      {bill.isSuccess ? (
        <div className="flex flex-col gap-3">
          <MessagesNotice title="Bill made. It is being sent to the tenant." messages={bill.data.messages} />
          <ButtonLink variant="primary" to={`/admin/bills/${bill.data.invoice_id}`}>
            Open the bill
          </ButtonLink>
        </div>
      ) : (
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            bill.mutate({ leaseId: lease.id });
          }}
        >
          {message && <Notice tone="danger">{message}</Notice>}
          <Notice tone="warn">
            The bill due on {formatDate(lease.next_billing_date, { year: true })} hasn&apos;t been made yet (the billing run skipped it,
            usually for a missing meter reading).
          </Notice>
          <span className="text-xs text-muted">
            Makes it now with today&apos;s readings and prices: rent and fixed charges for the coming month, usage up to the billing day,
            and arrears. Issued today and sent to the tenant. Enter any missing reading (or set the utility to a fixed amount) first.
          </span>
          <Button type="submit" variant="primary" size="lg" disabled={bill.isPending}>
            {bill.isPending ? 'Making the bill…' : 'Bill now'}
          </Button>
        </form>
      )}
    </SidePanel>
  );
}
