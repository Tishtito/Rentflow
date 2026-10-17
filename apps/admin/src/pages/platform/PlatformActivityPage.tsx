import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuditActions, useAuditLog } from '@rentflow/api';
import { Card, ErrorState, LoadingState, PageHeader, Pager, SearchInput, SelectField, TextField } from '@rentflow/ui';
import { ActivityTable } from './ActivityTable';

/** Every accepted change and login, across all accounts. */
export function PlatformActivityPage() {
  const [params] = useSearchParams();
  const accountId = params.get('account') ? Number(params.get('account')) : undefined;
  const [action, setAction] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(1);
  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);
  const actions = useAuditActions();
  const log = useAuditLog({
    account_id: accountId,
    action: action || undefined,
    from: from || undefined,
    to: to || undefined,
    q: debounced || undefined,
    page,
  });

  return (
    <>
      <PageHeader title="Activity log" subtitle="Every change and login, by everyone. Passwords, tokens and secrets are never stored." />
      <Card padded={false}>
        <div className="grid gap-3 px-4 pb-2 pt-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto]">
          <SearchInput label="Search" placeholder="Name or what happened" value={search} onChange={(e) => setSearch(e.target.value)} />
          <SelectField
            label="Action"
            value={action}
            onChange={(e) => {
              setAction(e.target.value);
              setPage(1);
            }}
            options={[{ value: '', label: 'Everything' }, ...(actions.data ?? []).map((a) => ({ value: a.action, label: a.label }))]}
          />
          <TextField label="From" type="date" value={from} onChange={(e) => (setFrom(e.target.value), setPage(1))} />
          <TextField label="To" type="date" value={to} onChange={(e) => (setTo(e.target.value), setPage(1))} />
        </div>
        {accountId && (
          <p className="m-0 px-4 pb-2 text-xs text-muted">
            One account only · <Link to="/platform/activity">show all accounts</Link>
          </p>
        )}
        {log.isPending ? (
          <LoadingState />
        ) : log.isError ? (
          <ErrorState className="m-4" message={log.error.message} onRetry={() => void log.refetch()} />
        ) : (
          <>
            <ActivityTable entries={log.data.data} />
            <Pager meta={log.data.meta} page={page} onPage={setPage} busy={log.isFetching} />
          </>
        )}
      </Card>
    </>
  );
}
