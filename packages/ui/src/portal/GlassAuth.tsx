import { forwardRef, useId, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@rentflow/core';

/** Background photos for the tenant auth screens: portrait on phones, landscape from `md` up. */
export interface AuthPhotos {
  portrait: { webp: string; jpg: string };
  landscape: { webp: string; jpg: string };
}

/**
 * Tenant portal auth screens (log in, invitation, forgot password): a photo behind a dark green
 * overlay (keeps text above 4.5:1), the forest gradient underneath while it loads or offline, and a
 * centred glass card with the serif brand.
 */
export function GlassAuthLayout({ photos, tagline, children }: { photos: AuthPhotos; tagline?: string; children: ReactNode }) {
  return (
    <div className="portal-auth relative isolate min-h-screen overflow-hidden bg-gradient-to-b from-glass-night to-glass-forest text-glass-text">
      <picture>
        <source media="(min-width: 768px)" srcSet={photos.landscape.webp} type="image/webp" />
        <source media="(min-width: 768px)" srcSet={photos.landscape.jpg} />
        <source srcSet={photos.portrait.webp} type="image/webp" />
        <img src={photos.portrait.jpg} alt="" className="absolute inset-0 -z-20 h-full w-full object-cover" decoding="async" />
      </picture>
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-b from-glass-night/45 via-glass-night/60 to-glass-night/90 md:bg-glass-night/60" />

      <main className="flex min-h-screen flex-col items-center justify-end gap-6 px-5 pb-[calc(28px+env(safe-area-inset-bottom))] pt-[calc(48px+env(safe-area-inset-top))] md:justify-center">
        <div className="flex flex-col items-center gap-1 text-center">
          <span className="font-serif text-[34px] font-semibold leading-none">Rentflow</span>
          {tagline && <span className="text-sm text-glass-muted">{tagline}</span>}
        </div>
        <div className="glass-strong w-full max-w-[420px] rounded-glass p-6 md:p-8">{children}</div>
      </main>
    </div>
  );
}

/** Card heading on the auth screens. */
export function GlassAuthHeading({ title, subtitle }: { title: string; subtitle?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-col gap-1">
      <h1 className="m-0 font-serif text-[26px] font-semibold leading-tight">{title}</h1>
      {subtitle && <p className="m-0 text-sm text-glass-muted">{subtitle}</p>}
    </div>
  );
}

type FieldProps = {
  label: string;
  error?: string;
  /** Adds the show/hide button (password fields). */
  revealable?: boolean;
  /** Rendered under the input (e.g. <PasswordStrength>). */
  below?: ReactNode;
} & InputHTMLAttributes<HTMLInputElement>;

/** Labelled glass input (same props as FloatingField): errors under it, red edge, works with ApiError.field(). */
export const GlassField = forwardRef<HTMLInputElement, FieldProps>(function GlassField(
  { label, error, revealable, below, type = 'text', id, className, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const errorId = `${inputId}-error`;
  const [revealed, setRevealed] = useState(false);

  return (
    <div className={cn('mb-4 flex flex-col gap-1.5', className)}>
      <label htmlFor={inputId} className="text-[13px] font-medium text-glass-muted">
        {label}
      </label>
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          type={revealable && revealed ? 'text' : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            'box-border min-h-[48px] w-full rounded-[14px] border border-solid bg-glass-fill px-4 font-inter text-[15px] text-glass-text outline-none transition-colors duration-200',
            'placeholder:text-glass-muted focus:border-glass-sage focus:bg-glass-raised',
            revealable && 'pr-12',
            error ? 'border-glass-coral' : 'border-glass-edge',
            // Keep browser autofill from painting a light box on the glass.
            '[&:-webkit-autofill]:[-webkit-text-fill-color:theme(colors.glass.text)] [&:-webkit-autofill]:[transition:background-color_9999s_ease-out]',
          )}
          {...rest}
        />
        {revealable && (
          <button
            type="button"
            onClick={() => setRevealed((r) => !r)}
            aria-label={revealed ? 'Hide password' : 'Show password'}
            aria-pressed={revealed}
            className={cn(
              'absolute right-1 top-1/2 grid h-touch w-11 -translate-y-1/2 place-items-center rounded-full border-0 bg-transparent',
              revealed ? 'text-glass-sage' : 'text-glass-muted hover:text-glass-text',
            )}
          >
            {revealed ? <EyeOff size={18} strokeWidth={1.75} /> : <Eye size={18} strokeWidth={1.75} />}
          </button>
        )}
      </div>
      {below}
      {error && (
        <span id={errorId} className="text-xs text-glass-coral">
          {error}
        </span>
      )}
    </div>
  );
});

export function GlassCheckbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex min-h-touch cursor-pointer items-center gap-2 text-sm text-glass-muted">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-glass-sage" />
      {label}
    </label>
  );
}

/** Message above an auth form (wrong password, offline…). */
export function GlassFormAlert({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="m-0 mb-4 rounded-[14px] bg-glass-coral-soft px-3.5 py-2.5 text-sm text-glass-coral">
      {children}
    </p>
  );
}

/** Text link styling on the auth screens. */
export const glassLink = 'font-medium text-glass-sage underline-offset-2 hover:text-glass-sage hover:underline';
