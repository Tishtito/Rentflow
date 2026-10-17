import { Link } from 'react-router-dom';
import { AuthHeading, AuthScene, AuthStagger, AuthWelcome, authLink } from '@rentflow/ui';

/** Password reset isn't built yet (no API); explains what to do meanwhile, in the auth look. */
export function ForgotPasswordPage() {
  return (
    <AuthScene<'only'>
      mode="only"
      flipped={() => true}
      welcome={{
        only: <AuthWelcome title={<>Forgot your<br />password?</>} text="It happens. Resetting it from here is coming soon." />,
      }}
      form={{
        only: (
          <div>
            <AuthHeading title="Reset password" subtitle="Coming soon" />
            <AuthStagger index={1}>
              <p className="m-0 mb-6 text-sm leading-relaxed text-white/80">
                Ask your landlord or caretaker to send you a new invitation link, then set a new password from it.
              </p>
            </AuthStagger>
            <AuthStagger index={2}>
              <Link to="/login" className={authLink}>
                ← Back to log in
              </Link>
            </AuthStagger>
          </div>
        ),
      }}
    />
  );
}
