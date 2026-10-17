import { useEffect, useState, type ComponentType, type ReactNode, type SVGProps } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { cn } from '@rentflow/core';
import {
  BellIcon,
  CardIcon,
  ChevronDownIcon,
  CloseIcon,
  DashboardIcon,
  GaugeIcon,
  HomeIcon,
  LogoMark,
  MenuIcon,
  PersonIcon,
  ReceiptIcon,
  SlidersIcon,
  TeamIcon,
} from '../icons';

export interface NavItem {
  to: string;
  label: string;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  badge?: number; // e.g. unmatched payments
  end?: boolean;
  /** Shown only to users with ANY of these permissions (the app filters with can()). */
  permissions?: string[];
}

export const landlordNav: NavItem[] = [
  { to: '/admin', label: 'Dashboard', icon: DashboardIcon, end: true, permissions: ['dashboard.view'] },
  { to: '/admin/properties', label: 'Properties & units', icon: HomeIcon, permissions: ['properties.view'] },
  { to: '/admin/tenants', label: 'Tenants', icon: PersonIcon, permissions: ['tenants.view'] },
  { to: '/admin/readings', label: 'Meter readings', icon: GaugeIcon, permissions: ['readings.view'] },
  { to: '/admin/bills', label: 'Bills', icon: ReceiptIcon, permissions: ['invoices.view'] },
  { to: '/admin/payments', label: 'Payments', icon: CardIcon, permissions: ['payments.view'] },
  { to: '/admin/settings/billing', label: 'Billing settings', icon: SlidersIcon, permissions: ['rates.view', 'billing.view', 'settings.billing'] },
  { to: '/admin/settings/whatsapp', label: 'WhatsApp', icon: BellIcon, permissions: ['whatsapp.manage'] },
  { to: '/admin/team', label: 'Team & roles', icon: TeamIcon, permissions: ['team.view'] },
];

export const superAdminNav: NavItem[] = [
  { to: '/platform', label: 'Platform overview', icon: DashboardIcon, end: true },
  { to: '/platform/accounts', label: 'Landlord accounts', icon: HomeIcon },
  { to: '/platform/billing-runs', label: 'Billing runs', icon: ReceiptIcon },
  { to: '/platform/messaging', label: 'Messaging & delivery', icon: BellIcon },
  { to: '/platform/roles', label: 'Built-in roles', icon: SlidersIcon },
  { to: '/platform/admins', label: 'Platform admins', icon: TeamIcon },
  { to: '/platform/activity', label: 'Activity log', icon: PersonIcon },
];

/**
 * Admin portal frame: dark sidebar + main column. Below `md` (phones, the admin app) the sidebar
 * becomes a top bar with a menu button that opens the nav full-screen; it closes on navigation.
 * Respects the notch / status bar (safe-area insets) inside the Capacitor app.
 *
 * Use as a route element: <Route element={<AdminShell nav={landlordNav} … />}> with child routes.
 */
