import { useState, type ChangeEvent, type ReactNode } from 'react';
import { formatAmount, formatDate, moveInRent, nextBillingDateAfter, toCents, type Unit } from '@rentflow/core';
import { Eyebrow } from '../primitives/Card';
import { Button } from '../primitives/Button';
import { SegmentedControl, TextField } from '../primitives/Form';
import { SidePanel } from '../primitives/Overlay';

export interface MoveInInput {
  unit_id: number;
  tenant: { first_name: string; last_name: string; phone: string; email: string; national_id: string };
  lease: {
    monthly_rent: string;
    deposit_amount: string;
    start_date: string;
    opening_balance: string;
    /** Already living here (landlord joining Rentflow): no move-in bill. */
    existing: boolean;
    /** Existing tenants: first Rentflow bill (default the next billing day). */
    first_bill_date: string;
  };
  opening_readings: Record<number, string>; // meter_id → reading
}

/**
 * Creates tenant + lease + opening readings and emails the portal invitation, in one step
 * (POST /api/admin/units/{unit}/move-in). Rent is pre-filled from the unit's asking rent but saved on the lease.
 * Two modes: a new tenant moving in (move-in bill: deposit + rent to the next billing day), or a tenant
 * already living here when the landlord joins Rentflow (no move-in bill; readings today; first bill on the
 * next billing day).
 * `errors` takes the API's field keys (tenant.phone, lease.start_date, opening_readings.{meterId}…).
 */
