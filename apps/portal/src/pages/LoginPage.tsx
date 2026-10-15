import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { ApiError, useTenant, useTenantLogin } from '@rentflow/api';
import { BottomSheet, Button, HomeChoiceList, LoadingState, LogoMark, Notice, TenantAuthLayout, TextField } from '@rentflow/ui';

/**
 * Log in with email OR national ID + password (POST /api/portal/auth/login).
 * If the person rents from several landlords the API returns the homes; show the
 * "Which home?" sheet and log in again with the chosen tenant_id.
 */
export function LoginPage() {
  const session = useTenant();
  const login = useTenantLogin();
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/';
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [homes, setHomes] = useState<Array<{ tenant_id: number; unit_label: string }> | null>(null);
  const [chosen, setChosen] = useState<number | undefined>();

  if (session.isPending) return <LoadingState className="min-h-screen" />;
  // Also runs right after a successful login (the mutation stores the tenant), so honour `from` here.
  if (session.data) return <Navigate to={from} replace />;

  const error = login.error instanceof ApiError ? login.error : null;

  const submit = (tenantId?: number) =>
    login.mutate(
      { identifier, password, tenant_id: tenantId },
      {
        onSuccess: (result) => {
          if (result.choose_home) {
            setHomes(result.homes.map((h) => ({ tenant_id: h.tenant_id, unit_label: h.account_name ?? `Home ${h.tenant_id}` })));
          }
        },
      },
    );

  return (
    <TenantAuthLayout>
      <div className="flex flex-col gap-7 px-6 pt-12">
        <div className="flex items-center gap-2.5">
          <LogoMark className="text-brand" width={30} height={30} />
          <span className="font-display text-lg font-bold">Tenant portal</span>
        </div>
        <div className="flex flex-col gap-1.5">
          <h1 className="m-0 font-display text-[32px] font-bold">Log in</h1>
          <p className="m-0 text-[15px] text-muted">See your bill, balance and payments.</p>
        </div>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          {error && Object.keys(error.errors).length === 0 && <Notice tone="danger">{error.message}</Notice>}
          {login.error && !error && <Notice tone="danger">Can't reach the server. Try again.</Notice>}
          <TextField
            label="Email or national ID"
            size="lg"
            autoComplete="username"
            required
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            error={homes ? undefined : error?.field('identifier')}
          />
          <TextField
            label="Password"
            size="lg"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={error?.field('password')}
          />
          <Link to="/forgot-password" className="self-end py-1 text-sm">
            Forgot password?
          </Link>
          <Button type="submit" variant="primary" size="xl" disabled={login.isPending}>
            {login.isPending ? 'Logging in…' : 'Log in'}
          </Button>
        </form>
      </div>

      <BottomSheet
        open={homes !== null}
        onClose={() => setHomes(null)}
        title="Which home?"
        description="You rent from more than one landlord. Choose one to continue."
      >
        {error?.field('tenant_id') && <Notice tone="danger">{error.field('tenant_id')}</Notice>}
        <HomeChoiceList
          homes={homes ?? []}
          selectedId={chosen}
          onChoose={(tenantId) => {
            setChosen(tenantId);
            submit(tenantId);
          }}
        />
      </BottomSheet>
    </TenantAuthLayout>
  );
}
