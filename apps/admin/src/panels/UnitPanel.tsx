import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useChargeRates, useSaveMeter, useSaveUnit } from '@rentflow/api';
import { billingDayChange, formatDate, formatKES, formatQuantity, ordinal, toCents, type Meter, type Unit } from '@rentflow/core';
import { Button, Eyebrow, Notice, SegmentedControl, SelectField, SidePanel, TextField } from '@rentflow/ui';
import { chargeInfo, currentCharges } from '../charges';
import { fieldErrors, formMessage } from '../errors';
import { billingDayOptions } from './PropertyPanel';

const unitFields = ['unit_number', 'type', 'bedrooms', 'floor', 'default_rent', 'default_deposit', 'status', 'notes', 'utilities', 'billing_day'];

type UtilityChoice = { billing_type: 'metered' | 'fixed'; amount: string };

/**
 * Add a unit (no `unit`) or edit one, including its meters and billing day.
 * `inheritedBillingDay`: the day it bills on without its own (the property's, else the account's).
 */
export function UnitPanel({
  propertyId,
  unit,
  inheritedBillingDay,
  onClose,
}: {
  propertyId: number;
  unit?: Unit;
  inheritedBillingDay: number;
  onClose: () => void;
}) {
  const save = useSaveUnit();
  const rates = useChargeRates(propertyId);
  // The property's metered utilities; each can be billed by meter or a fixed amount for this unit.
  const utilities = (unit?.utilities ?? currentCharges(rates.data).filter((r) => r.billing_type === 'metered')).map((u) => ({
    charge_code: u.charge_code,
    label: u.label,
    unit_of_measure: u.unit_of_measure,
    current: 'pending' in u ? u : null,
  }));
  const [choices, setChoices] = useState<Record<string, UtilityChoice>>(() =>
    Object.fromEntries(
      (unit?.utilities ?? []).map((u) => {
        const shown = u.pending ?? u; // edit what the next bill will use
        return [u.charge_code, { billing_type: shown.billing_type, amount: shown.amount ? String(toCents(shown.amount) / 100) : '' }];
      }),
    ),
  );
  const choiceFor = (code: string): UtilityChoice => choices[code] ?? { billing_type: 'metered', amount: '' };
  const [form, setForm] = useState({
    unit_number: unit?.unit_number ?? '',
    type: unit?.type ?? '',
    bedrooms: unit?.bedrooms != null ? String(unit.bedrooms) : '',
    floor: unit?.floor != null ? String(unit.floor) : '',
    default_rent: unit ? String(toCents(unit.default_rent) / 100) : '',
    default_deposit: unit?.default_deposit ? String(toCents(unit.default_deposit) / 100) : '',
    status: unit?.status ?? 'vacant',
    billing_day: unit?.billing_day ? String(unit.billing_day) : '',
  });
  const errors = fieldErrors(save.error);
  const message = formMessage(save.error, unitFields);
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });
  const occupied = unit?.status === 'occupied';
  // A let unit whose day changes: its next bill moves, and that bill also charges the days in between.
  const lease = unit?.current_lease;
  const newDay = form.billing_day ? Number(form.billing_day) : inheritedBillingDay;
  const dayChange =
    lease?.next_billing_date && newDay !== (unit?.effective_billing_day ?? inheritedBillingDay)
      ? billingDayChange(lease.next_billing_date, newDay, toCents(lease.monthly_rent))
      : null;

  return (
    <SidePanel title={unit ? `Unit ${unit.unit_number}` : 'Add unit'} subtitle={unit ? 'Details and meters' : 'Starts vacant; move a tenant in next'} onClose={onClose}>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate(
            {
              propertyId,
              unitId: unit?.id,
              unit_number: form.unit_number,
              type: form.type || null,
              bedrooms: form.bedrooms ? Number(form.bedrooms) : null,
              floor: form.floor ? Number(form.floor) : null,
              default_rent: form.default_rent || '0',
              default_deposit: form.default_deposit || null,
              ...(unit && !occupied ? { status: form.status as 'vacant' | 'reserved' | 'maintenance' } : {}),
              billing_day: form.billing_day ? Number(form.billing_day) : null,
              utilities: utilities.map((u) => {
                const c = choiceFor(u.charge_code);
                return { charge_code: u.charge_code, billing_type: c.billing_type, amount: c.billing_type === 'fixed' ? c.amount || null : null };
              }),
            },
            { onSuccess: () => !unit && onClose() },
          );
        }}
      >
        {message && <Notice tone="danger">{message}</Notice>}
        {save.isSuccess && unit && <Notice tone="success">Saved.</Notice>}
        <div className="grid grid-cols-2 gap-3">
          <TextField label="Unit number" required value={form.unit_number} onChange={set('unit_number')} error={errors.unit_number} />
          <TextField label="Type" placeholder="Bedsitter, 1BR, shop…" value={form.type} onChange={set('type')} error={errors.type} />
          <TextField label="Bedrooms" inputMode="numeric" numeric value={form.bedrooms} onChange={set('bedrooms')} error={errors.bedrooms} />
          <TextField label="Floor" inputMode="numeric" numeric value={form.floor} onChange={set('floor')} error={errors.floor} />
          <TextField label="Asking rent (KES)" inputMode="decimal" numeric required value={form.default_rent} onChange={set('default_rent')} error={errors.default_rent} />
          <TextField label="Deposit (KES)" inputMode="decimal" numeric value={form.default_deposit} onChange={set('default_deposit')} error={errors.default_deposit} />
        </div>
        {unit &&
          (occupied ? (
            <span className="text-xs text-muted">Occupied: end the lease from the tenant&apos;s page to change the status.</span>
          ) : (
            <SelectField
              label="Status"
              value={form.status}
              onChange={set('status')}
              error={errors.status}
              options={[
                { value: 'vacant', label: 'Vacant' },
                { value: 'reserved', label: 'Reserved' },
                { value: 'maintenance', label: 'Maintenance' },
              ]}
            />
          ))}
        <SelectField
          label="Billing day"
          hint={unit?.billing_day == null ? 'Most units follow the property. Give this one its own day if it bills on a different date.' : undefined}
          value={form.billing_day}
          onChange={set('billing_day')}
          error={errors.billing_day}
          options={billingDayOptions(`Property default (${ordinal(inheritedBillingDay)})`)}
        />
        {dayChange && (
          <Notice tone="info">
            The next bill moves to {formatDate(dayChange.nextBillingDate, { year: true })}
            {dayChange.gap
              ? ` and also charges ${formatDate(dayChange.gap.periodStart)} – ${formatDate(dayChange.gap.periodEnd)} (${dayChange.gap.days} days): ${formatKES(dayChange.gap.amountCents / 100)}.`
              : '.'}
          </Notice>
        )}
        {utilities.length > 0 && (
          <section className="flex flex-col gap-3 border-t border-line pt-4">
            <Eyebrow>Utilities</Eyebrow>
            <span className="text-xs text-muted">
              {occupied && unit?.current_lease?.next_billing_date
                ? `Changes apply from the next bill on ${formatDate(unit.current_lease.next_billing_date)}.`
                : 'Bill each by meter readings, or a fixed amount every month (no meter needed).'}
            </span>
            {utilities.map((u, i) => {
              const c = choiceFor(u.charge_code);
              const pending = u.current?.pending;
              return (
                <div key={u.charge_code} className="flex flex-col gap-2 rounded-md bg-sunken p-3">
                  <SegmentedControl
                    legend={u.label}
                    name={`utility-${u.charge_code}`}
                    value={c.billing_type}
                    onChange={(v) => setChoices({ ...choices, [u.charge_code]: { ...c, billing_type: v } })}
                    options={[
                      { value: 'metered', label: 'By meter' },
                      { value: 'fixed', label: 'Fixed amount' },
                    ]}
                  />
                  {c.billing_type === 'fixed' ? (
                    <TextField
                      label={`${u.label} per month (KES)`}
                      inputMode="decimal"
                      numeric
                      required
                      value={c.amount}
                      onChange={(e) => setChoices({ ...choices, [u.charge_code]: { ...c, amount: e.target.value } })}
                      error={
                        errors[`utilities.${i}.amount`] ?? errors[`utilities.${i}.billing_type`] ?? errors[`utilities.${i}.charge_code`]
                      }
                    />
                  ) : (
                    u.current && (
                      <span className="text-xs text-muted">
                        {formatKES(u.current.metered_rate)} per {u.unit_of_measure || 'unit'} used
                      </span>
                    )
                  )}
                  {pending && u.current && (
                    <span className="text-xs text-muted">
                      Now {u.current.billing_type === 'fixed' ? `fixed ${formatKES(u.current.amount ?? '0')}` : 'by meter'}; from{' '}
                      {formatDate(pending.from)}{' '}
                      {pending.billing_type === 'fixed' ? `fixed ${formatKES(pending.amount ?? '0')}` : 'by meter'}.
                    </span>
                  )}
                </div>
              );
            })}
          </section>
        )}
        <Button type="submit" variant={unit ? 'secondary' : 'primary'} size="lg" disabled={save.isPending}>
          {save.isPending ? 'Saving…' : unit ? 'Save unit' : 'Add unit'}
        </Button>
      </form>

      {unit && <MetersSection propertyId={propertyId} unit={unit} />}
    </SidePanel>
  );
}

