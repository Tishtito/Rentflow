import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { formatAmount } from '@rentflow/core';
import { ProgressBar } from '../primitives/StatCard';

/** Amber strip of things to fix before the next billing run. */
export function AttentionPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="flex flex-col gap-3.5 rounded-lg bg-warn-soft px-6 py-5">
      <h2 className="m-0 text-base font-semibold text-warn-ink">{title}</h2>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-3">{children}</div>
    </section>
  );
}

export function AttentionItem({ to, title, detail, action }: { to: string; title: string; detail: string; action: string }) {
  return (
    <Link
      to={to}
      className="flex min-h-touch items-center justify-between gap-3 rounded-md bg-surface px-4 py-3.5 text-ink no-underline hover:text-ink"
    >
      <span className="flex flex-col gap-0.5">
        <strong className="font-semibold">{title}</strong>
        <span className="text-[13px] text-muted">{detail}</span>
      </span>
      <span className="whitespace-nowrap text-sm font-semibold text-warn-strong">{action} →</span>
    </Link>
  );
}

/** Horizontal bars: % of each property's billed amount collected this cycle. */
export function CollectionBars({ rows }: { rows: Array<{ name: string; collected: number; billed: number }> }) {
  return (
    <div className="grid grid-cols-[minmax(120px,200px)_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-3.5 text-sm">
      {rows.map((r) => {
        const pct = r.billed > 0 ? Math.round((r.collected / r.billed) * 100) : 0;
        return (
          <div key={r.name} className="contents">
            <span>{r.name}</span>
            <ProgressBar value={pct} label={`${r.name} collected`} height={10} />
            <span className="num text-right text-muted">
              {pct}% of {formatAmount(r.billed)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** Compact list row: name + meta on the left, amount on the right (recent payments). */
export function AmountRow({ title, meta, amount, last }: { title: ReactNode; meta: ReactNode; amount: string; last?: boolean }) {
  return (
    <li className={`flex items-center justify-between py-3 ${last ? '' : 'border-b border-line-soft'}`}>
      <span className="flex flex-col gap-0.5 text-sm">
        <strong className="font-semibold">{title}</strong>
        <span className="text-xs text-muted">{meta}</span>
      </span>
      <span className="num font-semibold text-brand">+{formatAmount(amount)}</span>
    </li>
  );
}
