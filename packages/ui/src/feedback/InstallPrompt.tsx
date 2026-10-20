import { useEffect, useId, useRef } from 'react';
import { Share, SquarePlus } from 'lucide-react';
import { cn, type InstallMode } from '@rentflow/core';

const looks = {
  // Admin app: light card, brand button.
  light: {
    backdrop: 'bg-nav-deep/45',
    card: 'bg-surface text-ink shadow-sheet',
    muted: 'text-muted',
    step: 'bg-sunken text-ink',
    primary: 'bg-brand text-white hover:bg-brand-hover',
    secondary: 'text-muted hover:bg-sunken hover:text-ink',
    title: 'font-display text-[22px] font-bold',
  },
  // Tenant portal: glass card, sage pill.
  glass: {
    backdrop: 'bg-glass-night/60',
    card: 'glass-strong bg-glass-solid/80 text-glass-text',
    muted: 'text-glass-muted',
    step: 'bg-glass-fill text-glass-text',
    primary: 'bg-glass-sage text-glass-sage-ink hover:brightness-105',
    secondary: 'text-glass-muted hover:bg-glass-fill hover:text-glass-text',
    title: 'font-serif text-[24px] font-semibold',
  },
} as const;

/**
 * "Install Rentflow" pop-up (see useInstallPrompt in @rentflow/native for when it shows). `install`
 * mode: our Install button opens the browser's install dialog. `ios`: the Share → Add to Home Screen
 * steps, since iPhone/iPad can't install from a button. Bottom sheet on phones, centred from `md`.
 */
export function InstallPrompt({
  mode,
  appName,
  iconSrc,
  look = 'light',
  onInstall,
  onDismiss,
}: {
  mode: InstallMode;
  appName: string; // "Rentflow" / "Rentflow Admin"
  iconSrc: string; // the app icon (public/icon.svg)
  look?: keyof typeof looks;
  onInstall: () => void;
  onDismiss: () => void;
}) {
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  const t = looks[look];

  useEffect(() => {
    if (!mode) return;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onDismiss();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mode, onDismiss]);

  if (!mode) return null;

  const button = 'inline-flex min-h-[48px] items-center justify-center rounded-full border-0 px-5 text-[15px] font-semibold transition duration-200 active:scale-[.98] motion-reduce:active:scale-100';

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center md:items-center">
      <div aria-hidden="true" className={cn('absolute inset-0', t.backdrop)} onClick={onDismiss} />
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-text`}
        className={cn(
          'relative m-3 flex w-full max-w-[420px] flex-col gap-4 rounded-[24px] p-6 pb-[calc(24px+env(safe-area-inset-bottom))] outline-none focus:outline-none md:pb-6',
          t.card,
        )}
      >
        <div className="flex items-center gap-4">
          <img src={iconSrc} alt="" width={56} height={56} className="h-14 w-14 shrink-0 rounded-[14px]" />
          <div className="flex flex-col gap-1">
            <h2 id={`${id}-title`} className={cn('m-0 leading-tight', t.title)}>
              Install {appName}
            </h2>
            <p id={`${id}-text`} className={cn('m-0 text-sm', t.muted)}>
              Opens like an app, works offline and sits one tap away on your home screen.
            </p>
          </div>
        </div>

        {mode === 'ios' && (
          <ol className="m-0 flex list-none flex-col gap-2 p-0 text-[15px]">
            <li className={cn('flex items-center gap-3 rounded-[14px] px-3.5 py-3', t.step)}>
              <Share size={20} strokeWidth={1.75} aria-hidden="true" className="shrink-0" />
              <span>
                Tap <strong className="font-semibold">Share</strong> in the browser bar
              </span>
            </li>
            <li className={cn('flex items-center gap-3 rounded-[14px] px-3.5 py-3', t.step)}>
              <SquarePlus size={20} strokeWidth={1.75} aria-hidden="true" className="shrink-0" />
              <span>
                Choose <strong className="font-semibold">Add to Home Screen</strong>
              </span>
            </li>
          </ol>
        )}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onDismiss} className={cn(button, 'bg-transparent', t.secondary)}>
            {mode === 'ios' ? 'Got it' : 'Not now'}
          </button>
          {mode === 'install' && (
            <button type="button" onClick={onInstall} className={cn(button, t.primary)}>
              Install
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
