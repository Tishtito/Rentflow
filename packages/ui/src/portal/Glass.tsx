import type { ButtonHTMLAttributes, ComponentType, HTMLAttributes, ReactNode } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, CircleAlert, type LucideProps } from 'lucide-react';
import { cn, formatDate, type Invoice } from '@rentflow/core';
import { backTarget } from '../primitives/BackButton';

/*
 * Tenant portal "dark botanical glass" kit. Classes `glass`, `glass-strong`, `glass-bg` and
 * `glass-skeleton` live in styles/portal.css (solid fallbacks for no blur / reduced transparency);
 * colours are the `glass` tokens. Icons: Lucide, thin line.
 */

export type GlassIcon = ComponentType<LucideProps>;

const press = 'transition duration-200 active:scale-[.98] motion-reduce:active:scale-100';

/** Frosted card; `strong` = the slightly brighter hero glass. */
export function GlassCard({
  strong,
  className,
  children,
  ...rest
}: { strong?: boolean; children: ReactNode } & HTMLAttributes<HTMLElement>) {
  return (
    <section className={cn(strong ? 'glass-strong' : 'glass', 'rounded-glass text-glass-text', className)} {...rest}>
      {children}
    </section>
  );
}

export type PillTone = 'amber' | 'coral' | 'sage' | 'neutral';

const pillTone: Record<PillTone, string> = {
  amber: 'bg-glass-amber-soft text-glass-amber',
  coral: 'bg-glass-coral-soft text-glass-coral',
  sage: 'bg-glass-sage-soft text-glass-sage',
  neutral: 'bg-glass-fill text-glass-muted',
};

/** Tinted glass pill (status, due date). */
export function StatusPill({ tone, children, className }: { tone: PillTone; children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold', pillTone[tone], className)}>
      {children}
    </span>
  );
}

/** A bill's status as the tenant reads it: due (amber), part paid, overdue (coral), paid (sage). */
export function InvoicePill({ invoice, className }: { invoice: Pick<Invoice, 'status' | 'due_date'>; className?: string }) {
  const [tone, label]: [PillTone, string] = {
    issued: ['amber', `Due ${formatDate(invoice.due_date)}`],
    partially_paid: ['amber', 'Part paid'],
    overdue: ['coral', 'Overdue'],
    paid: ['sage', 'Paid'],
    draft: ['neutral', 'Draft'],
    void: ['neutral', 'Void'],
  }[invoice.status] as [PillTone, string];
  return (
    <StatusPill tone={tone} className={className}>
      {label}
    </StatusPill>
  );
}

const circleTone = {
  default: 'text-glass-text',
  sage: 'text-glass-sage',
  amber: 'text-glass-amber',
  coral: 'text-glass-coral',
} as const;

/** 40px glass circle holding a line icon. */
export function IconCircle({ icon: Icon, tone = 'default', className }: { icon: GlassIcon; tone?: keyof typeof circleTone; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-full border border-solid border-glass-edge bg-glass-fill', circleTone[tone], className)}
    >
      <Icon size={18} strokeWidth={1.75} />
    </span>
  );
}

/** Bill line: icon, label (+ muted sub-line such as meter readings), amount on the right. */
export function LineItemRow({
  icon,
  label,
  sub,
  amount,
  tone = 'default',
}: {
  icon: GlassIcon;
  label: ReactNode;
  sub?: ReactNode;
  amount: ReactNode;
  tone?: 'default' | 'amber';
}) {
  return (
    <div className={cn('flex items-center gap-3 border-b border-solid border-glass-line py-3 last:border-0', tone === 'amber' && 'text-glass-amber')}>
      <IconCircle icon={icon} tone={tone} />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5 text-[15px]">
        {label}
        {sub && <span className="num text-xs text-glass-muted">{sub}</span>}
      </span>
      <span className="num text-right text-[15px]">{amount}</span>
    </div>
  );
}

