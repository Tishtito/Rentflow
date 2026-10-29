import { useEffect, useState } from 'react';
import {
  ApiError,
  useAccount,
  useCan,
  useBillingRuns,
  useChangeChargeRate,
  useChargeRates,
  useProperties,
  useSaveBillingSettings,
  useStartBillingRun,
  useUnits,
} from '@rentflow/api';
import { ordinal, type ChargeRate } from '@rentflow/core';
import {
  BillingRunsTable,
  Button,
  Card,
  ChargeRateCard,
  ErrorState,
  LoadingState,
  Notice,
  PageHeader,
  RateHistoryTable,
  SegmentedControl,
  SelectField,
  SidePanel,
  TextField,
} from '@rentflow/ui';
import { currentCharges } from '../charges';
import { fieldErrors, formMessage } from '../errors';

/**
 * Prices per property (versioned: a change starts from a date, old bills keep the old price), the
 * account's billing cycle, and the billing runs.
 */
export function BillingSettingsPage() {
  const can = useCan();
  const canEdit = can('rates.manage');
  const properties = useProperties();
  const [propertyId, setPropertyId] = useState(0);
  useEffect(() => {
    if (!propertyId && properties.data?.[0]) setPropertyId(properties.data[0].id);
  }, [properties.data, propertyId]);

  return (
    <>
      <PageHeader
        title="Billing settings"
        subtitle="Prices used by the daily billing run. Changes apply from a date you choose; bills already sent never change."
        actions={
          (properties.data?.length ?? 0) > 1 && (
            <SelectField
              label="Property"
              className="min-w-[240px]"
              value={String(propertyId)}
              onChange={(e) => setPropertyId(Number(e.target.value))}
              options={(properties.data ?? []).map((p) => ({ value: String(p.id), label: p.name }))}
            />
          )
        }
      />

      {properties.isPending ? (
        <LoadingState />
      ) : properties.data?.length === 0 ? (
        <Notice tone="info">Add a property first; each property has its own prices.</Notice>
      ) : (
        propertyId > 0 && <Charges key={propertyId} propertyId={propertyId} canEdit={canEdit} />
      )}

      <div className="flex flex-wrap items-start gap-6">
        <BillingRuns canRun={can('billing.run')} />
        {can('settings.billing') && <CycleSettings />}
      </div>
    </>
  );
}

function Charges({ propertyId, canEdit }: { propertyId: number; canEdit: boolean }) {
  const rates = useChargeRates(propertyId);
  const units = useUnits(propertyId);
  const change = useChangeChargeRate();
  const [adding, setAdding] = useState(false);
  const current = currentCharges(rates.data);
  const overrides = (code: string) =>
    (rates.data ?? []).filter((r) => r.unit_id !== null && r.charge_code === code && !r.effective_to).length;
  const unitLabel = (unitId: number) => `Unit ${units.data?.find((u) => u.id === unitId)?.unit_number ?? unitId}`;
  const changeError = formMessage(change.error, []);

  if (rates.isPending) return <LoadingState />;
  if (rates.isError) return <ErrorState message={rates.error.message} onRetry={() => void rates.refetch()} />;

  return (
    <>
      <section aria-labelledby="charges-h" className="flex flex-col gap-3.5">
        <div className="flex items-center justify-between">
          <h2 id="charges-h" className="m-0 text-lg font-semibold">
            Charges
          </h2>
          {canEdit && <Button onClick={() => setAdding(true)}>+ Add charge</Button>}
        </div>
        {changeError && !adding && <Notice tone="danger">{changeError}</Notice>}
        {current.length === 0 ? (
          <Notice tone="info">
            No charges yet. Add electricity and water (metered) and fixed charges like garbage. Rent is set on each lease.
          </Notice>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] items-start gap-4">
            {current.map((r) =>
              canEdit ? (
                <ChargeRateCard
                  key={r.id}
                  rate={r}
                  overrideCount={overrides(r.charge_code)}
                  onChangeRate={(input) => change.mutateAsync({ propertyId, charge_code: r.charge_code, ...input }).then(() => undefined)}
                />
              ) : (
                <ChargeRateCard key={r.id} rate={r} overrideCount={overrides(r.charge_code)} onChangeRate={() => undefined} />
              ),
            )}
          </div>
        )}
      </section>

      <div className="flex flex-wrap items-start gap-6">
        <Card
          id="history"
          title="Rate history"
          description="Every price this property has used. Older rates are kept so past bills can be re-checked."
          padded={false}
          className="min-w-0 flex-[3_1_520px]"
        >
          <RateHistoryTable rates={rates.data} unitLabel={unitLabel} />
        </Card>
        {adding && (
          <AddChargePanel
            propertyId={propertyId}
            existing={current}
            units={(units.data ?? []).map((u) => ({ id: u.id, label: u.unit_number }))}
            onClose={() => setAdding(false)}
          />
        )}
      </div>
    </>
  );
}