function MetersSection({ propertyId, unit }: { propertyId: number; unit: Unit }) {
  const rates = useChargeRates(propertyId);
  const metered = currentCharges(rates.data).filter((r) => r.billing_type === 'metered');
  const fixed = (code: string) => unit.utilities?.find((u) => u.charge_code === code)?.billing_type === 'fixed';
  const missing = metered.filter((r) => !fixed(r.charge_code) && !unit.meters?.some((m) => m.charge_code === r.charge_code));
  const [editing, setEditing] = useState<{ replace?: Meter; code: string } | null>(null);

  return (
    <section className="flex flex-col gap-3 border-t border-line pt-4">
      <Eyebrow>Meters</Eyebrow>
      {metered.length === 0 && !rates.isPending && (
        <span className="text-sm text-muted">
          No metered charges yet. Add electricity or water as a metered charge in <Link to="/admin/settings/billing">Billing settings</Link>.
        </span>
      )}
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {(unit.meters ?? []).map((m) => (
          <li key={m.id} className="flex items-center justify-between gap-3 rounded-md bg-sunken px-3.5 py-2.5 text-sm">
            <span className="flex flex-col">
              <strong className="font-semibold">{chargeInfo(rates.data, m.charge_code).label}</strong>
              <span className="text-xs text-muted">
                {m.meter_number ?? 'No number'} · started at {formatQuantity(m.initial_reading)} {chargeInfo(rates.data, m.charge_code).unit}
              </span>
            </span>
            <Button variant="ghost" onClick={() => setEditing({ replace: m, code: m.charge_code })}>
              Replace
            </Button>
          </li>
        ))}
      </ul>
      {missing.map((r) => (
        <Button key={r.charge_code} variant="outline-brand" onClick={() => setEditing({ code: r.charge_code })}>
          + Fit {r.label.toLowerCase()} meter
        </Button>
      ))}
      {editing && <MeterForm unitId={unit.id} code={editing.code} replace={editing.replace} label={chargeInfo(rates.data, editing.code)} onDone={() => setEditing(null)} />}
    </section>
  );
}

