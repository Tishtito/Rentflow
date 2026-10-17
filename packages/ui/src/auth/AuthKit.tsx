import { forwardRef, useId, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn, passwordScore, passwordScoreLabel } from '@rentflow/core';
import { EyeIcon, EyeOffIcon } from '../icons';
import { AuthStagger } from './AuthScene';

/** Links on the dark auth card (mint). Use with router <Link className={authLink}>. */
export const authLink = 'font-medium text-auth-mint no-underline hover:text-auth-mint hover:underline';

/** Welcome panel content: big heading, text, "switch" pill and feature ticks. */
export function AuthWelcome({
  title,
  text,
  switchText,
  switchLabel,
  onSwitch,
  features = [],
}: {
  title: ReactNode;
  text: ReactNode;
  switchText?: string;
  switchLabel?: string;
  onSwitch?: () => void;
  features?: string[];
}) {
  return (
    <>
      <AuthStagger index={0}>
        <h1 className="m-0 mb-[18px] text-[30px] font-bold leading-[1.1] md:text-[36px] lg:text-[46px]">{title}</h1>
      </AuthStagger>
      <AuthStagger index={1}>
        <p className="m-0 mb-[18px] max-w-[380px] text-[14.5px] font-light leading-[1.7] text-white/80 md:mb-[30px]">{text}</p>
      </AuthStagger>
      {switchLabel && onSwitch && (
        <AuthStagger index={2} className="flex flex-col items-start gap-3">
          {switchText && <span className="text-[13px] text-auth-muted">{switchText}</span>}
          <button
            type="button"
            onClick={onSwitch}
            className="min-h-touch rounded-full border-[1.5px] border-white/70 bg-transparent px-[34px] text-sm font-medium text-white transition hover:bg-white hover:text-auth-forest"
          >
            {switchLabel}
          </button>
        </AuthStagger>
      )}
      {features.length > 0 && (
        <AuthStagger index={3} className="mt-[34px] hidden gap-[18px] text-xs text-auth-muted md:flex">
          {features.map((f) => (
            <span key={f}>
              <span className="text-auth-mint" aria-hidden="true">
                ✓{' '}
              </span>
              {f}
            </span>
          ))}
        </AuthStagger>
      )}
    </>
  );
}

/** Form panel heading + subtitle. */
export function AuthHeading({ title, subtitle }: { title: string; subtitle?: ReactNode }) {
  return (
    <AuthStagger index={0} className="mb-[22px]">
      <h2 className="m-0 mb-1 text-[28px] font-semibold">{title}</h2>
      {subtitle && <p className="m-0 text-[13px] text-auth-muted">{subtitle}</p>}
    </AuthStagger>
  );
}

