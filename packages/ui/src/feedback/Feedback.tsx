import type { ReactNode } from 'react';
import { cn, type MessagePlan } from '@rentflow/core';
import { PageHeader } from '../layout/PageHeader';

type NoticeTone = 'info' | 'success' | 'warn' | 'danger';

const noticeTones: Record<NoticeTone, string> = {
  info: 'bg-info-soft text-info-ink',
  success: 'bg-brand-soft text-brand-ink',
  warn: 'bg-warn-soft text-warn-ink',
  danger: 'bg-danger-soft text-danger-ink',
};

/** Inline message box: form errors, "saved", "WhatsApp not connected"… */
export function Notice({
  tone = 'info',
  title,
  children,
  className,
}: {
  tone?: NoticeTone;
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn('flex flex-col gap-1 rounded-md px-4 py-3 text-sm', noticeTones[tone], className)}
    >
      {title && <strong className="font-semibold">{title}</strong>}
      {children}
    </div>
  );
}

const channelNames: Record<MessagePlan['channel'], string> = { email: 'Email', whatsapp: 'WhatsApp', sms: 'SMS' };

/**
 * Alert after a send action (invitation, bill, receipt, resend): one line per channel, from the 202
 * response's `messages`. Messages are queued, so this says where they're going, not that they arrived.
 * Green when every channel is going out, amber when one was skipped (with the reason).
 */
export function MessagesNotice({
  title,
  messages,
  children,
  className,
}: {
  title: ReactNode;
  messages: MessagePlan[];
  children?: ReactNode;
  className?: string;
}) {
  const skipped = messages.some((m) => !m.sending);
  return (
    <Notice tone={skipped ? 'warn' : 'success'} title={title} className={className}>
      {messages.length > 0 && (
        <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
          {messages.map((m) => (
            <li key={m.channel}>
              {m.sending ? (
                <>
                  <span aria-hidden="true">✓ </span>
                  {m.count != null ? `${m.count} by ${channelNames[m.channel]}` : `${channelNames[m.channel]} to ${m.to}`}
                </>
              ) : (
                <>
                  <span aria-hidden="true">✗ </span>
                  {channelNames[m.channel]} not sent: {m.note}
                </>
              )}
            </li>
          ))}
        </ul>
      )}
      {children}
    </Notice>
  );
}

/** Placeholder while a query loads. */
export function LoadingState({ label = 'Loading…', className }: { label?: string; className?: string }) {
  return (
    <div role="status" aria-live="polite" className={cn('flex min-h-[120px] items-center justify-center text-sm text-muted', className)}>
      {label}
    </div>
  );
}

/** A failed query, with an optional retry. */
export function ErrorState({ message, onRetry, className }: { message: string; onRetry?: () => void; className?: string }) {
  return (
    <Notice tone="danger" title="Something went wrong" className={className}>
      <span>{message}</span>
      {onRetry && (
        <button type="button" onClick={onRetry} className="min-h-touch self-start font-semibold text-danger-ink underline">
          Try again
        </button>
      )}
    </Notice>
  );
}

/** Admin screen whose API isn't built yet: keeps the nav honest without showing fake numbers. */
export function ComingSoon({ title, description }: { title: string; description?: ReactNode }) {
  return (
    <>
      <PageHeader title={title} />
      <div className="flex flex-col gap-2 rounded-lg border border-dashed border-line-strong bg-surface px-6 py-10 text-center">
        <span className="font-display text-xl font-bold">Coming soon</span>
        <span className="text-sm text-muted">{description ?? 'This screen is designed and will be connected once its API is ready.'}</span>
      </div>
    </>
  );
}

/**
 * "New version available" toast for the PWA. The app wires it to vite-plugin-pwa's
 * `useRegisterSW` (`needRefresh` → `open`, `updateServiceWorker(true)` → `onReload`).
 */
export function UpdatePrompt({ open, onReload, onDismiss }: { open: boolean; onReload: () => void; onDismiss: () => void }) {
  if (!open) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-3 bottom-[calc(88px+env(safe-area-inset-bottom))] z-50 mx-auto flex max-w-[440px] items-center justify-between gap-3 rounded-lg bg-nav px-4 py-2.5 text-sm text-nav-fg shadow-sheet md:bottom-6"
    >
      <span>A new version of Rentflow is ready.</span>
      <span className="flex shrink-0 gap-1">
        <button type="button" onClick={onDismiss} className="min-h-touch rounded-md px-2.5 text-nav-muted hover:text-white">
          Later
        </button>
        <button type="button" onClick={onReload} className="min-h-touch rounded-md bg-brand-mint px-3 font-semibold text-nav-deep">
          Reload
        </button>
      </span>
    </div>
  );
}

/** Thin bar at the top while the device is offline (data shown may be out of date; saving won't work). */
export function OfflineBanner({ online }: { online: boolean }) {
  if (online) return null;
  return (
    <div
      role="status"
      className="sticky top-0 z-40 bg-warn-soft px-4 pb-1.5 pt-[calc(6px+env(safe-area-inset-top))] text-center text-[13px] font-medium text-warn-ink"
    >
      You're offline. Changes can't be saved until you reconnect.
    </div>
  );
}
