import type { ComponentType, ReactNode, SVGProps } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@rentflow/core';
import type { Column } from './DataTable';

export interface RowAction {
  /** Spoken name and tooltip, e.g. "View Kims Apartments". */
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  /** Navigate here (same place the row's name links to), or… */
  to?: string;
  /** …run this. */
  onClick?: () => void;
  tone?: 'default' | 'danger';
  /** Not shown (e.g. no permission, or not relevant to this row). */
  hidden?: boolean;
  disabled?: boolean;
  /** Replaces the icon with short text, e.g. "Click again" for a two-step confirm. */
  pending?: ReactNode;
}

/** The actions that will actually show. */
export const visibleActions = (actions: RowAction[]) => actions.filter((a) => !a.hidden);

const base =
  'inline-flex min-h-touch min-w-[44px] items-center justify-center rounded-md border-0 bg-transparent px-2 text-muted no-underline transition-colors hover:bg-canvas focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand disabled:pointer-events-none disabled:opacity-40';

/** Icon buttons at the end of a table row: view, edit and the row's other actions. */
export function RowActions({ actions }: { actions: RowAction[] }) {
  const shown = visibleActions(actions);
  if (shown.length === 0) return null;

  return (
    <span className="flex items-center justify-end gap-0.5">
      {shown.map((a) => {
        const Icon = a.icon;
        const cls = cn(base, a.tone === 'danger' ? 'hover:text-danger-strong' : 'hover:text-brand', a.pending ? 'text-xs font-semibold text-danger-strong' : undefined);
        const content = a.pending ?? <Icon />;

        return a.to && !a.disabled ? (
          <Link key={a.label} to={a.to} aria-label={a.label} title={a.label} className={cls}>
            {content}
          </Link>
        ) : (
          <button key={a.label} type="button" aria-label={a.label} title={a.label} className={cls} disabled={a.disabled} onClick={a.onClick}>
            {content}
          </button>
        );
      })}
    </span>
  );
}

/** A DataTable column holding a row's actions (header hidden, right-aligned). */
export function actionsColumn<T>(actions: (row: T) => RowAction[]): Column<T> {
  return { key: 'actions', header: 'Actions', hideHeader: true, align: 'right', cell: (row) => <RowActions actions={actions(row)} /> };
}