function MeterForm({ unitId, code, replace, label, onDone }: { unitId: number; code: string; replace?: Meter; label: { label: string; unit: string }; onDone: () => void }) {
  const save = useSaveMeter();
  const [number, setNumber] = useState('');
  const [initial, setInitial] = useState('');
  const errors = fieldErrors(save.error);
  const message = formMessage(save.error, ['meter_number', 'initial_reading']);

  return (
    <form
      className="flex flex-col gap-3 rounded-md border border-line p-3.5"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate({ unitId, replaceMeterId: replace?.id, charge_code: code, meter_number: number || null, initial_reading: initial }, { onSuccess: onDone });
      }}
    >
      <strong className="text-sm">{replace ? `Replace ${label.label.toLowerCase()} meter` : `New ${label.label.toLowerCase()} meter`}</strong>
      {replace && <span className="text-xs text-muted">The old meter is kept for past bills; new bills count from the new meter&apos;s reading.</span>}
      {message && <Notice tone="danger">{message}</Notice>}
      <div className="grid grid-cols-2 gap-3">
        <TextField label="Meter number" value={number} onChange={(e) => setNumber(e.target.value)} error={errors.meter_number} />
        <TextField label={`Reading now (${label.unit || 'units'})`} inputMode="decimal" numeric required value={initial} onChange={(e) => setInitial(e.target.value)} error={errors.initial_reading} />
      </div>
      <div className="flex gap-2">
        <Button type="submit" variant="primary" disabled={save.isPending}>
          {save.isPending ? 'Saving…' : 'Save meter'}
        </Button>
        <Button onClick={onDone}>Cancel</Button>
      </div>
    </form>
  );
}
