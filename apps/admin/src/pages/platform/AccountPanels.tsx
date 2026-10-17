import { useState } from 'react';
import { useCreateAccount, useUpdateAccount } from '@rentflow/api';
import type { PlatformAccountDetail } from '@rentflow/core';
import { Button, Eyebrow, Notice, SidePanel, TextField } from '@rentflow/ui';
import { fieldErrors, formMessage } from '../../errors';

/** New landlord account; the owner gets an email to set their password. */
export function AccountCreatePanel({ onClose }: { onClose: () => void }) {
  const create = useCreateAccount();
  const [f, setF] = useState({ business_name: '', email: '', phone: '', owner_name: '', owner_email: '', owner_phone: '' });
  const errors = fieldErrors(create.error);
  const message = formMessage(create.error, Object.keys(f));
  const field = (k: keyof typeof f) => ({
    value: f[k],
    error: errors[k],
    onChange: (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value }),
  });

  return (
    <SidePanel title="New landlord account" subtitle="The owner gets an email to set up their login" onClose={onClose}>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate(
            { ...f, email: f.email || null, phone: f.phone || null, owner_phone: f.owner_phone || null },
            { onSuccess: onClose },
          );
        }}
      >
        {message && <Notice tone="danger">{message}</Notice>}
        <Eyebrow>Business</Eyebrow>
        <TextField label="Business name" required {...field('business_name')} />
        <div className="grid grid-cols-2 gap-3">
          <TextField label="Email" type="email" hint="Defaults to the owner's" {...field('email')} />
          <TextField label="Phone" type="tel" placeholder="07XX XXX XXX" {...field('phone')} />
        </div>
        <Eyebrow>Owner</Eyebrow>
        <TextField label="Full name" required {...field('owner_name')} />
        <TextField label="Email" type="email" required hint="Their login" {...field('owner_email')} />
        <TextField label="Phone" type="tel" placeholder="07XX XXX XXX" {...field('owner_phone')} />
        <Button type="submit" variant="primary" size="lg" disabled={create.isPending}>
          {create.isPending ? 'Creating…' : 'Create account & invite owner'}
        </Button>
      </form>
    </SidePanel>
  );
}

/** Edit an account's details and billing settings. */
export function AccountEditPanel({ account, onClose }: { account: PlatformAccountDetail; onClose: () => void }) {
  const update = useUpdateAccount();
  const [f, setF] = useState({
    name: account.name,
    email: account.email ?? '',
    phone: account.phone ?? '',
    timezone: account.timezone,
    billing_day: String(account.billing_day),
    payment_due_days: String(account.payment_due_days),
    invoice_prefix: account.invoice_prefix,
  });
  const errors = fieldErrors(update.error);
  const message = formMessage(update.error, Object.keys(f));
  const field = (k: keyof typeof f) => ({
    value: f[k],
    error: errors[k],
    onChange: (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value }),
  });

  return (
    <SidePanel title="Edit account" subtitle={account.name} onClose={onClose}>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          update.mutate(
            {
              id: account.id,
              ...f,
              email: f.email || null,
              phone: f.phone || null,
              billing_day: Number(f.billing_day),
              payment_due_days: Number(f.payment_due_days),
            },
            { onSuccess: onClose },
          );
        }}
      >
        {message && <Notice tone="danger">{message}</Notice>}
        <TextField label="Business name" required {...field('name')} />
        <div className="grid grid-cols-2 gap-3">
          <TextField label="Email" type="email" {...field('email')} />
          <TextField label="Phone" type="tel" {...field('phone')} />
        </div>
        <TextField label="Time zone" required {...field('timezone')} />
        <Eyebrow>Billing</Eyebrow>
        <div className="grid grid-cols-3 gap-3">
          <TextField label="Billing day (1–28)" inputMode="numeric" numeric required {...field('billing_day')} />
          <TextField label="Due after (days)" inputMode="numeric" numeric required {...field('payment_due_days')} />
          <TextField label="Bill prefix" required {...field('invoice_prefix')} />
        </div>
        <span className="text-xs text-muted">A new billing day moves each lease&apos;s next bill to the first new billing day after it.</span>
        <Button type="submit" variant="primary" size="lg" disabled={update.isPending}>
          {update.isPending ? 'Saving…' : 'Save changes'}
        </Button>
      </form>
    </SidePanel>
  );
}
