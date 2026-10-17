import { useState } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@rentflow/core';
import { formatDate, formatKES, formatQuantity, toCents } from '@rentflow/core';
import type { MeterReadingTask } from '@rentflow/core';
import { Badge } from '../primitives/Badge';
import { Button } from '../primitives/Button';
import { TextField } from '../primitives/Form';
import { CameraIcon, CheckIcon } from '../icons';

type Meter = MeterReadingTask['meters'][number];

/** units used × rate, in cents-safe maths. Returns null for an invalid (lower) reading. */
function usage(meter: Meter, value: string) {
  if (value === '') return null;
  const used = Number(value) - Number(meter.previous_reading);
  if (Number.isNaN(used) || used < 0) return null;
  return { used, amount: (Math.round(used * 100) * toCents(meter.rate)) / 10_000 };
}

/**
 * Caretaker's capture card for one unit: saved meters collapse to a summary,
 * the next one to capture shows a large numeric input with live usage and cost.
 */
export function MeterReadingCard({
  task,
  onSave,
  onAddPhoto,
  saving = false,
  errors,
}: {
  task: MeterReadingTask;
  onSave: (readings: Array<{ meter_id: number; reading: string }>) => void | Promise<void>;
  onAddPhoto?: (meterId: number) => void;
  saving?: boolean;
  /** API errors by meter id (e.g. "lower than the previous reading"). */
  errors?: Partial<Record<number, string>>;
}) {
  const [values, setValues] = useState<Record<number, string>>({});
  const remaining = task.meters.filter((m) => m.current_reading === null);
  const headingId = `unit-${task.unit_id}`;

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4 rounded-[16px] border-2 border-brand bg-surface p-[18px]">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <h2 id={headingId} className="m-0 font-display text-[22px] font-bold">
            House {task.unit_number}
          </h2>
          <span className="text-[13px] text-muted">
            {task.tenant_name} · bills {formatDate(task.bills_on)}
          </span>
        </div>
        {remaining.length > 0 ? <Badge tone="warn">{remaining.length} left</Badge> : <Badge tone="success">Done</Badge>}
      </div>

      {task.meters.map((m) => {
        if (m.current_reading !== null) {
          const u = usage(m, m.current_reading)!;
          return (
            <div key={m.meter_id} className="flex flex-col gap-2 rounded-[12px] bg-canvas p-3.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold">{m.label}</span>
                <span className="flex items-center gap-1.5 text-[13px] font-semibold text-brand-ink">
                  <CheckIcon />
                  Saved
                </span>
              </div>
              <div className="num flex justify-between text-sm text-subtle">
                <span>
                  {formatQuantity(m.previous_reading)} → <strong className="text-ink">{formatQuantity(m.current_reading)}</strong> {m.unit_of_measure}
                </span>
                <span>
                  {formatQuantity(u.used)} used · {formatKES(u.amount)}
                </span>
              </div>
            </div>
          );
        }

        const value = values[m.meter_id] ?? '';
        const u = usage(m, value);
        const tooLow = value !== '' && u === null;
        return (
          <div key={m.meter_id} className="flex flex-col gap-2.5">
            <div className="flex items-baseline justify-between">
              <span className="font-semibold">{m.label}</span>
              <span className="num text-[13px] text-muted">
                Last reading: {formatQuantity(m.previous_reading)} {m.unit_of_measure}
                {m.previous_date ? ` on ${formatDate(m.previous_date)}` : ' (starting reading)'}
              </span>
            </div>
            <TextField
              label={`Current reading (${m.unit_of_measure})`}
              inputMode="decimal"
              size="xl"
              emphasis
              numeric
              value={value}
              error={tooLow ? `Can't be lower than the last reading (${formatQuantity(m.previous_reading)}).` : errors?.[m.meter_id]}
              onChange={(e) => setValues((v) => ({ ...v, [m.meter_id]: e.target.value }))}
            />
            {u && (
              <div className="num flex justify-between rounded-md bg-brand-soft px-3.5 py-2.5 text-sm text-brand-ink" aria-live="polite">
                <span>
                  {formatQuantity(u.used)} {m.unit_of_measure} used
                </span>
                <strong className="font-semibold">{formatKES(u.amount)}</strong>
              </div>
            )}
            {onAddPhoto && (
              <Button
                className={cn('min-h-[48px] rounded-[12px] border-dashed border-[#8E9A93]')}
                icon={<CameraIcon />}
                onClick={() => onAddPhoto(m.meter_id)}
              >
                Add photo of meter
              </Button>
            )}
          </div>
        );
      })}

      {remaining.length > 0 && (
        <Button
          variant="primary"
          size="xl"
          disabled={saving || remaining.some((m) => usage(m, values[m.meter_id] ?? '') === null)}
          onClick={() => onSave(remaining.map((m) => ({ meter_id: m.meter_id, reading: values[m.meter_id]! })))}
        >
          Save &amp; next unit
        </Button>
      )}
    </section>
  );
}

/** Collapsed unit in the caretaker's to-do list. */
export function ReadingTaskLink({ task, to }: { task: MeterReadingTask; to: string }) {
  const missing = task.meters.filter((m) => m.current_reading === null);
  const label = missing.length === task.meters.length && missing.length > 1 ? 'Both' : missing.map((m) => m.label).join(', ');
  return (
    <Link
      to={to}
      className="flex min-h-touch items-center justify-between rounded-lg border border-line bg-surface p-4 text-ink no-underline hover:text-ink"
    >
      <span className="flex flex-col gap-0.5">
        <strong className="text-base font-semibold">House {task.unit_number}</strong>
        <span className="text-[13px] text-muted">
          {task.tenant_name} · bills {formatDate(task.bills_on)}
        </span>
      </span>
      <Badge tone="warn">{label}</Badge>
    </Link>
  );
}
