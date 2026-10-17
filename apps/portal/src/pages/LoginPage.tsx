import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import type { PortalLoginResult } from '@rentflow/core';
import { ApiError, useApi, useTenant, useTenantGoogleLogin, useTenantLogin } from '@rentflow/api';
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
  BottomSheet,
  FloatingField,
  HomeChoiceList,
  LoadingState,
  Notice,
  authLink,
} from '@rentflow/ui';
import { googleClientIds } from '../google';

type Mode = 'login' | 'invite';

/** Like the design: after a failed submit, put the cursor in the first field with an error. */
const focusFirstInvalid = (form: HTMLFormElement) =>
  window.requestAnimationFrame(() => form.querySelector<HTMLInputElement>('[aria-invalid="true"]')?.focus());

/**
 * Tenant log in: email OR national ID + password, or Google. Tenants don't sign up (their landlord
 * invites them), so the other side explains the invitation. If the login matches tenants under
 * several landlords, the "Which home?" sheet asks which one.
 */
export function LoginPage() {
  const session = useTenant();
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/';
  const [mode, setMode] = useState<Mode>('login');

  if (session.isPending) return <LoadingState className="min-h-screen bg-auth-night text-auth-muted" />;
  // Also runs right after a successful login (the mutation stores the tenant), so honour `from` here.
  if (session.data) return <Navigate to={from} replace />;

  return (
    <AuthScene<Mode>
      mode={mode}
      flipped={(m) => m === 'login'}
      announce={(m) => (m === 'login' ? 'Log in form shown' : 'Invitation help shown')}
      welcome={{
        login: (
          <AuthWelcome
            title={
              <>
                Welcome
                <br />
                Back
              </>
            }
            text="See your bill, balance and payments for your home."
            switchText="New here?"
            switchLabel="Got an invitation?"
            onSwitch={() => setMode('invite')}
            features={['Your bills', 'Payments', 'Always synced']}
          />
        ),
        invite: (
          <AuthWelcome
            title="Karibu!"
            text="Your landlord adds you to Rentflow and sends you an invitation link by SMS, WhatsApp or email."
            switchText="Already set your password?"
            switchLabel="Log In"
            onSwitch={() => setMode('login')}
          />
        ),
      }}
      form={{
        login: <LoginForm onInvite={() => setMode('invite')} />,
        invite: <InviteHelp onLogIn={() => setMode('login')} />,
      }}
    />
  );
}

type Pending = { kind: 'password' } | { kind: 'google'; credential: string };

function LoginForm({ onInvite }: { onInvite: () => void }) {
  const api = useApi();
  const login = useTenantLogin();
  const google = useTenantGoogleLogin();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [googleError, setGoogleError] = useState<string | null>(null);
  // "Which home?": the homes to choose from and how to log in again once one is picked.
  const [homes, setHomes] = useState<Array<{ tenant_id: number; unit_label: string }> | null>(null);
  const [pending, setPending] = useState<Pending>({ kind: 'password' });
  const [chosen, setChosen] = useState<number | undefined>();

  const active = pending.kind === 'google' ? google : login;
  const apiError = active.error instanceof ApiError ? active.error : null;
  const formMessage =
    googleError ||
    apiError?.field('credential') ||
    (apiError && Object.keys(apiError.errors).length === 0 && apiError.message) ||
    (active.error && !apiError && "Can't reach the server. Try again.");

  const onResult = (result: PortalLoginResult) => {
    if (result.choose_home)
      setHomes(result.homes.map((h) => ({ tenant_id: h.tenant_id, unit_label: h.account_name ?? `Home ${h.tenant_id}` })));
  };

  const run = (how: Pending, tenantId?: number) => {
    setPending(how);
    if (how.kind === 'google') {
      login.reset();
      google.mutate({ credential: how.credential, tenant_id: tenantId, remember }, { onSuccess: onResult });
    } else {
      google.reset();
      login.mutate({ identifier, password, tenant_id: tenantId, remember }, { onSuccess: onResult });
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!identifier.trim()) next.identifier = 'This field is required';
    if (!password) next.password = 'This field is required';
    setErrors(next);
    if (Object.keys(next).length) focusFirstInvalid(e.currentTarget as HTMLFormElement);
    setGoogleError(null);
    if (!Object.keys(next).length) run({ kind: 'password' });
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
              run({ kind: 'google', credential });
            }}
          />
        )
      }
    >
      <form noValidate onSubmit={submit}>
        <AuthHeading title="Log In" subtitle="Good to see you again" />
        {formMessage && (
          <p role="alert" className="m-0 mb-4 rounded-[6px] bg-auth-error/15 px-3 py-2 text-xs text-auth-error">
            {formMessage}
          </p>
        )}
        <AuthStagger index={1}>
          <FloatingField
            label="Email or National ID"
            autoComplete="username"
            value={identifier}
            onChange={(e) => {
              setIdentifier(e.target.value);
              setErrors((x) => ({ ...x, identifier: '' }));
            }}
            error={errors.identifier || (pending.kind === 'password' && !homes ? apiError?.field('identifier') : undefined)}
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
            First time here?{' '}
            <button type="button" onClick={onInvite} className={`${authLink} cursor-pointer border-0 bg-transparent p-0 font-auth text-xs`}>
              Use your invitation
            </button>
          </AuthFoot>
        </AuthStagger>
      </form>

      <BottomSheet
        open={homes !== null}
        onClose={() => setHomes(null)}
        title="Which home?"
        description="You rent from more than one landlord. Choose one to continue."
      >
        {apiError?.field('tenant_id') && <Notice tone="danger">{apiError.field('tenant_id')}</Notice>}
        <HomeChoiceList
          homes={homes ?? []}
          selectedId={chosen}
          onChoose={(tenantId) => {
            setChosen(tenantId);
            run(pending, tenantId);
          }}
        />
      </BottomSheet>
    </AuthFormLayout>
  );
}

function InviteHelp({ onLogIn }: { onLogIn: () => void }) {
  const steps = [
    'Open the invitation link your landlord sent you (SMS, WhatsApp or email).',
    'Set your password. You will log in with your email or national ID.',
    'See your bills and payments here any time.',
  ];
  return (
    <div>
      <AuthHeading title="Got an invitation?" subtitle="Tenants join through their landlord" />
      <AuthStagger index={1}>
        <ol className="m-0 mb-6 flex list-none flex-col gap-3 p-0">
          {steps.map((step, i) => (
            <li key={step} className="flex gap-3 text-sm leading-relaxed text-white/85">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-auth-emerald text-xs font-semibold">{i + 1}</span>
              {step}
            </li>
          ))}
        </ol>
      </AuthStagger>
      <AuthStagger index={2}>
        <p className="m-0 mb-6 text-xs text-auth-muted">Lost the link or it expired? Ask your landlord or caretaker to send it again.</p>
      </AuthStagger>
      <AuthStagger index={3}>
        <AuthButton type="button" onClick={onLogIn}>
          I already have a password
        </AuthButton>
      </AuthStagger>
    </div>
  );
}