/** A new charge, or a price for one unit only (an override). */
function AddChargePanel({
  propertyId,
  existing,
  units,
  onClose,
}: {
  propertyId: number;
  existing: ChargeRate[];
  units: Array<{ id: number; label: string }>;
  onClose: () => void;
}) {
  const change = useChangeChargeRate();
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Nairobi' }).format(new Date());
  const [mode, setMode] = useState<'new' | 'override'>('new');
  const [form, setForm] = useState({
    label: '',
    billing_type: 'metered' as 'metered' | 'fixed',
    unit_of_measure: '',
    rate: '',
    effective_from: today,
    charge_code: existing[0]?.charge_code ?? '',
    unit_id: '',
  });
  const errors = fieldErrors(change.error);
  const message = formMessage(change.error, [
    'charge_code',
    'label',
    'billing_type',
    'unit_of_measure',
    'rate',
    'effective_from',
    'unit_id',
  ]);
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });

  return (
    <SidePanel title={mode === 'new' ? 'Add charge' : 'Price for one unit'} subtitle="Bills from the start date use it" onClose={onClose}>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          change.mutate(
            mode === 'new'
              ? {
                  propertyId,
                  charge_code: form.label,
                  label: form.label,
                  billing_type: form.billing_type,
                  unit_of_measure: form.billing_type === 'metered' ? form.unit_of_measure || null : null,
                  rate: form.rate,
                  effective_from: form.effective_from,
                }
              : {
                  propertyId,
                  charge_code: form.charge_code,
                  rate: form.rate,
                  effective_from: form.effective_from,
                  unit_id: Number(form.unit_id),
                },
            { onSuccess: onClose },
          );
        }}
      >
        {existing.length > 0 && units.length > 0 && (
          <SegmentedControl
            legend="What to add"
            name="charge-mode"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'new', label: 'New charge' },
              { value: 'override', label: 'One unit' },
            ]}
          />
        )}
        {message && <Notice tone="danger">{message}</Notice>}
        {mode === 'new' ? (
          <>
            <TextField
              label="Name on the bill"
              placeholder="Electricity, Water, Garbage, Security…"
              required
              value={form.label}
              onChange={set('label')}
              error={errors.label ?? errors.charge_code}
            />
            <SegmentedControl
              legend="How it's charged"
              name="billing-type"
              value={form.billing_type}
              onChange={(v) => setForm({ ...form, billing_type: v })}
              options={[
                { value: 'metered', label: 'Metered (usage × rate)' },
                { value: 'fixed', label: 'Fixed per month' },
              ]}
            />
            {form.billing_type === 'metered' && (
              <TextField
                label="Unit"
                placeholder="kWh, m³"
                required
                value={form.unit_of_measure}
                onChange={set('unit_of_measure')}
                error={errors.unit_of_measure}
              />
            )}
          </>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <SelectField
              label="Charge"
              value={form.charge_code}
              onChange={set('charge_code')}
              error={errors.charge_code}
              options={existing.map((r) => ({ value: r.charge_code, label: r.label }))}
            />
            <SelectField
              label="Unit"
              required
              value={form.unit_id}
              onChange={set('unit_id')}
              error={errors.unit_id}
              options={[{ value: '', label: 'Choose…' }, ...units.map((u) => ({ value: String(u.id), label: u.label }))]}
            />
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <TextField
            label={mode === 'new' && form.billing_type === 'metered' ? `Rate per ${form.unit_of_measure || 'unit'} (KES)` : 'Amount (KES)'}
            inputMode="decimal"
            numeric
            required
            value={form.rate}
            onChange={set('rate')}
            error={errors.rate}
          />
          <TextField
            label="Applies from"
            type="date"
            required
            value={form.effective_from}
            onChange={set('effective_from')}
            error={errors.effective_from}
          />
        </div>
        {mode === 'new' && form.billing_type === 'metered' && (
          <span className="text-xs text-muted">Then fit a meter to each unit (Properties → unit → Meters).</span>
        )}
        <Button type="submit" variant="primary" size="lg" disabled={change.isPending}>
          {change.isPending ? 'Saving…' : 'Save'}
        </Button>
      </form>
    </SidePanel>
  );
}

