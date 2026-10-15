import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react';
import { cn } from '@rentflow/core';
import { channelLabel } from '@rentflow/core';
import type { Channel } from '@rentflow/core';
import { SearchIcon } from '../icons';

const inputBase =
  'w-full min-w-0 rounded-md border border-line-strong bg-surface px-3 text-sm text-ink placeholder:text-muted focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand';

const inputSizes = {
  md: 'min-h-touch', // admin
  lg: 'min-h-[52px] rounded-[12px] px-3.5 text-base', // tenant portal / mobile
  xl: 'min-h-[56px] rounded-[12px] px-4 text-2xl font-semibold', // meter reading entry
};

type FieldProps = {
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  size?: keyof typeof inputSizes;
  emphasis?: boolean; // 2px brand border: the field the user is working on
  numeric?: boolean; // tabular figures
};

export const TextField = forwardRef<HTMLInputElement, FieldProps & Omit<InputHTMLAttributes<HTMLInputElement>, 'size'>>(
  function TextField({ label, hint, error, size = 'md', emphasis, numeric, className, id, ...rest }, ref) {
    const autoId = useId();
    const inputId = id ?? autoId;
    const hintId = hint || error ? `${inputId}-hint` : undefined;
    return (
      <div className={cn('flex flex-col gap-1.5', className)}>
        <label htmlFor={inputId} className="text-[13px] font-medium">
          {label}
        </label>
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={hintId}
          className={cn(
            inputBase,
            inputSizes[size],
            emphasis && 'border-2 border-brand',
            numeric && 'num',
            error && 'border-danger-strong',
          )}
          {...rest}
        />
        {(error || hint) && (
          <span id={hintId} className={cn('text-xs', error ? 'text-danger-strong' : 'text-muted')}>
            {error ?? hint}
          </span>
        )}
      </div>
    );
  },
);

export function SelectField({
  label,
  hideLabel,
  options,
  className,
  id,
  ...rest
}: {
  label: string;
  hideLabel?: boolean;
  options: Array<{ value: string; label: string }>;
} & SelectHTMLAttributes<HTMLSelectElement>) {
  const autoId = useId();
  const selectId = id ?? autoId;
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={selectId} className={cn('text-[13px] font-medium', hideLabel && 'sr-only')}>
        {label}
      </label>
      <select id={selectId} className={cn(inputBase, 'min-h-touch pr-8')} {...rest}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function SearchInput({
  label,
  className,
  ...rest
}: { label: string } & Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  return (
    <label
      className={cn(
        'flex min-h-touch items-center gap-2 rounded-md border border-line-strong bg-surface px-3.5 focus-within:border-brand',
        className,
      )}
    >
      <SearchIcon className="text-muted" />
      <span className="sr-only">{label}</span>
      <input type="search" className="min-w-0 flex-1 border-none bg-transparent text-sm outline-none" {...rest} />
    </label>
  );
}

/** Pill toggle group for list filters ("All 24", "Vacant 3"…). Single-select. */
export function FilterChips<T extends string>({
  label,
  options,
  value,
  onChange,
  size = 'md',
}: {
  label: string;
  options: Array<{ value: T; label: string; count?: number }>;
  value: T;
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o.value)}
            className={cn(
              'rounded-full border px-3.5 text-[13px]',
              size === 'md' ? 'min-h-touch' : 'min-h-[40px]',
              on ? 'border-brand bg-brand-soft font-semibold text-brand-ink' : 'border-line-strong bg-surface text-ink',
            )}
          >
            {o.label}
            {o.count !== undefined && ` ${o.count}`}
          </button>
        );
      })}
    </div>
  );
}

/** Checkbox chips for SMS / WhatsApp / Email (invitations, receipts, defaults). */
export function ChannelPicker({
  legend,
  value,
  onChange,
  channels = ['sms', 'whatsapp', 'email'],
}: {
  legend: string;
  value: Channel[];
  onChange: (value: Channel[]) => void;
  channels?: Channel[];
}) {
  const toggle = (c: Channel) => onChange(value.includes(c) ? value.filter((v) => v !== c) : [...value, c]);
  return (
    <fieldset className="m-0 flex flex-col gap-2 border-none p-0">
      <legend className="pb-1.5 text-[13px] font-medium">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {channels.map((c) => {
          const on = value.includes(c);
          return (
            <label
              key={c}
              className={cn(
                'flex min-h-touch cursor-pointer items-center gap-2 rounded-md border px-3.5 text-sm',
                on ? 'border-brand bg-brand-soft' : 'border-line-strong',
              )}
            >
              <input type="checkbox" checked={on} onChange={() => toggle(c)} className="h-[18px] w-[18px] accent-brand" />
              {channelLabel[c]}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Radio buttons drawn as equal-width segments (payment method, etc.). */
export function SegmentedControl<T extends string>({
  legend,
  name,
  options,
  value,
  onChange,
}: {
  legend: string;
  name: string;
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset className="m-0 flex flex-col gap-2 border-none p-0">
      <legend className="pb-1.5 text-[13px] font-medium">{legend}</legend>
      <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
        {options.map((o) => {
          const on = o.value === value;
          return (
            <label
              key={o.value}
              className={cn(
                'flex min-h-touch cursor-pointer items-center justify-center rounded-md text-sm focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand',
                on ? 'border-2 border-brand bg-brand-soft font-semibold text-brand-ink' : 'border border-line-strong',
              )}
            >
              <input
                type="radio"
                name={name}
                value={o.value}
                checked={on}
                onChange={() => onChange(o.value)}
                className="sr-only"
              />
              {o.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Full-width row with a label and a switch (tenant notification settings). */
export function SwitchRow({
  label,
  checked,
  onChange,
  divider,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  divider?: boolean;
}) {
  return (
    <label className={cn('flex min-h-[48px] items-center justify-between text-[15px]', divider && 'border-t border-line-soft')}>
      {label}
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-[22px] w-[22px] accent-brand"
      />
    </label>
  );
}
