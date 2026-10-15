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
}

/**
 * Typed table with the canvas styling. Scrolls horizontally inside its box on
 * narrow screens instead of breaking the page.
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
  return (
    <div className="overflow-x-auto">
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
  );
}
