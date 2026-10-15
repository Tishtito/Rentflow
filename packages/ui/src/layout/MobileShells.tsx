import type { ComponentType, ReactNode, SVGProps } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { cn } from '@rentflow/core';
import { CardIcon, ChevronLeftIcon, HomeIcon, PersonIcon, ReceiptIcon } from '../icons';

/* ------------------------------------------------------------------ */
/* Tenant portal: phone-first, content capped at 480px on larger screens */
/* ------------------------------------------------------------------ */

type TenantTab = { to: string; label: string; icon: ComponentType<SVGProps<SVGSVGElement>>; end?: boolean };

/** Bottom tabs; `base` is where the portal is mounted ('' when it is the whole app). */
const tenantTabs = (base: string): TenantTab[] => [
  { to: base || '/', label: 'Home', icon: HomeIcon, end: true },
  { to: `${base}/bills`, label: 'Bills', icon: ReceiptIcon },
  { to: `${base}/payments`, label: 'Payments', icon: CardIcon },
  { to: `${base}/profile`, label: 'Profile', icon: PersonIcon },
];

export function TenantShell({ base = '', children }: { base?: string; children?: ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas">
      <div className="mx-auto max-w-[480px] pb-[calc(96px+env(safe-area-inset-bottom))] pt-[env(safe-area-inset-top)]">{children ?? <Outlet />}</div>
      <nav
        aria-label="Tenant portal"
        className="fixed inset-x-0 bottom-0 border-t border-line bg-surface px-1 pb-[calc(14px+env(safe-area-inset-bottom))] pt-1.5"
      >
        <div className="mx-auto grid max-w-[480px] grid-cols-4">
          {tenantTabs(base).map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex min-h-[52px] flex-col items-center justify-center gap-1 text-xs no-underline',
                  isActive ? 'font-semibold text-brand' : 'text-muted',
                )
              }
            >
              <Icon width={22} height={22} />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
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
