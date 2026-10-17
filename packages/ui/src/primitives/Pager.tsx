import { Button } from './Button';

/** "21–40 of 132 · Previous · Next" under a paginated table. Hidden when everything fits on one page. */
export function Pager({
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
    <div className="flex items-center justify-between px-4 py-3.5 text-[13px] text-muted">
      <span className="num">
        {from}–{to} of {meta.total}
      </span>
      <span className="flex gap-2">
        <Button disabled={page <= 1 || busy} onClick={() => onPage(page - 1)}>
          Previous
        </Button>
        <Button disabled={page >= meta.last_page || busy} onClick={() => onPage(page + 1)}>
          Next
        </Button>
      </span>
    </div>
  );
}
