import type { ReactNode } from 'react';
import { cn } from '@rentflow/core';

export interface Column<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  align?: 'left' | 'right';
  /** Visually hide the header text (e.g. an actions column) but keep it for screen readers. */
  hideHeader?: boolean;
  numeric?: boolean;
  /** On phones, this column is the card's title (default: the first column). */
  cardTitle?: boolean;
  /** Leave this column out of the phone card. */
  hideOnCard?: boolean;
  /** Label on the phone card (default: the header when it's text). */
  cardLabel?: ReactNode;
}

/** The phone card's pieces: title column, actions column (key `actions`) and the label/value columns. */
export function cardLayout<T>(columns: Column<T>[]) {
  const actions = columns.find((c) => c.key === 'actions');
  const rest = columns.filter((c) => c !== actions && !c.hideOnCard);
  const title = rest.find((c) => c.cardTitle) ?? rest[0];
  const fields = rest.filter((c) => c !== title);
  return { title, actions, fields };
}

const labelOf = <T,>(c: Column<T>): ReactNode => c.cardLabel ?? (typeof c.header === 'string' && !c.hideHeader ? c.header : null);

/**
 * Typed table with the canvas styling. From `md` up it's a table; on phones each row becomes a card
 * (title column + actions on top, the other columns as label / value pairs), so nothing scrolls sideways.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  rowClassName,
  caption,
  empty = 'Nothing to show yet.',
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  rowClassName?: (row: T) => string | undefined;
  caption?: string; // screen-reader caption
  empty?: ReactNode;
}) {
  const { title, actions, fields } = cardLayout(columns);

  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead>
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  className={cn(
                    'border-b border-line px-4 py-2.5 align-bottom text-xs font-medium uppercase tracking-[.04em] text-muted',
                    c.align === 'right' ? 'text-right' : 'text-left',
                  )}
                >
                  {c.hideHeader ? <span className="sr-only">{c.header}</span> : c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-sm text-muted">
                  {empty}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={rowKey(row)} className={rowClassName?.(row)}>
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      className={cn(
                        'whitespace-nowrap border-b border-line-soft px-4 py-[13px] text-sm',
                        c.align === 'right' && 'text-right',
                        c.numeric && 'num',
                      )}
                    >
                      {c.cell(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Phones: one card per row. */}
      <div className="md:hidden">
        {rows.length === 0 ? (
          <p className="m-0 px-4 py-8 text-center text-sm text-muted">{empty}</p>
        ) : (
          <ul aria-label={caption} className="m-0 flex list-none flex-col gap-3 p-3">
            {rows.map((row) => (
              <li key={rowKey(row)} className={cn('rounded-lg border border-line bg-surface p-4', rowClassName?.(row))}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1 break-words text-[15px] font-semibold">{title?.cell(row)}</div>
                  {actions && <div className="-mr-2 -mt-2 shrink-0">{actions.cell(row)}</div>}
                </div>
                {fields.length > 0 && (
                  <dl className="m-0 mt-3 grid grid-cols-1 gap-x-4 gap-y-2.5 min-[360px]:grid-cols-2">
                    {fields.map((c) => {
                      const label = labelOf(c);
                      return (
                        <div key={c.key} className="min-w-0">
                          {label && <dt className="text-[11px] font-medium uppercase tracking-[.04em] text-muted">{label}</dt>}
                          <dd className={cn('m-0 break-words text-sm', c.numeric && 'num')}>{c.cell(row)}</dd>
                        </div>
                      );
                    })}
                  </dl>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
