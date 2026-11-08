import { useState } from 'react';
import { useAdminUser, useChangeAdminPassword } from '@rentflow/api';
import { Button, Card, CheckboxField, Notice, PageHeader, TextField } from '@rentflow/ui';
import { fieldErrors, formMessage } from '../errors';
import { roleLabel } from '../session';

/** Your own login: who you are, and change password (PUT /api/admin/auth/password). */
export function AccountPage() {
  const user = useAdminUser().data;
  const change = useChangeAdminPassword();
  const [form, setForm] = useState({ current_password: '', password: '', password_confirmation: '' });
  const [show, setShow] = useState(false);
  const [mismatch, setMismatch] = useState('');
  const errors = fieldErrors(change.error);
  const message = formMessage(change.error, Object.keys(form));
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => {
    setForm({ ...form, [k]: e.target.value });
    if (k === 'password_confirmation') setMismatch('');
  };
  if (!user) return null;

  return (
    <>
      <PageHeader title="Your account" subtitle={`${user.name} · ${user.email} · ${roleLabel(user)}`} />
      <Card title="Change password" description="Your other devices with the Rentflow Admin app will be logged out." className="max-w-[520px]">
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (form.password !== form.password_confirmation) return setMismatch("Passwords don't match");
            change.mutate(form, { onSuccess: () => setForm({ current_password: '', password: '', password_confirmation: '' }) });
          }}
        >
          {change.isSuccess && <Notice tone="success">Password changed.</Notice>}
          {message && <Notice tone="danger">{message}</Notice>}
          <TextField
            label="Current password"
            type={show ? 'text' : 'password'}
            autoComplete="current-password"
            required
            value={form.current_password}
            onChange={set('current_password')}
            error={errors.current_password}
          />
          <TextField
            label="New password"
            type={show ? 'text' : 'password'}
            autoComplete="new-password"
            required
            minLength={8}
            hint="At least 8 characters"
            value={form.password}
            onChange={set('password')}
            error={errors.password}
          />
          <TextField
            label="Confirm new password"
            type={show ? 'text' : 'password'}
            autoComplete="new-password"
            required
            value={form.password_confirmation}
            onChange={set('password_confirmation')}
            error={mismatch}
          />
          <CheckboxField label="Show passwords" checked={show} onChange={setShow} />
          <Button type="submit" variant="primary" size="lg" disabled={change.isPending}>
            {change.isPending ? 'Saving…' : 'Change password'}
          </Button>
        </form>
      </Card>
    </>
  );
}
