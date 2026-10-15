import { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { ApiError, useAdminLogin, useAdminUser } from '@rentflow/api';
import { Button, LoadingState, LogoMark, Notice, TextField } from '@rentflow/ui';
import { homeFor } from '../session';

export function LoginPage() {
  const session = useAdminUser();
  const login = useAdminLogin();
  const from = (useLocation().state as { from?: string } | null)?.from;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  if (session.isPending) return <LoadingState className="min-h-screen" />;
  // Also runs right after a successful login (the mutation stores the user), so honour `from` here.
  if (session.data) return <Navigate to={from ?? homeFor(session.data)} replace />;

  const error = login.error instanceof ApiError ? login.error : null;

  return (
    <main className="flex min-h-screen items-start justify-center bg-canvas px-4 pt-[12vh]">
      <div className="flex w-full max-w-[420px] flex-col gap-7 rounded-xl border border-line bg-surface p-7">
        <div className="flex items-center gap-2.5">
          <LogoMark className="text-brand" width={30} height={30} />
          <span className="font-display text-lg font-bold">Rentflow</span>
        </div>
        <div className="flex flex-col gap-1.5">
          <h1 className="m-0 font-display text-[32px] font-bold">Log in</h1>
          <p className="m-0 text-[15px] text-muted">Landlords, caretakers and platform admins.</p>
        </div>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            login.mutate({ email, password });
          }}
        >
          {error && !error.field('email') && <Notice tone="danger">{error.message}</Notice>}
          {login.error && !error && <Notice tone="danger">Can't reach the server. Try again.</Notice>}
          <TextField
            label="Email"
            type="email"
            size="lg"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={error?.field('email')}
          />
          <TextField
            label="Password"
            type="password"
            size="lg"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={error?.field('password')}
          />
          <Button type="submit" variant="primary" size="xl" disabled={login.isPending}>
            {login.isPending ? 'Logging in…' : 'Log in'}
          </Button>
        </form>
      </div>
    </main>
  );
}
