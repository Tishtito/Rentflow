import { Link } from 'react-router-dom';
import { cn, type SetupProgress } from '@rentflow/core';
import { ProgressBar } from '../primitives/StatCard';
import { CheckIcon, ChevronRightIcon } from '../icons';

/** Getting started for a new landlord: each step ticks off as it's done and links to where to do it. */
export function SetupChecklist({ progress }: { progress: SetupProgress }) {
  const done = progress.steps.filter((s) => s.done).length;
  const next = progress.steps.find((s) => !s.done);
  const pct = Math.round((done / progress.steps.length) * 100);

  return (
    <section aria-labelledby="setup-title" className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-5 md:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 id="setup-title" className="m-0 font-display text-xl font-bold">
            Get set up to send bills
          </h2>
          <span className="text-sm text-muted">
            {done} of {progress.steps.length} done{next ? ` · next: ${next.title.toLowerCase()}` : ''}
          </span>
        </div>
        <div className="w-full max-w-[240px]">
          <ProgressBar value={pct} label="Setup progress" />
        </div>
      </div>
      <ol className="m-0 flex list-none flex-col gap-2 p-0">
        {progress.steps.map((step, i) => (
          <li key={step.key}>
            <Link
              to={step.link}
              className={cn(
                'flex min-h-touch items-center gap-3 rounded-md px-3 py-2.5 text-ink no-underline hover:bg-canvas',
                step === next && 'bg-brand-soft/50 ring-1 ring-brand',
              )}
            >
              <span
                aria-hidden
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold',
                  step.done ? 'bg-brand text-white' : 'border border-line-strong text-muted',
                )}
              >
                {step.done ? <CheckIcon /> : i + 1}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className={cn('font-semibold', step.done && 'text-muted line-through decoration-1')}>{step.title}</span>
                <span className="text-[13px] text-muted">{step.detail}</span>
              </span>
              <span className="sr-only">{step.done ? 'Done' : 'To do'}</span>
              <ChevronRightIcon className="shrink-0 text-muted" />
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