export function MoveInPanel({
  unit,
  meters,
  billingDay,
  onSubmit,
  onClose,
  submitting = false,
  errors,
  message,
}: {
  unit: Unit;
  meters: Array<{ id: number; label: string; unit_of_measure: string }>;
  /** The account's billing day (1–28): the first monthly bill falls on it. */
  billingDay: number;
  onSubmit: (input: MoveInInput) => void | Promise<void>;
  onClose?: () => void;
  submitting?: boolean;
  errors?: Partial<Record<string, string>>;
  /** Shown above the form, e.g. the API's error. */
  message?: ReactNode;
}) {
  const asking = String(toCents(unit.default_rent) / 100);
  const [tenant, setTenant] = useState({ first_name: '', last_name: '', phone: '', email: '', national_id: '' });
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Nairobi' }); // YYYY-MM-DD
  const [lease, setLease] = useState({
    monthly_rent: asking,
    deposit_amount: unit.default_deposit && toCents(unit.default_deposit) > 0 ? String(toCents(unit.default_deposit) / 100) : asking,
    start_date: '',
    opening_balance: '0',
    existing: false,
    first_bill_date: nextBillingDateAfter(today, billingDay),
  });
  const existing = lease.existing;
  const [readings, setReadings] = useState<Record<number, string>>({});

  // The move-in bill the backend will make (same rules: BillingCalendar / core billing.ts).
  const rentCents = toCents(lease.monthly_rent || '0');
  const depositCents = toCents(lease.deposit_amount || '0');
  const moveIn =
    !existing && /^\d{4}-\d{2}-\d{2}$/.test(lease.start_date) && rentCents > 0 ? moveInRent(rentCents, lease.start_date, billingDay) : null;

  const t = (k: keyof typeof tenant) => ({
    value: tenant[k],
    error: errors?.[`tenant.${k}`],
    onChange: (e: ChangeEvent<HTMLInputElement>) => setTenant({ ...tenant, [k]: e.target.value }),
  });
  const l = (k: Exclude<keyof typeof lease, 'existing'>) => ({
    value: lease[k],
    error: errors?.[`lease.${k}`],
    onChange: (e: ChangeEvent<HTMLInputElement>) => setLease({ ...lease, [k]: e.target.value }),
  });

  return (
    <SidePanel
      title={`Move in · Unit ${unit.unit_number}`}
      subtitle="Creates a lease and invites the tenant to the portal"
      onClose={onClose}
    >
      <form
        className="flex flex-col gap-[18px]"
        onSubmit={(e) => {
          e.preventDefault();
          void onSubmit({ unit_id: unit.id, tenant, lease, opening_readings: readings });
        }}
      >
        {message}
        <SegmentedControl<'new' | 'existing'>
          legend="Who is this?"
          name={`tenant-kind-${unit.id}`}
          value={existing ? 'existing' : 'new'}
          onChange={(v) => setLease({ ...lease, existing: v === 'existing' })}
          options={[
            { value: 'new', label: 'New tenant moving in' },
            { value: 'existing', label: 'Already living here' },
          ]}
        />
        <fieldset className="m-0 flex flex-col gap-3 border-none p-0">
          <legend className="pb-1">
            <Eyebrow>Tenant</Eyebrow>
          </legend>
          <div className="grid grid-cols-2 gap-3">
            <TextField label="First name" required autoComplete="off" {...t('first_name')} />
            <TextField label="Last name" required autoComplete="off" {...t('last_name')} />
          </div>
          <TextField label="Phone" type="tel" required placeholder="07XX XXX XXX" {...t('phone')} />
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Email" type="email" {...t('email')} />
            <TextField label="National ID" inputMode="numeric" {...t('national_id')} />
          </div>
        </fieldset>

        <fieldset className="m-0 flex flex-col gap-3 border-none p-0">
          <legend className="pb-1">
            <Eyebrow>Lease</Eyebrow>
          </legend>
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Monthly rent (KES)" inputMode="decimal" numeric required {...l('monthly_rent')} />
            <TextField
              label={existing ? 'Deposit held (not billed)' : 'Deposit (KES)'}
              inputMode="decimal"
              numeric
              {...l('deposit_amount')}
            />
            <TextField
              label={existing ? 'Moved in on' : 'Move-in date'}
              type="date"
              required
              max={existing ? today : undefined}
              {...l('start_date')}
            />
            <TextField
              label={existing ? 'Arrears they owe now' : 'Opening arrears'}
              inputMode="decimal"
              numeric
              hint={existing ? 'Negative for a credit' : 'Owed from before Rentflow'}
              {...l('opening_balance')}
            />
            {existing && <TextField label="First Rentflow bill on" type="date" min={today} required {...l('first_bill_date')} />}
          </div>
          <span className="text-xs text-muted">Rent pre-filled from the unit&apos;s asking rent.</span>
          {moveIn && (
            <div className="rounded-md bg-canvas px-3.5 py-3 text-[13px]" aria-live="polite">
              <div className="mb-1.5 font-semibold">Move-in bill</div>
              <dl className="num m-0 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1">
                {depositCents > 0 && (
                  <>
                    <dt className="text-subtle">Deposit</dt>
                    <dd className="m-0 text-right">{formatAmount(depositCents / 100, { decimals: 2 })}</dd>
                  </>
                )}
                <dt className="text-subtle">
                  Rent {formatDate(moveIn.periodStart)} – {formatDate(moveIn.periodEnd)}
                  {!moveIn.fullMonth && ` (${moveIn.days} of 30 days)`}
                </dt>
                <dd className="m-0 text-right">{formatAmount(moveIn.amountCents / 100, { decimals: 2 })}</dd>
                <dt className="border-t border-line pt-1 font-semibold">Due on move-in</dt>
                <dd className="m-0 border-t border-line pt-1 text-right font-semibold">
                  KES {formatAmount((depositCents + moveIn.amountCents) / 100, { decimals: 2 })}
                </dd>
              </dl>
              <div className="mt-1.5 text-xs text-muted">Monthly bills start on {formatDate(moveIn.firstBillingDate, { year: true })}.</div>
            </div>
          )}
          {existing && /^\d{4}-\d{2}-\d{2}$/.test(lease.first_bill_date) && (
            <p className="m-0 rounded-md bg-canvas px-3.5 py-3 text-[13px] text-subtle" aria-live="polite">
              No move-in bill. Their first Rentflow bill is on{' '}
              <strong className="text-ink">{formatDate(lease.first_bill_date, { year: true })}</strong>: rent for the coming month, meter
              usage from today&apos;s readings{toCents(lease.opening_balance || '0') !== 0 && ' and the arrears above'}.
            </p>
          )}
        </fieldset>

        {meters.length > 0 && (
          <fieldset className="m-0 flex flex-col gap-3 border-none p-0">
            <legend className="pb-1">
              <Eyebrow>{existing ? 'Meter readings today' : 'Opening meter readings'}</Eyebrow>
            </legend>
            <div className="grid grid-cols-2 gap-3">
              {meters.map((m) => (
                <TextField
                  key={m.id}
                  label={`${m.label} (${m.unit_of_measure})`}
                  inputMode="decimal"
                  numeric
                  required
                  value={readings[m.id] ?? ''}
                  error={errors?.[`opening_readings.${m.id}`]}
                  onChange={(e) => setReadings({ ...readings, [m.id]: e.target.value })}
                />
              ))}
            </div>
            <span className="text-xs text-muted">
              {existing
                ? 'Read the meters today: their first bill counts usage from these.'
                : 'The first bill counts usage from these readings.'}
            </span>
          </fieldset>
        )}

        <p className="m-0 rounded-md bg-canvas px-3.5 py-3 text-[13px] text-subtle">
          {tenant.email.trim()
            ? `The portal invitation will be emailed to ${tenant.email.trim()}.`
            : 'Add an email to send the tenant a portal invitation (you can add it later).'}
        </p>

        <Button type="submit" variant="primary" size="lg" disabled={submitting}>
          {submitting
            ? 'Saving…'
            : existing
              ? tenant.email.trim()
                ? 'Add tenant & send invite'
                : 'Add tenant'
              : tenant.email.trim()
                ? 'Create lease & send invite'
                : 'Create lease'}
        </Button>
      </form>
    </SidePanel>
  );
}
