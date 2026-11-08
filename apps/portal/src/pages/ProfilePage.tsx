import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, KeyRound, LogOut, Mail, Phone } from 'lucide-react';
import { ApiError, useChangeTenantPassword, useTenant, useTenantLogout } from '@rentflow/api';
import { GlassAvatar, GlassButton, GlassCard, GlassField, GlassFormAlert, IconCircle, PasswordStrength, type GlassIcon } from '@rentflow/ui';

function InfoRow({ icon, label, value }: { icon: GlassIcon; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 border-0 border-b border-solid border-glass-line px-1 py-3 last:border-0">
      <IconCircle icon={icon} />
      <dl className="m-0 flex min-w-0 flex-1 flex-col gap-0.5">
        <dt className="text-xs text-glass-muted">{label}</dt>
        <dd className="m-0 truncate text-[15px]" title={value}>
          {value}
        </dd>
      </dl>
    </div>
  );
}

/** Change my password (PUT /api/portal/auth/password): needs the current one; this phone stays logged in. */
function ChangePasswordCard() {
  const change = useChangeTenantPassword();
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const apiError = change.error instanceof ApiError ? change.error : null;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!current) next.current = 'Enter your current password';
    if (password.length < 8) next.password = 'At least 8 characters';
    if (confirm !== password) next.confirm = "Passwords don't match";
    setErrors(next);
    if (Object.keys(next).length) return;
    change.mutate(
      { current_password: current, password, password_confirmation: confirm },
      {
        onSuccess: () => {
          setOpen(false);
          setCurrent('');
          setPassword('');
          setConfirm('');
        },
      },
    );
  };

  if (!open)
    return (
      <GlassCard className="px-4 py-1">
        <button
          type="button"
          onClick={() => {
            change.reset();
            setOpen(true);
          }}
          className="flex min-h-touch w-full cursor-pointer items-center gap-3 border-0 bg-transparent px-1 py-3 text-left text-glass-text"
        >
          <IconCircle icon={KeyRound} />
          <span className="flex flex-1 flex-col gap-0.5">
            <span className="text-[15px] font-medium">Change password</span>
            {change.isSuccess && <span className="text-xs text-glass-sage">Password changed.</span>}
          </span>
        </button>
      </GlassCard>
    );

  const clear = (key: string) => setErrors((x) => ({ ...x, [key]: '' }));

  return (
    <GlassCard className="px-4 py-4">
      <form noValidate onSubmit={submit}>
        <h2 className="m-0 mb-4 text-base font-semibold">Change password</h2>
        {change.error && !apiError?.field('current_password') && !apiError?.field('password') && (
          <GlassFormAlert>{apiError ? apiError.message : "Can't reach the server. Try again."}</GlassFormAlert>
        )}
        <GlassField
          label="Current password"
          type="password"
          revealable
          autoComplete="current-password"
          value={current}
          onChange={(e) => {
            setCurrent(e.target.value);
            clear('current');
          }}
          error={errors.current || apiError?.field('current_password')}
        />
        <GlassField
          label="New password"
          type="password"
          revealable
          autoComplete="new-password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            clear('password');
          }}
          error={errors.password || apiError?.field('password')}
          below={<PasswordStrength password={password} />}
        />
        <GlassField
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => {
            setConfirm(e.target.value);
            clear('confirm');
          }}
          error={errors.confirm}
        />
        <div className="flex gap-2">
          <GlassButton variant="glass" className="flex-1" onClick={() => setOpen(false)}>
            Cancel
          </GlassButton>
          <GlassButton type="submit" loading={change.isPending} className="flex-1">
            Save
          </GlassButton>
        </div>
        <p className="m-0 mt-3 text-center text-xs text-glass-muted">Your other phones will be logged out.</p>
      </form>
    </GlassCard>
  );
}

export function ProfilePage() {
  const tenant = useTenant().data;
  const logout = useTenantLogout();
  const navigate = useNavigate();
  if (!tenant) return null;

  return (
    <div className="flex flex-col gap-3.5 px-5 pt-8">
      <header className="flex flex-col items-center gap-2 pb-3 text-center">
        <GlassAvatar name={tenant.full_name} size={84} ring className="mb-3" />
        <h1 className="m-0 font-serif text-[28px] font-semibold leading-tight">{tenant.full_name}</h1>
        {tenant.account.name && <p className="m-0 text-sm text-glass-muted">{tenant.account.name}</p>}
      </header>

      <GlassCard className="px-4 py-1">
        <InfoRow icon={Phone} label="Phone" value={tenant.phone} />
        <InfoRow icon={Mail} label="Email" value={tenant.email ?? '—'} />
        <InfoRow icon={Building2} label="Landlord" value={tenant.account.name ?? '—'} />
      </GlassCard>

      <ChangePasswordCard />

      <GlassButton
        variant="danger"
        className="mt-3 w-full"
        loading={logout.isPending}
        onClick={() => logout.mutate(undefined, { onSettled: () => navigate('/login', { replace: true }) })}
      >
        <LogOut size={18} strokeWidth={1.75} aria-hidden="true" />
        Log out
      </GlassButton>
    </div>
  );
}
