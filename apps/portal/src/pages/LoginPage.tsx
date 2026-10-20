import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import type { PortalLoginResult } from '@rentflow/core';
import { ApiError, useApi, useTenant, useTenantGoogleLogin, useTenantLogin } from '@rentflow/api';
import { GoogleSignInButton } from '@rentflow/native';
import {
  BottomSheet,
  GlassAuthHeading,
  GlassAuthLayout,
  GlassButton,
  GlassCheckbox,
  GlassField,
  GlassFormAlert,
  GlassLoading,
  HomeChoiceList,
  Notice,
  glassLink,
} from '@rentflow/ui';
import { googleClientIds } from '../google';
import { authPhotos } from '../PortalLayout';

type Mode = 'login' | 'invite';

/** Like the design: after a failed submit, put the cursor in the first field with an error. */
const focusFirstInvalid = (form: HTMLFormElement) =>
  window.requestAnimationFrame(() => form.querySelector<HTMLInputElement>('[aria-invalid="true"]')?.focus());

/**
 * Tenant log in: email OR national ID + password, or Google. Tenants don't sign up (their landlord
 * invites them), so "Use your invitation" explains how they join. If the login matches tenants under
 * several landlords, the "Which home?" sheet asks which one.
 */
export function LoginPage() {
  const session = useTenant();
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/';
  const [mode, setMode] = useState<Mode>('login');

  if (session.isPending)
    return (
      <div className="glass-bg px-5 pt-24">
        <GlassLoading rows={1} />
      </div>
    );
  // Also runs right after a successful login (the mutation stores the tenant), so honour `from` here.
  if (session.data) return <Navigate to={from} replace />;

  return (
    <GlassAuthLayout photos={authPhotos} tagline="Your bill, balance and payments">
      <div aria-live="polite">{mode === 'login' ? <LoginForm onInvite={() => setMode('invite')} /> : <InviteHelp onLogIn={() => setMode('login')} />}</div>
    </GlassAuthLayout>
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
    <>
      <form noValidate onSubmit={submit}>
        <GlassAuthHeading title="Log in" subtitle="Good to see you again" />
        {formMessage && <GlassFormAlert>{formMessage}</GlassFormAlert>}
        <GlassField
          label="Email or National ID"
          autoComplete="username"
          value={identifier}
          onChange={(e) => {
            setIdentifier(e.target.value);
            setErrors((x) => ({ ...x, identifier: '' }));
          }}
          error={errors.identifier || (pending.kind === 'password' && !homes ? apiError?.field('identifier') : undefined)}
        />
        <GlassField
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
        <div className="-mt-1 mb-4 flex items-center justify-between gap-3 text-sm">
          {api.auth === 'cookie' ? <GlassCheckbox label="Remember me" checked={remember} onChange={setRemember} /> : <span />}
          <Link to="/forgot-password" className={`inline-flex min-h-touch items-center ${glassLink}`}>
            Forgot password?
          </Link>
        </div>
        <GlassButton type="submit" loading={login.isPending || google.isPending} className="w-full">
          Log in
        </GlassButton>
      </form>

      {googleClientIds && (
        <div role="group" aria-label="Or continue with" className="mt-5 flex flex-col items-center gap-4">
          <span className="flex w-full items-center gap-3 text-xs text-glass-muted before:h-px before:flex-1 before:bg-glass-edge before:content-[''] after:h-px after:flex-1 after:bg-glass-edge after:content-['']">
            or
          </span>
          <GoogleSignInButton
            clientIds={googleClientIds}
            disabled={google.isPending}
            onError={setGoogleError}
            onCredential={(credential) => {
              setGoogleError(null);
              run({ kind: 'google', credential });
            }}
          />
        </div>
      )}

      <p className="m-0 mt-5 text-center text-sm text-glass-muted">
        First time here?{' '}
        <button type="button" onClick={onInvite} className={`cursor-pointer border-0 bg-transparent p-0 font-inter text-sm ${glassLink}`}>
          Use your invitation
        </button>
      </p>

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
    </>
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
      <GlassAuthHeading title="Got an invitation?" subtitle="Tenants join through their landlord" />
      <ol className="m-0 mb-5 flex list-none flex-col gap-3 p-0">
        {steps.map((step, i) => (
          <li key={step} className="flex gap-3 text-[15px] leading-relaxed">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-glass-sage text-xs font-semibold text-glass-sage-ink">{i + 1}</span>
            {step}
          </li>
        ))}
      </ol>
      <p className="m-0 mb-5 text-sm text-glass-muted">Lost the link or it expired? Ask your landlord or caretaker to send it again.</p>
      <GlassButton onClick={onLogIn} className="w-full">
        I already have a password
      </GlassButton>
    </div>
  );
}