export function AdminShell({
  nav,
  variant = 'landlord',
  brand = 'Rentflow',
  accountName,
  onSwitchAccount,
  user,
  onLogout,
  children,
}: {
  nav: NavItem[];
  variant?: 'landlord' | 'super';
  brand?: string;
  accountName?: string; // landlords; super admins acting inside an account
  onSwitchAccount?: () => void; // makes the account block a switcher button
  user?: { name: string; roleLabel: string; initials: string };
  onLogout?: () => void;
  children?: ReactNode; // defaults to <Outlet/>
}) {
  const isSuper = variant === 'super';
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => setMenuOpen(false), [pathname]);

  return (
    <div className="flex min-h-screen flex-col bg-canvas md:flex-row">
      {/* Phones: top bar with the menu button. */}
      <header
        className={cn(
          'sticky top-0 z-30 flex items-center justify-between gap-3 px-3 pb-1.5 pt-[calc(6px+env(safe-area-inset-top))] text-nav-fg md:hidden',
          isSuper ? 'bg-nav-deep' : 'bg-nav',
        )}
      >
        <span className="flex min-w-0 items-center gap-2.5 px-1">
          <LogoMark className="shrink-0 text-brand-mint" />
          <span className="truncate font-display text-[17px] font-bold">{accountName ?? brand}</span>
        </span>
        <button
          type="button"
          aria-expanded={menuOpen}
          aria-controls="admin-nav"
          onClick={() => setMenuOpen((o) => !o)}
          className="grid h-touch w-touch place-items-center rounded-md text-nav-fg hover:bg-nav-raised"
        >
          {menuOpen ? <CloseIcon /> : <MenuIcon />}
          <span className="sr-only">{menuOpen ? 'Close menu' : 'Menu'}</span>
        </button>
      </header>

      <nav
        id="admin-nav"
        aria-label="Main"
        className={cn(
          'box-border flex-col gap-6 px-4 py-6 text-nav-fg',
          // Phones: full-screen panel under the top bar, only while open.
          menuOpen ? 'fixed inset-x-0 bottom-0 top-[calc(56px+env(safe-area-inset-top))] z-20 flex overflow-y-auto' : 'hidden',
          // Tablets and up: the sidebar.
          'md:static md:flex md:min-h-screen md:w-[264px] md:shrink-0 md:overflow-visible md:pt-[calc(24px+env(safe-area-inset-top))]',
          isSuper ? 'bg-nav-deep' : 'bg-nav',
        )}
      >
        <div className="hidden flex-col gap-2.5 px-2 md:flex">
          <div className="flex items-center gap-2.5">
            <LogoMark className="text-brand-mint" />
            <span className="font-display text-[19px] font-bold">{brand}</span>
          </div>
          {isSuper && (
            <span className="self-start rounded-full bg-gold-soft px-2.5 py-[3px] text-[11px] font-bold uppercase tracking-[.06em] text-gold-ink">
              Super admin
            </span>
          )}
        </div>

        {accountName &&
          (onSwitchAccount ? (
            <button
              type="button"
              onClick={onSwitchAccount}
              className="flex min-h-touch items-center justify-between rounded-md border border-nav-line bg-nav-raised px-3 py-2 text-left text-sm text-nav-fg"
            >
              <span className="flex flex-col">
                <span className="text-[11px] text-nav-muted">Account</span>
                {accountName}
              </span>
              <ChevronDownIcon className="text-nav-muted" />
            </button>
          ) : (
            <div className="flex min-h-touch flex-col justify-center rounded-md border border-nav-line bg-nav-raised px-3 py-2 text-sm text-nav-fg">
              <span className="text-[11px] text-nav-muted">Account</span>
              {accountName}
            </div>
          ))}

        <div className="flex flex-col gap-0.5">
          {nav.map(({ to, label, icon: Icon, badge, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex min-h-touch items-center gap-3 rounded-md px-3 text-sm no-underline',
                  isActive ? 'bg-nav-active font-medium text-white hover:text-white' : 'text-nav-text hover:bg-nav-raised hover:text-white',
                )
              }
              style={{ ['--icon-bg' as string]: isSuper ? '#0F1A15' : '#14231C' }}
            >
              {Icon && <Icon />}
              <span className="flex-1">{label}</span>
              {badge ? (
                <span className="grid h-[22px] min-w-[22px] place-items-center rounded-full bg-gold-soft px-1.5 text-xs font-bold text-gold-ink">
                  {badge}
                </span>
              ) : null}
            </NavLink>
          ))}
        </div>

        {user && (
          <div className="mt-auto flex items-center gap-2.5 border-t border-nav-line px-2 py-3 pb-[calc(12px+env(safe-area-inset-bottom))]">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-mint text-sm font-semibold text-nav">
              {user.initials}
            </span>
            <span className="flex flex-1 flex-col text-[13px]">
              {user.name}
              <span className="text-xs text-nav-muted">{user.roleLabel}</span>
            </span>
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="min-h-touch rounded-md px-2 text-[13px] text-nav-muted hover:bg-nav-raised hover:text-white"
              >
                Log out
              </button>
            )}
          </div>
        )}
      </nav>

      <main className="box-border flex min-w-0 flex-1 flex-col gap-6 px-4 pb-[calc(48px+env(safe-area-inset-bottom))] pt-6 md:px-10 md:pt-8">
        {children ?? <Outlet />}
      </main>
    </div>
  );
}
