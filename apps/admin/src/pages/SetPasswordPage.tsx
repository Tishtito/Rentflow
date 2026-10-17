import { useState, type FormEvent } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { ApiError, useSetPassword } from '@rentflow/api';
import { AuthButton, AuthHeading, AuthScene, AuthStagger, AuthWelcome, FloatingField, PasswordStrength, authLink } from '@rentflow/ui';
import { homeFor } from '../session';

/**
 * /set-password?token=…&email=… from a team invitation or a "forgot password" email. Sets the password
 * (POST /api/admin/auth/set-password) and logs in.
 */
export function SetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const email = params.get('email') ?? '';
  const save = useSetPassword();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (save.isSuccess) return <Navigate to={homeFor(save.data)} replace />;

  const apiError = save.error instanceof ApiError ? save.error : null;
  const expired = apiError?.field('token');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (password.length < 8) next.password = 'At least 8 characters';
    if (confirm !== password) next.confirm = "Passwords don't match";
    setErrors(next);
    if (!Object.keys(next).length) save.mutate({ email, token, password, password_confirmation: confirm });
  };

  return (
    <AuthScene<'only'>
      mode="only"
      flipped={() => true}
      welcome={{ only: <AuthWelcome title="Karibu!" text="Choose a password for your Rentflow login. You'll use it with your email address." /> }}
      form={{
        only:
          !token || !email || expired ? (
            <div>
              <AuthHeading title="This link has expired" subtitle="Or it was already used" />
              <AuthStagger index={1}>
                <p className="m-0 mb-6 text-sm leading-relaxed text-white/80">
                  {expired ?? 'The link is incomplete.'} Ask whoever added you to send the invitation again, or request a new reset link.
                </p>
              </AuthStagger>
              <AuthStagger index={2}>
                <Link to="/forgot-password" className={authLink}>
                  Send me a new link →
                </Link>
              </AuthStagger>
            </div>
          ) : (
            <form noValidate onSubmit={submit}>
              <AuthHeading title="Set your password" subtitle={email} />
              {apiError && (
                <p role="alert" className="m-0 mb-4 rounded-[6px] bg-auth-error/15 px-3 py-2 text-xs text-auth-error">
                  {apiError.field('password') ?? apiError.message}
                </p>
              )}
              {save.error && !apiError && (
                <p role="alert" className="m-0 mb-4 rounded-[6px] bg-auth-error/15 px-3 py-2 text-xs text-auth-error">
                  Can&apos;t reach the server. Try again.
                </p>
              )}
              <AuthStagger index={1}>
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
              <AuthStagger index={2}>
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
              <AuthStagger index={3}>
                <AuthButton loading={save.isPending}>Save and log in</AuthButton>
              </AuthStagger>
            </form>
          ),
      }}
    />
  );
}
