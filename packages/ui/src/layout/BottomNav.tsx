import type { ComponentType, SVGProps } from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '@rentflow/core';
import { DashboardIcon, GaugeIcon, HomeIcon, PersonIcon, ReceiptIcon } from '../icons';
import type { NavItem } from './AdminShell';

/* ------------------------------------------------------------------ */
/* Admin app on phones: floating bottom bar, Dashboard raised in a notch */
/* ------------------------------------------------------------------ */

export interface BottomTab {
  to: string;
  label: string; // full name (aria-label), as in the sidebar
  shortLabel: string; // shown under the icon
  icon: ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;
  end?: boolean;
  center?: boolean; // the raised round button
}

/** Left → right. Each `to` matches a `landlordNav` item, so the sidebar's permission filter applies. */
export const landlordTabs: BottomTab[] = [
  { to: '/admin/properties', label: 'Properties & units', shortLabel: 'Properties', icon: HomeIcon },
  { to: '/admin/tenants', label: 'Tenants', shortLabel: 'Tenants', icon: PersonIcon },
  { to: '/admin', label: 'Dashboard', shortLabel: 'Dashboard', icon: DashboardIcon, end: true, center: true },
  { to: '/admin/readings', label: 'Meter readings', shortLabel: 'Meters', icon: GaugeIcon },
  { to: '/admin/bills', label: 'Bills', shortLabel: 'Bills', icon: ReceiptIcon },
];

/*
 * The bar's top edge around the centre button: 96 × 64, button (r 28) centred 2px below the top edge,
 * cut out with a 6px gap (r 34), with soft shoulders into the straight edge. Mirrors at x = 48.
 */
const NOTCH_PATH = 'M0 0H4C10 0 13.3 3.2 14.95 10A34 34 0 0 0 81.05 10C82.7 3.2 86 0 92 0H96V64H0Z';

const motion = 'transition duration-150 motion-reduce:transition-none';

/**
 * Phone-only (below `md`) bottom navigation for the admin app. Shows the `tabs` the user may open
 * (`allowed` = the nav after the permission filter); everything else stays in the top bar's menu.
 * With Dashboard allowed it sits raised in the middle (the other slots keep their places); without
 * it the bar is a plain row. Fewer than two tabs: no bar.
 */
export function BottomNav({ tabs, allowed }: { tabs: BottomTab[]; allowed: NavItem[] }) {
  const allowedTo = new Set(allowed.map((n) => n.to));
  const visible = tabs.filter((t) => allowedTo.has(t.to));
  if (visible.length < 2) return null;

  const notched = visible.some((t) => t.center);
  // With the raised button every tab keeps its column, so the button stays over the notch.
  const slots = notched ? tabs.map((t) => (allowedTo.has(t.to) ? t : null)) : visible;

  return (
    <nav
      aria-label="Main navigation"
      className="fixed inset-x-3 bottom-[calc(8px+env(safe-area-inset-bottom))] z-30 drop-shadow-bar md:hidden"
    >
      {/* Background: the surface with a real cutout under the round button (the shadow follows it). */}
      <div aria-hidden="true" className="absolute inset-0 flex">
        {notched ? (
          <>
            <div className="flex-1 rounded-l-[22px] bg-surface" />
            <svg width="96" height="64" viewBox="0 0 96 64" className="-mx-px h-full shrink-0 fill-surface">
              <path d={NOTCH_PATH} />
            </svg>
            <div className="flex-1 rounded-r-[22px] bg-surface" />
          </>
        ) : (
          <div className="flex-1 rounded-[22px] bg-surface" />
        )}
      </div>

      <ul className="relative m-0 flex h-16 list-none p-0">
        {slots.map((tab, i) =>
          tab ? (
            <li key={tab.to} className={cn('flex', tab.center ? 'w-[96px] shrink-0' : 'flex-1')}>
              {tab.center ? <CenterTab tab={tab} /> : <SideTab tab={tab} />}
            </li>
          ) : (
            <li key={i} aria-hidden="true" className="flex-1" />
          ),
        )}
      </ul>
    </nav>
  );
}

function SideTab({ tab }: { tab: BottomTab }) {
  const Icon = tab.icon;
  return (
    <NavLink
      to={tab.to}
      end={tab.end}
      aria-label={tab.label}
      className={({ isActive }) =>
        cn(
          'group relative flex min-h-touch flex-1 flex-col items-center justify-center gap-1 rounded-[18px] text-[11px] no-underline outline-none',
          'focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand',
          motion,
          isActive ? 'font-medium text-brand [&_svg_*]:[stroke-width:2]' : 'text-muted hover:text-ink',
        )
      }
    >
      {({ isActive }) => (
        <>
          <span
            aria-hidden="true"
            className={cn(
              'absolute top-1.5 h-[3px] w-4 rounded-full bg-brand',
              motion,
              isActive ? 'scale-x-100 opacity-100' : 'scale-x-50 opacity-0',
            )}
          />
          <span className={cn('flex flex-col items-center gap-1 group-active:scale-95 motion-reduce:group-active:scale-100', motion)}>
            <Icon size={22} />
            {tab.shortLabel}
          </span>
        </>
      )}
    </NavLink>
  );
}

function CenterTab({ tab }: { tab: BottomTab }) {
  const Icon = tab.icon;
  return (
    <NavLink
      to={tab.to}
      end={tab.end}
      aria-label={tab.label}
      className={({ isActive }) =>
        cn(
          'group relative flex flex-1 flex-col items-center justify-end pb-2 text-[11px] no-underline outline-none',
          motion,
          isActive ? 'font-semibold text-brand' : 'text-muted hover:text-ink',
        )
      }
    >
      <span
        className={cn(
          'absolute -top-[26px] left-1/2 grid h-14 w-14 -translate-x-1/2 place-items-center rounded-full bg-brand text-white shadow-sheet',
          'group-hover:bg-brand-hover group-focus-visible:ring-2 group-focus-visible:ring-brand group-focus-visible:ring-offset-2',
          'group-active:scale-95 motion-reduce:group-active:scale-100',
          motion,
        )}
      >
        <Icon size={24} />
      </span>
      {tab.shortLabel}
    </NavLink>
  );
}
