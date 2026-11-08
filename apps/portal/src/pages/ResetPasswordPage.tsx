import { useState, type FormEvent } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ApiError, usePasswordResetLink, useResetTenantPassword } from '@rentflow/api';
import {
  GlassAuthHeading,
  GlassAuthLayout,
  GlassButton,
  GlassField,
  GlassFormAlert,
  GlassLoading,
  PasswordStrength,
  glassLink,
} from '@rentflow/ui';
import { authPhotos } from '../PortalLayout';

/**
 * Opened from the password reset email: /reset-password/:token. Shows which home it's for, sets the new
 * password (POST /api/portal/password-reset/{token}) and logs the tenant in.
 */
export function ResetPasswordPage() {
  const token = useParams().token ?? '';
  const link = usePasswordResetLink(token);
  const reset = useResetTenantPassword(token);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (reset.isSuccess) return <Navigate to="/" replace />;
  if (link.isPending)
    return (
      <div className="glass-bg px-5 pt-24">
        <GlassLoading rows={1} />
      </div>
    );

  const info = link.data;
  const apiError = reset.error instanceof ApiError ? reset.error : null;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (password.length < 8) next.password = 'At least 8 characters';
    if (confirm !== password) next.confirm = "Passwords don't match";
    setErrors(next);
    if (!Object.keys(next).length) reset.mutate({ password, password_confirmation: confirm });
  };

  return (
    <GlassAuthLayout photos={authPhotos} tagline={info ? `Welcome back, ${info.first_name}` : 'Welcome back'}>
      {!info ? (
        <div>
          <GlassAuthHeading title="This link has expired" subtitle="Or it was already used" />
          <p className="m-0 mb-5 text-[15px] leading-relaxed">
            {link.isError ? "We couldn't check your link. Check your connection and try again." : 'Ask for a new link. Only the newest one works.'}
          </p>
          <Link to="/forgot-password" className={glassLink}>
            Send me a new link →
          </Link>
        </div>
      ) : (
        <form noValidate onSubmit={submit}>
          <GlassAuthHeading
            title="Choose a new password"
            subtitle={
              <>
                For your login with {info.landlord ?? 'your landlord'}
                {info.home ? (
                  <>
                    {' '}
                    at <strong className="font-semibold text-glass-text">{info.home}</strong>
                  </>
                ) : null}
                .
              </>
            }
          />
          {info.log_in_with.length > 0 && (
            <p className="m-0 mb-4 rounded-[14px] bg-glass-fill px-3.5 py-2.5 text-sm text-glass-muted">
              You log in with <strong className="font-medium text-glass-text">{info.log_in_with.join(' or ')}</strong>
            </p>
          )}
          {apiError && <GlassFormAlert>{apiError.field('token') ?? apiError.field('password') ?? apiError.message}</GlassFormAlert>}
          {reset.error && !apiError && <GlassFormAlert>Can&apos;t reach the server. Try again.</GlassFormAlert>}
          <GlassField
            label="New password"
            type="password"
            revealable
            autoComplete="new-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setErrors((x) => ({ ...x, password: '' }));
            }}
            error={errors.password}
            below={<PasswordStrength password={password} />}
          />
          <GlassField
            label="Confirm password"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => {
              setConfirm(e.target.value);
              setErrors((x) => ({ ...x, confirm: '' }));
            }}
            error={errors.confirm}
          />
          <GlassButton type="submit" loading={reset.isPending} className="mt-1 w-full">
            Save and log in
          </GlassButton>
          <p className="m-0 mt-4 text-center text-xs text-glass-muted">This link works once. You&apos;ll be logged out of the app on your other phones.</p>
        </form>
      )}
    </GlassAuthLayout>
  );
}
