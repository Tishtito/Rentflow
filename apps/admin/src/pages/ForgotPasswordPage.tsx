import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ApiError, useForgotPassword } from '@rentflow/api';
import { AuthButton, AuthHeading, AuthScene, AuthStagger, AuthWelcome, FloatingField, authLink } from '@rentflow/ui';

/** Emails a "choose a new password" link (POST /api/admin/auth/forgot-password); same answer for any email. */
export function ForgotPasswordPage() {
  const send = useForgotPassword();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Enter your email address');
    send.mutate(email.trim());
  };

  const apiError = send.error instanceof ApiError ? send.error : null;

  return (
    <AuthScene<'only'>
      mode="only"
      flipped={() => true}
      welcome={{ only: <AuthWelcome title={<>Forgot your<br />password?</>} text="It happens. We'll email you a link to choose a new one." /> }}
      form={{
        only: send.isSuccess ? (
          <div>
            <AuthHeading title="Check your email" subtitle={email.trim()} />
            <AuthStagger index={1}>
              <p className="m-0 mb-6 text-sm leading-relaxed text-white/80">If this email has a Rentflow login, a link is on its way. It works for 60 minutes.</p>
            </AuthStagger>
            <AuthStagger index={2}>
              <Link to="/login" className={authLink}>
                ← Back to log in
              </Link>
            </AuthStagger>
          </div>
        ) : (
          <form noValidate onSubmit={submit}>
            <AuthHeading title="Reset password" subtitle="Enter the email you log in with" />
            {(apiError || (send.error && !apiError)) && (
              <p role="alert" className="m-0 mb-4 rounded-[6px] bg-auth-error/15 px-3 py-2 text-xs text-auth-error">
                {apiError ? (apiError.status === 429 ? 'Too many tries. Wait a minute and try again.' : apiError.message) : "Can't reach the server. Try again."}
              </p>
            )}
            <AuthStagger index={1}>
              <FloatingField
                label="Email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                }}
                error={error}
              />
            </AuthStagger>
            <AuthStagger index={2}>
              <AuthButton loading={send.isPending}>Send reset link</AuthButton>
            </AuthStagger>
            <AuthStagger index={3}>
              <p className="m-0 mt-4 text-center text-xs">
                <Link to="/login" className={authLink}>
                  ← Back to log in
                </Link>
              </p>
            </AuthStagger>
          </form>
        ),
      }}
    />
  );
}
