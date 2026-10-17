import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ApiError, useAdminGoogleLogin, useAdminLogin, useAdminUser, useApi, useRegisterLandlord } from '@rentflow/api';
import { GoogleSignInButton } from '@rentflow/native';
import {
  AuthButton,
  AuthCheckbox,
  AuthFoot,
  AuthFormLayout,
  AuthHeading,
  AuthMeta,
  AuthScene,
  AuthStagger,
  AuthWelcome,
  FloatingField,
  LoadingState,
  PasswordStrength,
  authLink,
} from '@rentflow/ui';
import { googleClientIds } from '../google';
import { homeFor } from '../session';

type Mode = 'login' | 'signup';

/** Like the design: after a failed submit, put the cursor in the first field with an error. */
const focusFirstInvalid = (form: HTMLFormElement) =>
  window.requestAnimationFrame(() => form.querySelector<HTMLInputElement>('[aria-invalid="true"]')?.focus());

/**
 * /login and /signup (one component, so switching between them plays the slide). Log in with email +
 * password or Google; landlords can sign up for a new account. Caretakers are added by their landlord.
 */
export function AuthPage() {
  const { pathname, state } = useLocation();
  const navigate = useNavigate();
  const session = useAdminUser();
  const mode: Mode = pathname === '/signup' ? 'signup' : 'login';
  const from = (state as { from?: string } | null)?.from;

  if (session.isPending) return <LoadingState className="min-h-screen bg-auth-night text-auth-muted" />;
  // Also runs right after a successful login / sign-up (the mutation stores the user).
  if (session.data) return <Navigate to={mode === 'signup' ? '/admin' : (from ?? homeFor(session.data))} replace />;

  const go = (next: Mode) => navigate(next === 'signup' ? '/signup' : '/login', { replace: true, state });

  return (
    <AuthScene<Mode>
      mode={mode}
      flipped={(m) => m === 'login'}
      announce={(m) => (m === 'login' ? 'Log in form shown' : 'Sign up form shown')}
      welcome={{
        signup: (
          <AuthWelcome
            title={
              <>
                Let&apos;s Get
                <br />
                Started
              </>
            }
            text="Manage your properties, send monthly bills and track rent and arrears, all in one place."
            switchText="Already a member?"
            switchLabel="Log In"
            onSwitch={() => go('login')}
            features={['Monthly bills', 'WhatsApp & email', 'Arrears tracked']}
          />
        ),
        login: (
          <AuthWelcome
            title={
              <>
                Welcome
                <br />
                Back
              </>
            }
            text="Log in to check payments, bills and your properties."
            switchText="New to Rentflow?"
            switchLabel="Sign Up"
            onSwitch={() => go('signup')}
            features={['Secure', 'Fast', 'Always synced']}
          />
        ),
      }}
      form={{
        login: <LoginForm onSignUp={() => go('signup')} />,
        signup: <SignUpForm onLogIn={() => go('login')} />,
      }}
    />
  );
}

function LoginForm({ onSignUp }: { onSignUp: () => void }) {
  const api = useApi();
  const login = useAdminLogin();
  const google = useAdminGoogleLogin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [googleError, setGoogleError] = useState<string | null>(null);

  const apiError = login.error instanceof ApiError ? login.error : null;
  const googleApiError = google.error instanceof ApiError ? google.error : null;
  const formMessage =
    (apiError && !apiError.field('email') && apiError.message) ||
    (login.error && !apiError && "Can't reach the server. Try again.") ||
    googleError ||
    googleApiError?.field('credential') ||
    (googleApiError && googleApiError.message) ||
    (google.error && !googleApiError && "Can't reach the server. Try again.");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!email.trim()) next.email = 'This field is required';
    else if (!/^\S+@\S+\.\S+$/.test(email)) next.email = 'Enter a valid email';
    if (!password) next.password = 'This field is required';
    setErrors(next);
    if (Object.keys(next).length) focusFirstInvalid(e.currentTarget as HTMLFormElement);
    if (Object.keys(next).length) return;
    google.reset();
    login.mutate({ email, password, remember });
  };

  return (
    <AuthFormLayout
      social={
        googleClientIds && (
          <GoogleSignInButton
            clientIds={googleClientIds}
            disabled={google.isPending}
            onError={setGoogleError}
            onCredential={(credential) => {
              setGoogleError(null);
              login.reset();
              google.mutate({ credential, remember });
            }}
          />
        )
      }
    >
      <form noValidate onSubmit={submit}>
        <AuthHeading title="Log In" subtitle="Good to see you again" />
        {formMessage && (
          <AuthStagger index={1}>
            <p role="alert" className="m-0 mb-4 rounded-[6px] bg-auth-error/15 px-3 py-2 text-xs text-auth-error">
              {formMessage}
            </p>
          </AuthStagger>
        )}
        <AuthStagger index={1}>
          <FloatingField
            label="Email Address"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setErrors((x) => ({ ...x, email: '' }));
            }}
            error={errors.email || apiError?.field('email')}
          />
        </AuthStagger>
        <AuthStagger index={2}>
          <FloatingField
            label="Password"
            type="password"
            revealable
            autoComplete="current-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setErrors((x) => ({ ...x, password: '' }));
            }}
            error={errors.password || apiError?.field('password')}
          />
        </AuthStagger>
        <AuthStagger index={3}>
          <AuthMeta>
            {/* Apps stay logged in with their token; "remember me" is a browser-session thing. */}
            {api.auth === 'cookie' ? <AuthCheckbox label="Remember me" checked={remember} onChange={setRemember} /> : <span />}
            <Link to="/forgot-password" className={authLink}>
              Forgot password?
            </Link>
          </AuthMeta>
        </AuthStagger>
        <AuthStagger index={4}>
          <AuthButton loading={login.isPending || google.isPending}>Log In</AuthButton>
        </AuthStagger>
        <AuthStagger index={5}>
          <AuthFoot>
            Don&apos;t have an account?{' '}
            <button type="button" onClick={onSignUp} className={`${authLink} cursor-pointer border-0 bg-transparent p-0 font-auth text-xs`}>
              Sign up
            </button>
          </AuthFoot>
        </AuthStagger>
      </form>
    </AuthFormLayout>
  );
}

