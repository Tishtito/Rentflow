import type { ReactNode } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { CreditCard, House, Receipt, User } from 'lucide-react';
import { ChevronLeftIcon } from '../icons';
import { FloatingTabBar, type GlassTab } from '../portal/Glass';

/* ------------------------------------------------------------------------- */
/* Tenant portal: phone-first glass, content capped at 520px on larger screens */
/* ------------------------------------------------------------------------- */

/** Bottom tabs; `base` is where the portal is mounted ('' when it is the whole app). */
const tenantTabs = (base: string): GlassTab[] => [
  { to: base || '/', label: 'Home', icon: House, end: true },
  { to: `${base}/bills`, label: 'Bills', icon: Receipt },
  { to: `${base}/payments`, label: 'Payments', icon: CreditCard },
  { to: `${base}/profile`, label: 'Profile', icon: User },
];

/**
 * Logged-in tenant frame: forest gradient with soft glows, the page, and the floating glass tab bar.
 * The bottom padding keeps the last card clear of the bar (bar ≈ 64px + 16px gap + 24px air).
 */
export function TenantShell({ base = '', children }: { base?: string; children?: ReactNode }) {
  return (
    <div className="glass-bg text-glass-text">
      <div className="mx-auto max-w-[520px] pb-[calc(112px+env(safe-area-inset-bottom))] pt-[env(safe-area-inset-top)]">{children ?? <Outlet />}</div>
      <FloatingTabBar tabs={tenantTabs(base)} label="Tenant portal" />
    </div>
  );
}

/** Tenant pages without the tab bar (login, invitation, reset). */
export function TenantAuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-surface">
      <div className="mx-auto max-w-[480px] pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Caretaker mobile screens: dark header with back link + progress      */
/* ------------------------------------------------------------------ */

export function CaretakerHeader({
  title,
  subtitle,
  backTo,
  userLabel,
  children,
}: {
  title: string;
  subtitle?: string;
  backTo?: string;
  userLabel?: string; // "Joseph · Caretaker"
  children?: ReactNode; // e.g. progress block
}) {
  return (
    <header className="flex flex-col gap-3.5 bg-nav px-5 pb-[22px] pt-[calc(20px+env(safe-area-inset-top))] text-nav-fg">
      <div className="flex items-center justify-between">
        {backTo ? (
          <Link to={backTo} aria-label="Back" className="-ml-2.5 grid h-touch w-touch place-items-center text-nav-fg hover:text-white">
            <ChevronLeftIcon />
          </Link>
        ) : (
          <span />
        )}
        {userLabel && <span className="text-[13px] text-nav-muted">{userLabel}</span>}
      </div>
      <div className="flex flex-col gap-1">
        <h1 className="m-0 font-display text-[26px] font-bold">{title}</h1>
        {subtitle && <span className="text-sm text-nav-text">{subtitle}</span>}
      </div>
      {children}
    </header>
  );
}
