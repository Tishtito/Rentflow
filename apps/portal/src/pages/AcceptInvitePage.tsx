import { useState, type FormEvent } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ApiError, useAcceptInvitation, useInvitation } from '@rentflow/api';
import { AuthButton, AuthHeading, AuthScene, AuthStagger, AuthWelcome, FloatingField, LoadingState, PasswordStrength, authLink } from '@rentflow/ui';

/**
 * Opened from the invitation email: /invite/:token. Shows who it's for and how they'll log in, sets the
 * password (POST /api/portal/invitations/{token}) and logs the tenant in. Expired / used links explain
 * what to do.
 */
export function AcceptInvitePage() {
  const token = useParams().token ?? '';
  const invitation = useInvitation(token);
  const accept = useAcceptInvitation(token);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (accept.isSuccess) return <Navigate to="/" replace />;
  if (invitation.isPending) return <LoadingState className="min-h-screen bg-auth-night text-auth-muted" />;

  const info = invitation.data;
  const apiError = accept.error instanceof ApiError ? accept.error : null;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (password.length < 8) next.password = 'At least 8 characters';
    if (confirm !== password) next.confirm = "Passwords don't match";
    setErrors(next);
    if (!Object.keys(next).length) accept.mutate({ password, password_confirmation: confirm });
  };

  return (
    <AuthScene<'only'>
      mode="only"
      flipped={() => true}
      welcome={{
        only: info ? (
          <AuthWelcome
            title={`Karibu, ${info.first_name}!`}
            text={
              <>
                {info.landlord ?? 'Your landlord'} has invited you to see your bills and payments
                {info.home ? (
                  <>
                    {' '}
                    for <strong className="font-semibold text-white">{info.home}</strong>
                  </>
                ) : null}
                .
              </>
            }
          />
        ) : (
          <AuthWelcome title="Karibu!" text="Rentflow shows your bills, balance and payments." />
        ),
      }}
      form={{
        only: !info ? (
          <div>
            <AuthHeading title="This link has expired" subtitle="Or it was already used" />
            <AuthStagger index={1}>
              <p className="m-0 mb-6 text-sm leading-relaxed text-white/80">
                {invitation.isError ? "We couldn't check your link. Check your connection and try again." : 'Ask your landlord or caretaker to send you a new invitation. If you already set a password, just log in.'}
              </p>
            </AuthStagger>
            <AuthStagger index={2}>
              <Link to="/login" className={authLink}>
                Go to log in →
              </Link>
            </AuthStagger>
          </div>
        ) : (
          <form noValidate onSubmit={submit}>
            <AuthHeading title="Set your password" subtitle="Then you're in" />
            {info.log_in_with.length > 0 && (
              <AuthStagger index={1}>
                <p className="m-0 mb-5 rounded-[6px] bg-white/[.06] px-3 py-2.5 text-xs text-auth-muted">
                  You&apos;ll log in with <strong className="font-medium text-white">{info.log_in_with.join(' or ')}</strong>
                </p>
              </AuthStagger>
            )}
            {apiError && (
              <p role="alert" className="m-0 mb-4 rounded-[6px] bg-auth-error/15 px-3 py-2 text-xs text-auth-error">
                {apiError.field('token') ?? apiError.field('password') ?? apiError.message}
              </p>
            )}
            {accept.error && !apiError && (
              <p role="alert" className="m-0 mb-4 rounded-[6px] bg-auth-error/15 px-3 py-2 text-xs text-auth-error">
                Can&apos;t reach the server. Try again.
              </p>
            )}
            <AuthStagger index={2}>
              <FloatingField
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
            </AuthStagger>
            <AuthStagger index={3}>
              <FloatingField
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
            </AuthStagger>
            <AuthStagger index={4}>
              <AuthButton loading={accept.isPending}>Activate my account</AuthButton>
            </AuthStagger>
            <AuthStagger index={5}>
              <p className="m-0 mt-4 text-center text-xs text-auth-muted">This link works once. Not you? Contact your landlord or caretaker.</p>
            </AuthStagger>
          </form>
        ),
      }}
    />
  );
}
