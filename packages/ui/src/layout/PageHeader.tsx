import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

/** Title block at the top of every admin page. */
export function PageHeader({
  title,
  eyebrow,
  subtitle,
  breadcrumb,
  badge,
  actions,
}: {
  title: string;
  eyebrow?: ReactNode; // small line above the title (e.g. today's date)
  subtitle?: ReactNode;
  breadcrumb?: Array<{ label: string; to?: string }>;
  badge?: ReactNode; // status pill beside the title
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-2">
      {breadcrumb && (
        <nav aria-label="Breadcrumb" className="text-[13px] text-muted">
          {breadcrumb.map((b, i) => (
            <span key={b.label}>
              {i > 0 && ' / '}
              {b.to ? <Link to={b.to}>{b.label}</Link> : <span aria-current="page">{b.label}</span>}
            </span>
          ))}
        </nav>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          {eyebrow && <span className="text-[13px] text-muted">{eyebrow}</span>}
          <div className="flex flex-wrap items-center gap-3.5">
            <h1 className="m-0 font-display text-[34px] font-bold leading-tight tracking-[-0.01em]">{title}</h1>
            {badge}
          </div>
          {subtitle && <span className="text-sm text-muted">{subtitle}</span>}
        </div>
        {actions && <div className="flex flex-wrap gap-2.5">{actions}</div>}
      </div>
    </header>
  );
}

/** Underlined tabs under a page header (Units / Leases / Meters / Bills). Pass router links. */
export function Tabs({ items }: { items: Array<{ label: string; to: string; active?: boolean }> }) {
  return (
    <nav aria-label="Sections" className="flex flex-wrap gap-5 border-b border-line">
      {items.map((t) => (
        <Link
          key={t.to}
          to={t.to}
          aria-current={t.active ? 'page' : undefined}
          className={
            t.active
              ? '-mb-px border-b-2 border-brand px-1 py-3 text-sm font-semibold text-ink no-underline'
              : 'px-1 py-3 text-sm text-muted no-underline hover:text-ink'
          }
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
