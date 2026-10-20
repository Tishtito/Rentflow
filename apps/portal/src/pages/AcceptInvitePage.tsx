import { useState, type FormEvent } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ApiError, useAcceptInvitation, useInvitation } from '@rentflow/api';
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
  if (invitation.isPending)
    return (
      <div className="glass-bg px-5 pt-24">
        <GlassLoading rows={1} />
      </div>
    );

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
    <GlassAuthLayout photos={authPhotos} tagline={info ? `Karibu, ${info.first_name}!` : 'Karibu!'}>
      {!info ? (
        <div>
          <GlassAuthHeading title="This link has expired" subtitle="Or it was already used" />
          <p className="m-0 mb-5 text-[15px] leading-relaxed">
            {invitation.isError ? "We couldn't check your link. Check your connection and try again." : 'Ask your landlord or caretaker to send you a new invitation. If you already set a password, just log in.'}
          </p>
          <Link to="/login" className={glassLink}>
            Go to log in →
          </Link>
        </div>
      ) : (
        <form noValidate onSubmit={submit}>
          <GlassAuthHeading
            title="Set your password"
            subtitle={
              <>
                {info.landlord ?? 'Your landlord'} invited you to see your bills and payments
                {info.home ? (
                  <>
                    {' '}
                    for <strong className="font-semibold text-glass-text">{info.home}</strong>
                  </>
                ) : null}
                .
              </>
            }
          />
          {info.log_in_with.length > 0 && (
            <p className="m-0 mb-4 rounded-[14px] bg-glass-fill px-3.5 py-2.5 text-sm text-glass-muted">
              You&apos;ll log in with <strong className="font-medium text-glass-text">{info.log_in_with.join(' or ')}</strong>
            </p>
          )}
          {apiError && <GlassFormAlert>{apiError.field('token') ?? apiError.field('password') ?? apiError.message}</GlassFormAlert>}
          {accept.error && !apiError && <GlassFormAlert>Can&apos;t reach the server. Try again.</GlassFormAlert>}
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
          <GlassButton type="submit" loading={accept.isPending} className="mt-1 w-full">
            Activate my account
          </GlassButton>
          <p className="m-0 mt-4 text-center text-xs text-glass-muted">This link works once. Not you? Contact your landlord or caretaker.</p>
        </form>
      )}
    </GlassAuthLayout>
  );
}
