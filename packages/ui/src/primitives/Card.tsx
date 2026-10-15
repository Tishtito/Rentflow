import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@rentflow/core';

/**
 * White panel with the standard border. `as="section"` + `title` gives an
 * accessible landmark with a heading; `action` sits at the heading's right.
 */
export function Card({
  title,
  description,
  action,
  tone = 'default',
  padded = true,
  className,
  children,
  ...rest
}: {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  tone?: 'default' | 'warn' | 'selected';
  padded?: boolean;
} & Omit<HTMLAttributes<HTMLElement>, 'title'>) {
  const headingId = rest.id ? `${rest.id}-h` : undefined;
  return (
    <section
      aria-labelledby={title ? headingId : undefined}
      className={cn(
        'flex flex-col overflow-hidden rounded-lg bg-surface',
        tone === 'default' && 'border border-line',
        tone === 'warn' && 'border border-warn-line',
        tone === 'selected' && 'border-2 border-brand',
        padded && 'gap-3 px-5 py-[18px]',
        className,
      )}
      {...rest}
    >
      {(title || action) && (
        <div className={cn('flex items-start justify-between gap-3', !padded && 'px-4 pb-2.5 pt-[18px]')}>
          <div className="flex flex-col gap-1">
            {title && (
              <h2 id={headingId} className="m-0 text-base font-semibold">
                {title}
              </h2>
            )}
            {description && <p className="m-0 text-[13px] text-muted">{description}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/** Small uppercase label used above form groups and in table headers. */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn('text-[13px] font-semibold uppercase tracking-[.04em] text-muted', className)}>{children}</span>;
}

/** Visually hidden but read by screen readers (labels for icon-only controls, search inputs). */
export function VisuallyHidden({ children }: { children: ReactNode }) {
  return <span className="sr-only">{children}</span>;
}
