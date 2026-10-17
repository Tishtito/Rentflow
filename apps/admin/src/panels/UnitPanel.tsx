import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useChargeRates, useSaveMeter, useSaveUnit } from '@rentflow/api';
import { formatQuantity, toCents, type Meter, type Unit } from '@rentflow/core';
import { Button, Eyebrow, Notice, SelectField, SidePanel, TextField } from '@rentflow/ui';
import { chargeInfo, currentCharges } from '../charges';
import { fieldErrors, formMessage } from '../errors';

const unitFields = ['unit_number', 'type', 'bedrooms', 'floor', 'default_rent', 'default_deposit', 'status', 'notes'];

/** Add a unit (no `unit`) or edit one, including its meters. */
export function UnitPanel({ propertyId, unit, onClose }: { propertyId: number; unit?: Unit; onClose: () => void }) {
  const save = useSaveUnit();
  const [form, setForm] = useState({
    unit_number: unit?.unit_number ?? '',
    type: unit?.type ?? '',
    bedrooms: unit?.bedrooms != null ? String(unit.bedrooms) : '',
    floor: unit?.floor != null ? String(unit.floor) : '',
    default_rent: unit ? String(toCents(unit.default_rent) / 100) : '',
    default_deposit: unit?.default_deposit ? String(toCents(unit.default_deposit) / 100) : '',
    status: unit?.status ?? 'vacant',
  });
  const errors = fieldErrors(save.error);
  const message = formMessage(save.error, unitFields);
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });
  const occupied = unit?.status === 'occupied';

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
  const missing = metered.filter((r) => !unit.meters?.some((m) => m.charge_code === r.charge_code));
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