type FieldProps = {
  label: string;
  error?: string;
  /** Adds the show/hide button (password fields). */
  revealable?: boolean;
  /** Rendered under the input (e.g. <PasswordStrength>). */
  below?: ReactNode;
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'placeholder'>;

/**
 * Underline input with a floating label (the design's `.field`). The label floats up while focused or
 * filled. Errors show underneath and turn the line red. Works with ApiError.field('…').
 */
export const FloatingField = forwardRef<HTMLInputElement, FieldProps>(function FloatingField(
  { label, error, revealable, below, type = 'text', id, className, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const errorId = `${inputId}-error`;
  const [revealed, setRevealed] = useState(false);

  return (
    <div className={cn('relative mb-[18px]', className)}>
      <input
        ref={ref}
        id={inputId}
        type={revealable && revealed ? 'text' : type}
        placeholder=" "
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={cn(
          'peer box-border w-full rounded-none border-0 border-b border-solid bg-transparent pb-[7px] pt-[18px] font-auth text-sm text-white outline-none transition-colors',
          revealable ? 'pr-11' : 'pr-0',
          error ? 'border-auth-error' : 'border-white/25 focus:border-auth-emerald',
          // Keep browser autofill from painting a light box on the dark card.
          '[&:-webkit-autofill]:[-webkit-text-fill-color:white] [&:-webkit-autofill]:[transition:background-color_9999s_ease-out]',
        )}
        {...rest}
      />
      <label
        htmlFor={inputId}
        className={cn(
          'pointer-events-none absolute left-0 top-4 text-[13px] text-auth-muted transition-all',
          'peer-focus:top-0 peer-focus:text-[11px] peer-focus:text-auth-mint',
          'peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:text-[11px] peer-[:not(:placeholder-shown)]:text-auth-mint',
        )}
      >
        {label}
      </label>
      {revealable && (
        <button
          type="button"
          onClick={() => setRevealed((r) => !r)}
          aria-label={revealed ? 'Hide password' : 'Show password'}
          aria-pressed={revealed}
          className={cn('absolute right-0 top-1 grid h-touch w-11 place-items-center', revealed ? 'text-auth-mint' : 'text-auth-muted hover:text-white')}
        >
          {revealed ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      )}
      {below}
      {error && (
        <span id={errorId} className="mt-1 block text-[11px] text-auth-error">
          {error}
        </span>
      )}
    </div>
  );
});

const strengthTone = ['bg-auth-error', 'bg-auth-error', 'bg-auth-amber', 'bg-auth-mint', 'bg-auth-emerald'] as const;
const strengthWidth = ['w-0', 'w-1/4', 'w-2/4', 'w-3/4', 'w-full'] as const;

/** 4-step strength bar under a new password (hint only; the API enforces 8+ characters). */
export function PasswordStrength({ password }: { password: string }) {
  const score = passwordScore(password);
  return (
    <div className="mt-1.5">
      <div className="h-[3px] overflow-hidden rounded-[3px] bg-white/10" aria-hidden="true">
        <i className={cn('block h-full transition-all duration-300', strengthWidth[score], strengthTone[score])} />
      </div>
      {password && <span className="sr-only">Password strength: {passwordScoreLabel[score]}</span>}
    </div>
  );
}

/** Green full-width submit with a spinner while `loading`. */
export function AuthButton({ loading, children, className, disabled, ...rest }: { loading?: boolean } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="submit"
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'flex min-h-[46px] w-full cursor-pointer items-center justify-center gap-2 rounded-[6px] border-0 bg-auth-emerald font-auth text-sm font-semibold text-white transition',
        'hover:-translate-y-0.5 hover:bg-auth-emerald-hover hover:shadow-auth-button motion-reduce:hover:translate-y-0',
        'disabled:cursor-default disabled:opacity-80 disabled:hover:translate-y-0 disabled:hover:shadow-none',
        className,
      )}
      {...rest}
    >
      {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-white/40 border-t-white" aria-hidden="true" />}
      <span>{children}</span>
    </button>
  );
}

export function AuthCheckbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex min-h-touch cursor-pointer items-center gap-2">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-auth-emerald" />
      {label}
    </label>
  );
}

/** Row under the password: "Remember me" on the left, "Forgot password?" on the right. */
export function AuthMeta({ children }: { children: ReactNode }) {
  return <div className="-mt-1 mb-5 flex items-center justify-between gap-3 text-xs text-auth-muted">{children}</div>;
}

/** Small centred line under the button ("Don't have an account? Sign up"). */
export function AuthFoot({ children }: { children: ReactNode }) {
  return <p className="m-0 mt-4 text-center text-xs text-auth-muted">{children}</p>;
}

/** Form side layout: the form, and (optionally) the "OR" column with social sign-in buttons. */
export function AuthFormLayout({ children, social }: { children: ReactNode; social?: ReactNode }) {
  return (
    <div className="flex w-full flex-col md:flex-row">
      <div className="min-w-0 flex-1 md:pr-9">{children}</div>
      {social && (
        <div
          role="group"
          aria-label="Or continue with"
          className={cn(
            'mt-[22px] flex items-center justify-center gap-3.5 md:mt-0 md:w-14 md:flex-col',
            "before:h-px before:flex-1 before:bg-white/20 before:content-[''] after:h-px after:flex-1 after:bg-white/20 after:content-['']",
            'md:before:h-auto md:before:max-h-[150px] md:before:w-px md:after:h-auto md:after:max-h-[150px] md:after:w-px',
          )}
        >
          <span className="text-xs text-auth-muted">OR</span>
          {social}
        </div>
      )}
    </div>
  );
}