/** Row in a list: icon, title / subtitle, something on the right; a link when `to` is set. */
export function ListRow({
  to,
  icon,
  iconTone,
  title,
  subtitle,
  right,
  chevron,
  className,
}: {
  to?: string;
  icon: GlassIcon;
  iconTone?: 'default' | 'sage' | 'amber' | 'coral';
  title: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
  chevron?: boolean;
  className?: string;
}) {
  const body = (
    <>
      <IconCircle icon={icon} tone={iconTone} />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-[15px] font-medium">{title}</span>
        {subtitle && <span className="text-xs leading-snug text-glass-muted">{subtitle}</span>}
      </span>
      {right && <span className="flex shrink-0 flex-col items-end gap-1">{right}</span>}
      {chevron && <ChevronRight size={18} strokeWidth={1.75} className="shrink-0 text-glass-muted" aria-hidden="true" />}
    </>
  );
  const base = 'flex min-h-touch items-center gap-3 rounded-[18px] px-3 py-3 text-glass-text no-underline';
  return to ? (
    <Link to={to} className={cn(base, press, 'hover:bg-glass-fill hover:text-glass-text active:bg-glass-raised', className)}>
      {body}
    </Link>
  ) : (
    <div className={cn(base, className)}>{body}</div>
  );
}

/** Page title in the serif, optional subtitle and Back (detail pages only; tab roots have none). */
export function PortalHeader({ title, subtitle, back }: { title: ReactNode; subtitle?: ReactNode; back?: string }) {
  return (
    <header className="flex flex-col gap-1 px-5 pb-3 pt-4">
      {back && <GlassBack fallback={back} />}
      <h1 className="m-0 font-serif text-[28px] font-semibold leading-tight text-glass-text">{title}</h1>
      {subtitle && <p className="m-0 text-sm text-glass-muted">{subtitle}</p>}
    </header>
  );
}

/** "‹ Back": previous page in the app, else `fallback` (same rule as BackButton). */
function GlassBack({ fallback }: { fallback: string }) {
  const navigate = useNavigate();
  const idx = typeof window !== 'undefined' ? (window.history.state as { idx?: number } | null)?.idx : undefined;
  const target = backTarget(idx, fallback);
  if (target === null) return null;
  return (
    <button
      type="button"
      onClick={() => (target === 'history' ? navigate(-1) : navigate(target))}
      className="-ml-2 inline-flex min-h-touch items-center gap-1 self-start rounded-full border-0 bg-transparent px-2 text-sm font-medium text-glass-sage hover:bg-glass-fill"
    >
      <ChevronLeft size={18} strokeWidth={1.75} aria-hidden="true" />
      Back
    </button>
  );
}

export interface GlassTab {
  to: string;
  label: string;
  icon: GlassIcon;
  end?: boolean;
}

/** Detached glass tab bar: 16px from the edges and the bottom (plus the safe area). */
export function FloatingTabBar({ tabs, label }: { tabs: GlassTab[]; label: string }) {
  return (
    <nav
      aria-label={label}
      className="glass fixed inset-x-4 bottom-[calc(16px+env(safe-area-inset-bottom))] z-30 mx-auto max-w-[488px] rounded-bar px-1.5 py-1.5"
    >
      <ul className="m-0 grid list-none p-0" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
        {tabs.map(({ to, label: name, icon: Icon, end }) => (
          <li key={to} className="flex">
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'group flex min-h-[52px] flex-1 flex-col items-center justify-center gap-1 rounded-[22px] text-[11px] no-underline',
                  press,
                  isActive ? 'font-semibold text-glass-sage hover:text-glass-sage' : 'text-glass-muted hover:text-glass-text',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span className={cn('grid place-items-center rounded-full px-3.5 py-1 transition-colors duration-200', isActive && 'bg-glass-sage-soft')}>
                    <Icon size={20} strokeWidth={isActive ? 2 : 1.75} aria-hidden="true" />
                  </span>
                  {name}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

const buttonVariant = {
  primary: 'border-0 bg-glass-sage text-glass-sage-ink hover:brightness-105',
  glass: 'glass text-glass-text hover:bg-glass-raised',
  danger: 'glass text-glass-coral hover:bg-glass-raised',
} as const;

/** Pill button: sage primary, plain glass, or glass with coral text (log out). */
export function GlassButton({
  variant = 'primary',
  loading,
  className,
  children,
  disabled,
  type = 'button',
  ...rest
}: { variant?: keyof typeof buttonVariant; loading?: boolean } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex min-h-[48px] cursor-pointer items-center justify-center gap-2 rounded-full px-5 text-[15px] font-semibold',
        press,
        'disabled:cursor-default disabled:opacity-70',
        buttonVariant[variant],
        className,
      )}
      {...rest}
    >
      {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-t-transparent" aria-hidden="true" />}
      {children}
    </button>
  );
}

/** Shimmering glass placeholders while a screen loads. */
export function GlassLoading({ rows = 3, label = 'Loading…' }: { rows?: number; label?: string }) {
  return (
    <div role="status" className="flex flex-col gap-3.5">
      <span className="sr-only">{label}</span>
      <div className="glass-skeleton h-[180px] rounded-glass" />
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="glass-skeleton h-16 rounded-glass" />
      ))}
    </div>
  );
}

