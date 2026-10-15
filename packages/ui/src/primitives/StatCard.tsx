import type { ReactNode } from 'react';
import { cn } from '@rentflow/core';

/** Clamp to 0–100 and round. */
const pct = (v: number) => Math.max(0, Math.min(100, Math.round(v)));

export function ProgressBar({
  value,
  label,
  tone = 'light',
  height = 6,
  className,
}: {
  value: number; // 0–100
  label: string; // accessible name, e.g. "Collected"
  tone?: 'light' | 'dark'; // dark = on the nav-coloured header
  height?: 6 | 8 | 10;
  className?: string;
}) {
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={pct(value)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn('w-full rounded-full', tone === 'light' ? 'bg-brand-soft' : 'bg-nav-line', className)}
      style={{ height }}
    >
      <div
        className={cn('rounded-full', tone === 'light' ? 'bg-brand' : 'bg-brand-mint')}
        style={{ width: `${pct(value)}%`, height }}
      />
    </div>
  );
}

/** KPI tile: label, big figure, and a footnote or progress bar. */
export function StatCard({
  label,
  value,
  footnote,
  progress,
  tone = 'default',
}: {
  label: string;
  value: ReactNode;
  footnote?: ReactNode;
  progress?: number; // shows a bar with the % beside it
  tone?: 'default' | 'warn' | 'warn-filled' | 'danger';
}) {
  const filled = tone === 'warn-filled';
  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded-lg p-5',
        filled ? 'border border-warn-line bg-warn-soft' : 'border border-line bg-surface',
      )}
    >
      <span className={cn('text-[13px]', filled ? 'text-warn-ink' : 'text-muted')}>{label}</span>
      <span
        className={cn(
          'num font-display text-[30px] font-bold leading-tight',
          tone === 'warn' && 'text-warn-strong',
          filled && 'text-warn-ink',
          tone === 'danger' && 'text-danger-strong',
        )}
      >
        {value}
      </span>
      {progress !== undefined ? (
        <div className="flex items-center gap-2.5">
          <ProgressBar value={progress} label={label} className="flex-1" />
          <span className="num text-[13px] font-semibold text-brand">{pct(progress)}%</span>
        </div>
      ) : (
        footnote && <span className={cn('text-[13px]', filled ? 'text-warn-ink' : 'text-muted')}>{footnote}</span>
      )}
    </div>
  );
}

/** Responsive row of StatCards (auto-fit, min 200px). */
export function StatGrid({ children, label }: { children: ReactNode; label: string }) {
  return (
    <section aria-label={label} className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
      {children}
    </section>
  );
}
