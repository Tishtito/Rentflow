import { Fragment, useRef, type KeyboardEvent } from 'react';
import { belowPrevious, cn, formatAmount, formatDate, formatQuantity, readingUsage, type MeterReadingTask } from '@rentflow/core';
import { Badge } from '../primitives/Badge';
import { RowActions } from '../primitives/RowActions';
import { ClockIcon, EyeIcon } from '../icons';

type TaskMeter = MeterReadingTask['meters'][number];

/**
 * Desktop reading entry: every meter of every unit in one table. Type the new readings (Enter moves to the
 * next box), see usage and cost as you type, save them all at once. The parent owns the values.
 */
export function ReadingsTable({
  tasks,
  values,
  onChange,
  errors,
  onHistory,
  onOpenUnit,
  readingDate,
}: {
  tasks: MeterReadingTask[];
  /** The date the new readings will be saved with (to warn when it's the previous reading's day). */
  readingDate?: string;
  /** meter id → typed value */
  values: Record<number, string>;
  onChange: (meterId: number, value: string) => void;
  /** meter id → API error */
  errors?: Partial<Record<number, string>>;
  onHistory?: (meter: TaskMeter, task: MeterReadingTask) => void;
  onOpenUnit?: (task: MeterReadingTask) => void;
}) {
  const inputs = useRef<Record<number, HTMLInputElement | null>>({});
  const phoneInputs = useRef<Record<number, HTMLInputElement | null>>({});
  const order = tasks.flatMap((t) => t.meters.map((m) => m.meter_id));
  const th = 'border-b border-line-strong px-3 py-2.5 text-left text-xs font-medium uppercase tracking-[.04em] text-muted';
  const td = 'border-b border-line-soft px-3 py-2.5 align-middle text-sm';

  const next = (e: KeyboardEvent<HTMLInputElement>, meterId: number, refs = inputs) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const i = order.indexOf(meterId);
    refs.current[order[i + 1] ?? order[0]!]?.focus();
  };

  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse">
          <caption className="sr-only">Meter readings</caption>
          <thead>
            <tr>
              <th scope="col" className={th}>
                Unit
              </th>
              <th scope="col" className={th}>
                Meter
              </th>
              <th scope="col" className={cn(th, 'text-right')}>
                Previous
              </th>
              <th scope="col" className={cn(th, 'text-right')}>
                New reading
              </th>
              <th scope="col" className={cn(th, 'text-right')}>
                Usage · cost
              </th>
              <th scope="col" className={th}>
                Status
              </th>
              <th scope="col" className={th}>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <Fragment key={task.unit_id}>
                {task.meters.map((m, i) => {
                  const value = values[m.meter_id] ?? '';
                  const use = readingUsage(m.previous_reading, m.rate, value);
                  const low = belowPrevious(m.previous_reading, value);
                  const error = errors?.[m.meter_id];
                  // Saving on the same day as the reading it counts from replaces that reading (a correction).
                  const sameDay = value.trim() !== '' && !!readingDate && m.previous_date === readingDate;
                  return (
                    <tr key={m.meter_id} className={cn(i === task.meters.length - 1 ? '' : '[&>td]:border-b-transparent')}>
                      <td className={td}>
                        {i === 0 && (
                          <span className="flex flex-col">
                            <strong className="font-semibold">{task.unit_number}</strong>
                            <span className="text-xs text-muted">
                              {task.tenant_name} · bills {formatDate(task.bills_on)}
                            </span>
                          </span>
                        )}
                      </td>
                      <td className={td}>
                        {m.label}
                        {m.meter_number && <span className="block text-xs text-muted">{m.meter_number}</span>}
                      </td>
                      <td className={cn(td, 'num whitespace-nowrap text-right')}>
                        {formatQuantity(m.previous_reading)}
                        {m.previous_date && <span className="block text-xs text-muted">{formatDate(m.previous_date)}</span>}
                      </td>
                      <td className={cn(td, 'text-right')}>
                        <label className="sr-only" htmlFor={`reading-${m.meter_id}`}>
                          New {m.label.toLowerCase()} reading for {task.unit_number}
                        </label>
                        <input
                          id={`reading-${m.meter_id}`}
                          ref={(el) => {
                            inputs.current[m.meter_id] = el;
                          }}
                          inputMode="decimal"
                          autoComplete="off"
                          placeholder={m.current_reading ? formatQuantity(m.current_reading) : ''}
                          value={value}
                          onChange={(e) => onChange(m.meter_id, e.target.value)}
                          onKeyDown={(e) => next(e, m.meter_id)}
                          aria-invalid={error || low ? true : undefined}
                          aria-describedby={error || low ? `reading-${m.meter_id}-msg` : undefined}
                          className={cn(
                            'num min-h-touch w-[120px] rounded-md border bg-surface px-3 text-right text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand',
                            error || low ? 'border-danger-strong' : 'border-line-strong',
                          )}
                        />
                        {(error || low) && (
                          <span id={`reading-${m.meter_id}-msg`} className="mt-1 block max-w-[220px] text-left text-xs text-danger-strong">
                            {error ?? `Below the previous reading (${formatQuantity(m.previous_reading)}).`}
                          </span>
                        )}
                        {sameDay && !error && !low && (
                          <span className="mt-1 block max-w-[220px] text-left text-xs text-warn-strong">
                            Same day as the previous reading: saving replaces it. Change the date if the meter was read later.
                          </span>
                        )}
                      </td>
                      <td className={cn(td, 'num whitespace-nowrap text-right')}>
                        {use ? (
                          <>
                            {formatQuantity(String(use.used))} {m.unit_of_measure}
                            <span className="block text-xs text-muted">KES {formatAmount(use.amount, { decimals: 2 })}</span>
                          </>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className={td}>
                        {m.current_reading !== null ? (
                          <Badge tone="success">
                            {formatQuantity(m.current_reading)}
                            {m.current_date ? ` · ${formatDate(m.current_date)}` : ''}
                          </Badge>
                        ) : (
                          <Badge tone="warn">To do</Badge>
                        )}
                      </td>
                      <td className={cn(td, 'text-right')}>
                        <RowActions
                          actions={[
                            {
                              label: `${m.label} reading history for ${task.unit_number}`,
                              icon: ClockIcon,
                              onClick: () => onHistory?.(m, task),
                              hidden: !onHistory,
                            },
                            {
                              label: `Open ${task.unit_number} on its own`,
                              icon: EyeIcon,
                              onClick: () => onOpenUnit?.(task),
                              hidden: !onOpenUnit || i > 0,
                            },
                          ]}
                        />
                      </td>
                    </tr>
                  );
                })}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Phones: a card per unit, one block per meter. */}
      <ul aria-label="Meter readings" className="m-0 flex list-none flex-col gap-3 p-3 md:hidden">
        {tasks.map((task) => (
          <li key={task.unit_id} className="rounded-lg border border-line bg-surface p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 flex-col">
                <strong className="text-[15px] font-semibold">{task.unit_number}</strong>
                <span className="text-xs text-muted">
                  {task.tenant_name} · bills {formatDate(task.bills_on)}
                </span>
              </div>
              <div className="-mr-2 -mt-2">
                <RowActions
                  actions={[
                    { label: `Open ${task.unit_number} on its own`, icon: EyeIcon, onClick: () => onOpenUnit?.(task), hidden: !onOpenUnit },
                  ]}
                />
              </div>
            </div>
            <div className="mt-3 flex flex-col gap-3">
              {task.meters.map((m) => {
                const value = values[m.meter_id] ?? '';
                const use = readingUsage(m.previous_reading, m.rate, value);
                const low = belowPrevious(m.previous_reading, value);
                const error = errors?.[m.meter_id];
                const sameDay = value.trim() !== '' && !!readingDate && m.previous_date === readingDate;
                return (
                  <div key={m.meter_id} className="flex flex-col gap-2 rounded-md bg-canvas p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold">
                        {m.label}
                        {m.meter_number && <span className="ml-1.5 text-xs font-normal text-muted">{m.meter_number}</span>}
                      </span>
                      <span className="flex items-center gap-1">
                        {m.current_reading !== null ? (
                          <Badge tone="success">{formatQuantity(m.current_reading)}</Badge>
                        ) : (
                          <Badge tone="warn">To do</Badge>
                        )}
                        <RowActions
                          actions={[
                            {
                              label: `${m.label} reading history for ${task.unit_number}`,
                              icon: ClockIcon,
                              onClick: () => onHistory?.(m, task),
                              hidden: !onHistory,
                            },
                          ]}
                        />
                      </span>
                    </div>
                    <span className="text-xs text-muted">
                      Previous {formatQuantity(m.previous_reading)}
                      {m.previous_date && ` · ${formatDate(m.previous_date)}`}
                    </span>
                    <label className="sr-only" htmlFor={`reading-m-${m.meter_id}`}>
                      New {m.label.toLowerCase()} reading for {task.unit_number}
                    </label>
                    <input
                      id={`reading-m-${m.meter_id}`}
                      ref={(el) => {
                        phoneInputs.current[m.meter_id] = el;
                      }}
                      inputMode="decimal"
                      enterKeyHint="next"
                      autoComplete="off"
                      placeholder="New reading"
                      value={value}
                      onChange={(e) => onChange(m.meter_id, e.target.value)}
                      onKeyDown={(e) => next(e, m.meter_id, phoneInputs)}
                      aria-invalid={error || low ? true : undefined}
                      className={cn(
                        'num min-h-[48px] w-full rounded-md border bg-surface px-3 text-right text-lg focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand',
                        error || low ? 'border-danger-strong' : 'border-line-strong',
                      )}
                    />
                    {use && (
                      <span className="num text-sm">
                        {formatQuantity(String(use.used))} {m.unit_of_measure} · KES {formatAmount(use.amount, { decimals: 2 })}
                      </span>
                    )}
                    {(error || low) && (
                      <span className="text-xs text-danger-strong">
                        {error ?? `Below the previous reading (${formatQuantity(m.previous_reading)}).`}
                      </span>
                    )}
                    {sameDay && !error && !low && (
                      <span className="text-xs text-warn-strong">
                        Same day as the previous reading: saving replaces it. Change the date if the meter was read later.
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
