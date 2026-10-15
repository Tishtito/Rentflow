import { useState, type ChangeEvent } from 'react';
import type { Channel, Unit } from '@rentflow/core';
import { Eyebrow } from '../primitives/Card';
import { Button } from '../primitives/Button';
import { ChannelPicker, TextField } from '../primitives/Form';
import { SidePanel } from '../primitives/Overlay';

export interface MoveInInput {
  unit_id: number;
  tenant: { first_name: string; last_name: string; phone: string; email: string; national_id: string };
  lease: { monthly_rent: string; deposit_amount: string; start_date: string; opening_balance: string };
  opening_readings: Record<number, string>; // meter_id → reading
  invite_channels: Channel[];
}

/**
 * Creates tenant + lease + opening readings and sends the portal invitation, in one step.
 * Rent is pre-filled from the unit's asking rent but saved on the lease.
 */
export function MoveInPanel({
  unit,
  meters,
  cycleDays,
  onSubmit,
  onClose,
}: {
  unit: Unit;
  meters: Array<{ id: number; label: string; unit_of_measure: string }>;
  cycleDays: number;
  onSubmit: (input: MoveInInput) => void | Promise<void>;
  onClose?: () => void;
}) {
  const [tenant, setTenant] = useState({ first_name: '', last_name: '', phone: '', email: '', national_id: '' });
  const [lease, setLease] = useState({ monthly_rent: String(Number(unit.default_rent)), deposit_amount: String(Number(unit.default_rent)), start_date: '', opening_balance: '0' });
  const [readings, setReadings] = useState<Record<number, string>>({});
  const [channels, setChannels] = useState<Channel[]>(['sms', 'whatsapp']);

  const firstBill = lease.start_date
    ? new Date(new Date(lease.start_date).getTime() + cycleDays * 86_400_000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : null;

  const t = (k: keyof typeof tenant) => ({ value: tenant[k], onChange: (e: ChangeEvent<HTMLInputElement>) => setTenant({ ...tenant, [k]: e.target.value }) });
  const l = (k: keyof typeof lease) => ({ value: lease[k], onChange: (e: ChangeEvent<HTMLInputElement>) => setLease({ ...lease, [k]: e.target.value }) });

  return (
    <SidePanel title={`Move in · Unit ${unit.unit_number}`} subtitle="Creates a lease and invites the tenant to the portal" onClose={onClose}>
      <form
        className="flex flex-col gap-[18px]"
        onSubmit={(e) => {
          e.preventDefault();
          void onSubmit({ unit_id: unit.id, tenant, lease, opening_readings: readings, invite_channels: channels });
        }}
      >
        <fieldset className="m-0 flex flex-col gap-3 border-none p-0">
          <legend className="pb-1"><Eyebrow>Tenant</Eyebrow></legend>
          <div className="grid grid-cols-2 gap-3">
            <TextField label="First name" required autoComplete="off" {...t('first_name')} />
            <TextField label="Last name" required autoComplete="off" {...t('last_name')} />
          </div>
          <TextField label="Phone" type="tel" required placeholder="+254 7XX XXX XXX" {...t('phone')} />
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Email" type="email" {...t('email')} />
            <TextField label="National ID" inputMode="numeric" {...t('national_id')} />
          </div>
        </fieldset>

        <fieldset className="m-0 flex flex-col gap-3 border-none p-0">
          <legend className="pb-1"><Eyebrow>Lease</Eyebrow></legend>
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Monthly rent (KES)" inputMode="decimal" numeric required {...l('monthly_rent')} />
            <TextField label="Deposit (KES)" inputMode="decimal" numeric {...l('deposit_amount')} />
            <TextField label="Move-in date" type="date" required {...l('start_date')} />
            <TextField label="Opening arrears" inputMode="decimal" numeric {...l('opening_balance')} />
          </div>
          <span className="text-xs text-muted">
            Rent pre-filled from the unit's asking rent.
            {firstBill && ` First bill: ${firstBill} (${cycleDays}-day cycle).`}
          </span>
        </fieldset>

        {meters.length > 0 && (
          <fieldset className="m-0 flex flex-col gap-3 border-none p-0">
            <legend className="pb-1"><Eyebrow>Opening meter readings</Eyebrow></legend>
            <div className="grid grid-cols-2 gap-3">
              {meters.map((m) => (
                <TextField
                  key={m.id}
                  label={`${m.label} (${m.unit_of_measure})`}
                  inputMode="decimal"
                  numeric
                  required
                  value={readings[m.id] ?? ''}
                  onChange={(e) => setReadings({ ...readings, [m.id]: e.target.value })}
                />
              ))}
            </div>
          </fieldset>
        )}

        <ChannelPicker legend="Send portal invitation by" value={channels} onChange={setChannels} />

        <Button type="submit" variant="primary" size="lg">
          Create lease &amp; send invite
        </Button>
      </form>
    </SidePanel>
  );
}