const empty = { name: '', phone: '', business_name: '', email: '', password: '', password_confirmation: '' };

function SignUpForm({ onLogIn }: { onLogIn: () => void }) {
  const register = useRegisterLandlord();
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState<Partial<Record<keyof typeof empty, string>>>({});

  const apiError = register.error instanceof ApiError ? register.error : null;
  const fieldError = (k: keyof typeof empty) => errors[k] || apiError?.field(k);
  const known = Object.keys(empty);
  const formMessage =
    (apiError &&
      Object.keys(apiError.errors)
        .filter((k) => !known.includes(k))
        .map((k) => apiError.field(k))
        .join(' ')) ||
    (apiError && Object.keys(apiError.errors).length === 0 && apiError.message) ||
    (register.error && !apiError && "Can't reach the server. Try again.");

  const set = (k: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setErrors((x) => ({ ...x, [k]: '' }));
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    for (const k of ['name', 'phone', 'email', 'password', 'password_confirmation'] as const)
      if (!form[k].trim()) next[k] = 'This field is required';
    if (!next.email && !/^\S+@\S+\.\S+$/.test(form.email)) next.email = 'Enter a valid email';
    if (!next.password && form.password.length < 8) next.password = 'At least 8 characters';
    if (!next.password_confirmation && form.password_confirmation !== form.password) next.password_confirmation = 'Passwords do not match';
    setErrors(next);
    if (Object.keys(next).length) focusFirstInvalid(e.currentTarget as HTMLFormElement);
    if (Object.keys(next).length) return;
    register.mutate({ ...form, business_name: form.business_name.trim() || undefined });
  };

  return (
    <AuthFormLayout>
      <form noValidate onSubmit={submit}>
        <AuthHeading title="Sign Up" subtitle="Create your landlord account" />
        {formMessage && (
          <p role="alert" className="m-0 mb-4 rounded-[6px] bg-auth-error/15 px-3 py-2 text-xs text-auth-error">
            {formMessage}
          </p>
        )}
        <AuthStagger index={1} className="grid grid-cols-1 gap-x-[18px] sm:grid-cols-2">
          <FloatingField label="Full Name" autoComplete="name" value={form.name} onChange={set('name')} error={fieldError('name')} />
          <FloatingField
            label="Phone Number"
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            value={form.phone}
            onChange={set('phone')}
            error={fieldError('phone')}
          />
        </AuthStagger>
        <AuthStagger index={2}>
          <FloatingField
            label="Business Name (optional)"
            autoComplete="organization"
            value={form.business_name}
            onChange={set('business_name')}
            error={fieldError('business_name')}
          />
        </AuthStagger>
        <AuthStagger index={3}>
          <FloatingField
            label="Email Address"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={set('email')}
            error={fieldError('email')}
          />
        </AuthStagger>
        <AuthStagger index={4} className="grid grid-cols-1 gap-x-[18px] sm:grid-cols-2">
          <FloatingField
            label="Create Password"
            type="password"
            revealable
            autoComplete="new-password"
            value={form.password}
            onChange={set('password')}
            error={fieldError('password')}
            below={<PasswordStrength password={form.password} />}
          />
          <FloatingField
            label="Confirm Password"
            type="password"
            autoComplete="new-password"
            value={form.password_confirmation}
            onChange={set('password_confirmation')}
            error={fieldError('password_confirmation')}
          />
        </AuthStagger>
        <AuthStagger index={5}>
          <AuthButton loading={register.isPending}>Create Account</AuthButton>
        </AuthStagger>
        <AuthStagger index={6}>
          <AuthFoot>
            Already a member?{' '}
            <button type="button" onClick={onLogIn} className={`${authLink} cursor-pointer border-0 bg-transparent p-0 font-auth text-xs`}>
              Log in here
            </button>
          </AuthFoot>
        </AuthStagger>
      </form>
    </AuthFormLayout>
  );
}
