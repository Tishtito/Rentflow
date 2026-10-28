import { useState } from 'react';
import { useAccount, useCaretakers, useSaveProperty } from '@rentflow/api';
import { ordinal, type Property } from '@rentflow/core';
import { Button, Notice, SelectField, SidePanel, TextAreaField, TextField } from '@rentflow/ui';
import { fieldErrors, formMessage } from '../errors';

const fields = ['name', 'code', 'address', 'town', 'county', 'caretaker_id', 'status', 'notes', 'billing_day'];

/** "Account default (5th)", then 1st – 28th. */
export const billingDayOptions = (inheritedLabel: string) => [
  { value: '', label: inheritedLabel },
  ...Array.from({ length: 28 }, (_, i) => ({ value: String(i + 1), label: `${ordinal(i + 1)} of the month` })),
];

/** Add a property, or edit one (`property` given). */
export function PropertyPanel({ property, onClose, onSaved }: { property?: Property; onClose: () => void; onSaved?: () => void }) {
  const save = useSaveProperty();
  const caretakers = useCaretakers();
  const account = useAccount();
  const accountDay = account.data?.billing_day ?? 5;
  const [form, setForm] = useState({
    name: property?.name ?? '',
    code: property?.code ?? '',
    address: property?.address ?? '',
    town: property?.town ?? '',
    county: property?.county ?? '',
    caretaker_id: property?.caretaker?.id ? String(property.caretaker.id) : '',
    status: property?.status ?? 'active',
    notes: property?.notes ?? '',
    billing_day: property?.billing_day ? String(property.billing_day) : '',
  });
  const errors = fieldErrors(save.error);
  const message = formMessage(save.error, fields);
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });

  return (
    <SidePanel title={property ? 'Edit property' : 'Add property'} subtitle={property ? property.name : 'A building or plot with units'} onClose={onClose}>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate(
            {
              id: property?.id,
              name: form.name,
              code: form.code || null,
              address: form.address || null,
              town: form.town || null,
              county: form.county || null,
              caretaker_id: form.caretaker_id ? Number(form.caretaker_id) : null,
              status: form.status === 'inactive' ? 'inactive' : 'active',
              notes: form.notes.trim() || null,
              billing_day: form.billing_day ? Number(form.billing_day) : null,
            },
            { onSuccess: () => (onSaved ?? onClose)() },
          );
        }}
      >
        {message && <Notice tone="danger">{message}</Notice>}
        <TextField label="Name" required value={form.name} onChange={set('name')} error={errors.name} />
        <div className="grid grid-cols-2 gap-3">
          <TextField label="Code" hint="Short, e.g. KC" value={form.code} onChange={set('code')} error={errors.code} />
          <TextField label="Town" value={form.town} onChange={set('town')} error={errors.town} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <TextField label="County" value={form.county} onChange={set('county')} error={errors.county} />
          <TextField label="Address" value={form.address} onChange={set('address')} error={errors.address} />
        </div>
        <SelectField
          label="Looked after by"
          hint="They see this property even without permission to see all properties"
          value={form.caretaker_id}
          onChange={set('caretaker_id')}
          error={errors.caretaker_id}
          options={[{ value: '', label: 'Nobody' }, ...(caretakers.data ?? []).map((c) => ({ value: String(c.id), label: c.name }))]}
        />
        <SelectField
          label="Billing day"
          hint={
            property && (property.units_count ?? 0) > 0
              ? 'Units bill on this day unless they have their own. Let units move to the new day on their next bill, which also charges the days in between.'
              : 'Units bill on this day unless they have their own.'
          }
          value={form.billing_day}
          onChange={set('billing_day')}
          error={errors.billing_day}
          options={billingDayOptions(`Account default (${ordinal(accountDay)})`)}
        />
        {property && (
          <SelectField
            label="Status"
            value={form.status}
            onChange={set('status')}
            error={errors.status}
            options={[
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive (no longer managed)' },
            ]}
          />
        )}
        <TextAreaField label="Notes" hint="Only your team sees these, e.g. gate codes or the water company account" value={form.notes} onChange={set('notes')} error={errors.notes} />
        <Button type="submit" variant="primary" size="lg" disabled={save.isPending}>
          {save.isPending ? 'Saving…' : property ? 'Save changes' : 'Add property'}
        </Button>
      </form>
    </SidePanel>
  );
}
