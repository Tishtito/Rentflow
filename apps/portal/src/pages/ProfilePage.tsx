import { useNavigate } from 'react-router-dom';
import { Building2, LogOut, Mail, Phone } from 'lucide-react';
import { useTenant, useTenantLogout } from '@rentflow/api';
import { GlassAvatar, GlassButton, GlassCard, IconCircle, type GlassIcon } from '@rentflow/ui';

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
