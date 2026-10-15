import { useState } from 'react';
import { formatAmount, formatDate } from '@rentflow/core';
import type { ChargeRate } from '@rentflow/core';
import { Badge } from '../primitives/Badge';
import { Button } from '../primitives/Button';
import { DataTable } from '../primitives/DataTable';
import { TextField } from '../primitives/Form';
import { cn } from '@rentflow/core';

const perLabel = (r: ChargeRate) => (r.billing_type === 'metered' ? `per ${r.unit_of_measure ?? 'unit'}` : 'per month');

/**
 * One charge (electricity, water, garbage…) with its current price.
 * Rates are versioned: "Change rate" never edits — it submits a new rate + start date,
 * and the API closes the old version (ChargeRate::change on the backend).
 */
export function ChargeRateCard({
  rate,
  overrideCount = 0,
  onChangeRate,
}: {
  rate: ChargeRate;
  overrideCount?: number;
  onChangeRate: (input: { rate: string; effective_from: string }) => void | Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [newRate, setNewRate] = useState('');
  const [from, setFrom] = useState('');

  const lastDayOld = from ? formatDate(new Date(new Date(from).getTime() - 86_400_000).toISOString().slice(0, 10)) : null;

  return (
    <article
      className={cn('flex flex-col gap-3.5 rounded-lg bg-surface p-5', editing ? 'border-2 border-brand' : 'border border-line')}
    >
      <div className="flex items-center justify-between">
        <h3 className="m-0 text-base font-semibold">{rate.label}</h3>
        <Badge tone={rate.billing_type === 'metered' ? 'success' : 'neutral'}>
          {rate.billing_type === 'metered' ? 'Metered' : 'Fixed'}
        </Badge>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="num font-display text-[34px] font-bold">KES {formatAmount(rate.rate)}</span>
        <span className="text-sm text-muted">{perLabel(rate)}</span>
      </div>
      <span className="text-[13px] text-muted">
        Since {formatDate(rate.effective_from, { year: true })}
        {overrideCount > 0 && ` · ${overrideCount} unit override${overrideCount > 1 ? 's' : ''}`}
      </span>

      {!editing ? (
        <Button onClick={() => setEditing(true)}>Change rate</Button>
      ) : (
        <form
          className="flex flex-col gap-3 border-t border-line pt-3.5"
          onSubmit={async (e) => {
            e.preventDefault();
            await onChangeRate({ rate: newRate, effective_from: from });
            setEditing(false);
          }}
        >
          <span className="text-sm font-semibold">Change rate</span>
          <div className="grid grid-cols-2 gap-2.5">
            <TextField label="New rate (KES)" inputMode="decimal" numeric required value={newRate} onChange={(e) => setNewRate(e.target.value)} />
            <TextField label="Applies from" type="date" required value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          {newRate && from && (
            <p className="m-0 rounded-sm bg-canvas px-3 py-2.5 text-[13px] text-subtle">
              KES {formatAmount(rate.rate)} stays on bills up to {lastDayOld}. Bills from {formatDate(from)} use KES {formatAmount(newRate)}.
            </p>
          )}
          <div className="flex gap-2">
            <Button type="submit" variant="primary" className="flex-1">
              Save new rate
            </Button>
            <Button onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        </form>
      )}
    </article>
  );
}

/** Every version of every rate for a property, current ones flagged. */
export function RateHistoryTable({ rates, unitLabel }: { rates: ChargeRate[]; unitLabel: (unitId: number) => string }) {
  return (
    <DataTable
      caption="Rate history"
      rows={rates}
      rowKey={(r) => r.id}
      columns={[
        { key: 'charge', header: 'Charge', cell: (r) => r.label },
        {
          key: 'scope',
          header: 'Applies to',
          cell: (r) => (r.unit_id ? <strong className="font-semibold">{unitLabel(r.unit_id)} only</strong> : 'All units'),
        },
        {
          key: 'rate',
          header: 'Rate',
          align: 'right',
          numeric: true,
          cell: (r) => (
            <span className={r.effective_to ? 'text-muted' : undefined}>
              {formatAmount(r.rate)} / {r.billing_type === 'metered' ? r.unit_of_measure : 'month'}
            </span>
          ),
        },
        { key: 'from', header: 'From', cell: (r) => formatDate(r.effective_from, { year: true }) },
        {
          key: 'to',
          header: 'To',
          cell: (r) => (r.effective_to ? <span className="text-muted">{formatDate(r.effective_to, { year: true })}</span> : <Badge tone="success">Current</Badge>),
        },
        { key: 'by', header: 'Set by', cell: (r) => r.created_by_name ?? '—' },
      ]}
    />
  );
}
