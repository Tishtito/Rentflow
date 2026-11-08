import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ApiError, useTenantForgotPassword } from '@rentflow/api';
import { GlassAuthHeading, GlassAuthLayout, GlassButton, GlassField, GlassFormAlert, glassLink } from '@rentflow/ui';
import { authPhotos } from '../PortalLayout';

/**
 * Emails a "choose a new password" link (POST /api/portal/auth/forgot-password) to the email on file: one
 * per landlord when the person rents from several. The answer is the same whether or not the login exists.
 */
export function ForgotPasswordPage() {
  const send = useTenantForgotPassword();
  const [identifier, setIdentifier] = useState('');
  const [error, setError] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) return setError('Enter your email or national ID');
    send.mutate(identifier.trim());
  };

  const apiError = send.error instanceof ApiError ? send.error : null;

  return (
    <GlassAuthLayout photos={authPhotos} tagline="It happens">
      {send.isSuccess ? (
        <div>
          <GlassAuthHeading title="Check your email" subtitle={identifier.trim()} />
          <p className="m-0 mb-4 text-[15px] leading-relaxed">
            If this login exists, we&apos;ve emailed a link to the email address on file. It works for 60 minutes. If you rent from more
            than one landlord, you&apos;ll get one email for each.
          </p>
          <p className="m-0 mb-5 text-sm leading-relaxed text-glass-muted">
            No email? Your landlord may not have your email address. Ask them or your caretaker to set a new password for you.
          </p>
          <Link to="/login" className={glassLink}>
            ← Back to log in
          </Link>
        </div>
      ) : (
        <form noValidate onSubmit={submit}>
          <GlassAuthHeading title="Forgot your password?" subtitle="We'll email you a link to choose a new one" />
          {send.error && (
            <GlassFormAlert>
              {apiError ? (apiError.status === 429 ? 'Too many tries. Wait a minute and try again.' : apiError.message) : "Can't reach the server. Try again."}
            </GlassFormAlert>
          )}
          <GlassField
            label="Email or National ID"
            autoComplete="username"
            value={identifier}
            onChange={(e) => {
              setIdentifier(e.target.value);
              setError('');
            }}
            error={error || apiError?.field('identifier')}
          />
          <GlassButton type="submit" loading={send.isPending} className="mt-1 w-full">
            Send reset link
          </GlassButton>
          <p className="m-0 mt-5 text-center">
            <Link to="/login" className={glassLink}>
              ← Back to log in
            </Link>
          </p>
        </form>
      )}
    </GlassAuthLayout>
  );
}