/** Coral-tinted glass card for a failed load, with Try again. */
export function GlassError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <section role="alert" className="glass flex flex-col gap-2 rounded-glass border-glass-coral/40 bg-glass-coral-soft p-5 text-glass-text">
      <span className="flex items-center gap-2 font-semibold text-glass-coral">
        <CircleAlert size={18} strokeWidth={1.75} aria-hidden="true" />
        Something went wrong
      </span>
      <span className="text-sm">{message}</span>
      {onRetry && (
        <button type="button" onClick={onRetry} className="min-h-touch self-start border-0 bg-transparent p-0 text-sm font-semibold text-glass-coral underline">
          Try again
        </button>
      )}
    </section>
  );
}

/** Centred glass card for an empty list. */
export function GlassEmpty({ icon, title, children }: { icon: GlassIcon; title: string; children?: ReactNode }) {
  return (
    <GlassCard className="flex flex-col items-center gap-2 px-6 py-10 text-center">
      <IconCircle icon={icon} tone="sage" className="mb-1 h-12 w-12" />
      <h2 className="m-0 font-serif text-[19px] font-semibold">{title}</h2>
      {children && <p className="m-0 max-w-[280px] text-sm text-glass-muted">{children}</p>}
    </GlassCard>
  );
}

/** "1–15 of 32 · Previous · Next" in glass; hidden when everything fits on one page. */
export function GlassPager({
  meta,
  page,
  onPage,
  busy,
}: {
  meta: { current_page: number; last_page: number; per_page: number; total: number } | undefined;
  page: number;
  onPage: (page: number) => void;
  busy?: boolean;
}) {
  if (!meta || meta.last_page <= 1) return null;
  const from = (meta.current_page - 1) * meta.per_page + 1;
  const to = Math.min(meta.current_page * meta.per_page, meta.total);
  return (
    <div className="flex items-center justify-between gap-3 px-1 py-2 text-[13px] text-glass-muted">
      <span className="num">
        {from}–{to} of {meta.total}
      </span>
      <span className="flex gap-2">
        <GlassButton variant="glass" className="min-h-touch px-4 text-sm shadow-none" disabled={page <= 1 || busy} onClick={() => onPage(page - 1)}>
          Previous
        </GlassButton>
        <GlassButton variant="glass" className="min-h-touch px-4 text-sm shadow-none" disabled={page >= meta.last_page || busy} onClick={() => onPage(page + 1)}>
          Next
        </GlassButton>
      </span>
    </div>
  );
}

/** Initials in a glass circle; `ring` adds the sage ring (profile). */
export function GlassAvatar({ name, size = 40, ring, className }: { name: string; size?: number; ring?: boolean; className?: string }) {
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]!.toUpperCase())
      .join('') || '?';
  return (
    <span
      aria-hidden="true"
      className={cn(
        'glass grid shrink-0 place-items-center rounded-full font-semibold text-glass-text',
        ring && 'outline outline-2 outline-offset-4 outline-glass-sage',
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
    >
      {initials}
    </span>
  );
}