/** 1st – 28th: the billing day must exist in every month. */
const BILLING_DAYS = Array.from({ length: 28 }, (_, i) => ({ value: String(i + 1), label: `${ordinal(i + 1)} of the month` }));

function CycleSettings() {
  const account = useAccount();
  const save = useSaveBillingSettings();
  const [form, setForm] = useState<{ billing_day: string; payment_due_days: string; invoice_prefix: string } | null>(null);
  useEffect(() => {
    if (account.data && !form) {
      setForm({
        billing_day: String(account.data.billing_day),
        payment_due_days: String(account.data.payment_due_days),
        invoice_prefix: account.data.invoice_prefix,
      });
    }
  }, [account.data, form]);
  const errors = fieldErrors(save.error);
  const message = formMessage(save.error, ['billing_day', 'payment_due_days', 'invoice_prefix']);

  return (
    <Card
      id="cycle"
      title="Billing day"
      description="Leases are billed on this day of the month: rent for the coming month and meter usage up to that day. A property or a single unit can have its own day (edit the property or unit)."
      className="min-w-0 flex-[1_1_320px] gap-4"
    >
      {!form ? (
        <LoadingState />
      ) : (
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate({
              billing_day: Number(form.billing_day),
              payment_due_days: Number(form.payment_due_days),
              invoice_prefix: form.invoice_prefix,
            });
          }}
        >
          {message && <Notice tone="danger">{message}</Notice>}
          {save.isSuccess && <Notice tone="success">Saved.</Notice>}
          <div className="grid grid-cols-2 gap-3">
            <SelectField
              label="Bill on the"
              value={form.billing_day}
              onChange={(e) => setForm({ ...form, billing_day: e.target.value })}
              error={errors.billing_day}
              options={BILLING_DAYS}
            />
            <TextField
              label="Due after (days)"
              inputMode="numeric"
              numeric
              value={form.payment_due_days}
              onChange={(e) => setForm({ ...form, payment_due_days: e.target.value })}
              error={errors.payment_due_days}
            />
          </div>
          <TextField
            label="Bill number prefix"
            value={form.invoice_prefix}
            onChange={(e) => setForm({ ...form, invoice_prefix: e.target.value })}
            error={errors.invoice_prefix}
            hint="e.g. INV → INV-2026-000001"
          />
          <span className="text-xs text-muted">
            New tenants get a move-in bill: deposit + rent up to the next billing day (days ÷ 30). A new billing day moves each lease&apos;s
            next bill to the first new billing day after it.
          </span>
          <Button type="submit" variant="primary" disabled={save.isPending}>
            {save.isPending ? 'Saving…' : 'Save billing settings'}
          </Button>
        </form>
      )}
    </Card>
  );
}

function BillingRuns({ canRun }: { canRun: boolean }) {
  const runs = useBillingRuns();
  const start = useStartBillingRun();
  const [runDate, setRunDate] = useState('');
  const error = start.error instanceof ApiError ? start.error : null;

  return (
    <>
      <Card
        id="runs"
        title="Billing runs"
        description="Every day at 06:00 Rentflow bills the leases whose billing day has come. Each run lists what it billed and skipped."
        padded={false}
        className="min-w-0 flex-[3_1_560px]"
      >
        {runs.isPending ? (
          <LoadingState />
        ) : runs.isError ? (
          <ErrorState className="m-4" message={runs.error.message} onRetry={() => void runs.refetch()} />
        ) : (
          <BillingRunsTable runs={runs.data.data} />
        )}
        {canRun && (
          <form
            className="flex flex-wrap items-end gap-3 border-t border-line px-4 py-3.5"
            onSubmit={(e) => {
              e.preventDefault();
              start.mutate(runDate ? { run_date: runDate } : {});
            }}
          >
            <TextField
              label="Bill as of"
              type="date"
              value={runDate}
              onChange={(e) => setRunDate(e.target.value)}
              hint="Empty = today. Safe to repeat."
              error={error?.field('run_date')}
            />
            <Button type="submit" variant="primary" disabled={start.isPending}>
              {start.isPending ? 'Starting…' : 'Run billing now'}
            </Button>
            {start.isSuccess && <span className="text-sm text-brand-ink">Started. It shows in the list when it finishes.</span>}
            {error && !error.field('run_date') && <span className="text-sm text-danger-strong">{error.message}</span>}
          </form>
        )}
      </Card>
    </>
  );
}
