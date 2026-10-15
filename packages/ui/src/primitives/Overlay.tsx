import { useEffect, useId, useRef, type ReactNode } from 'react';
import { cn } from '@rentflow/core';
import { CloseIcon } from '../icons';
import { IconButton } from './Button';

/**
 * Side panel used for "Move in", "Record payment", "Change rate".
 * On the canvas it sits beside the main content (inline) — on wide screens
 * keep it inline; it wraps below the content on narrow ones.
 */
export function SidePanel({
  title,
  subtitle,
  onClose,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  onClose?: () => void;
  children: ReactNode;
  className?: string;
}) {
  const id = useId();
  return (
    <aside
      aria-labelledby={id}
      className={cn(
        'box-border flex min-w-0 flex-[1_1_340px] flex-col gap-[18px] rounded-lg border border-line bg-surface p-[22px]',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 id={id} className="m-0 font-display text-[22px] font-bold">
            {title}
          </h2>
          {subtitle && <span className="text-[13px] text-muted">{subtitle}</span>}
        </div>
        {onClose && (
          <IconButton label="Close" onClick={onClose} className="bg-canvas">
            <CloseIcon />
          </IconButton>
        )}
      </div>
      {children}
    </aside>
  );
}

/** Mobile bottom sheet (tenant "Which home?"). Traps nothing fancy: Esc closes, focus moves in. */
export function BottomSheet({
  open,
  title,
  description,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div aria-hidden="true" className="absolute inset-0 bg-nav-deep/45" onClick={onClose} />
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        className="absolute inset-x-0 bottom-0 mx-auto flex max-w-[480px] flex-col gap-4 rounded-t-2xl bg-surface px-5 pb-7 pt-3 outline-none"
      >
        <div aria-hidden="true" className="h-1 w-10 self-center rounded-sm bg-line-strong" />
        <div className="flex flex-col gap-1">
          <h2 id={id} className="m-0 font-display text-[22px] font-bold">
            {title}
          </h2>
          {description && <p className="m-0 text-sm text-muted">{description}</p>}
        </div>
        {children}
      </div>
    </div>
  );
}
