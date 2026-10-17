import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { usePlatformAccounts } from '@rentflow/api';
import { formatDate, type PlatformAccount } from '@rentflow/core';
import {
  AccountStatusBadge,
  Button,
  Card,
  DataTable,
  ErrorState,
  EyeIcon,
  FilterChips,
  LoadingState,
  LogInIcon,
  PageHeader,
  Pager,
  SearchInput,
  actionsColumn,
} from '@rentflow/ui';
import { AccountCreatePanel } from './AccountPanels';
import { openAccount } from './openAccount';

type StatusFilter = '' | 'active' | 'suspended' | 'closed';

/** Every landlord account: search, status, create, open one to act inside it. */
export function PlatformAccountsPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(1);
  const status = (params.get('status') ?? '') as StatusFilter;
  const creating = params.get('new') === '1';
  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);
  const accounts = usePlatformAccounts({ search: debounced || undefined, status: status || undefined, page });
  const setParam = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    setParams(next, { replace: true });
  };

  return (
    <>
      <PageHeader
        title="Landlord accounts"
        subtitle="Each account's data is separate. Opening an account lets you act inside it; every action is logged."
        actions={
          <Button variant="primary" onClick={() => setParam('new', '1')}>
            + New landlord account
          </Button>
        }
      />
      {/* The panel sits beside the table on wide screens and wraps below it on narrow ones. */}
      <div className="flex flex-wrap items-start gap-6">
        <Card padded={false} className="min-w-0 flex-[3_1_560px]">
          <div className="flex flex-wrap items-end gap-4 px-4 pb-1.5 pt-4">
            <SearchInput
              label="Search accounts"
              placeholder="Account, owner, phone or email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:max-w-[360px]"
            />
            <FilterChips<StatusFilter>
              label="Status"
              value={status}
              onChange={(v) => {
                setParam('status', v);
                setPage(1);
              }}
              options={[
                { value: '', label: 'All' },
                { value: 'active', label: 'Active' },
                { value: 'suspended', label: 'Suspended' },
                { value: 'closed', label: 'Closed' },
              ]}
            />
          </div>
          {accounts.isPending ? (
            <LoadingState />
          ) : accounts.isError ? (
            <ErrorState className="m-4" message={accounts.error.message} onRetry={() => void accounts.refetch()} />
          ) : (
            <>
              <DataTable<PlatformAccount>
                caption="Landlord accounts"
                rows={accounts.data.data}
                rowKey={(a) => a.id}
                empty={debounced || status ? 'No accounts match.' : 'No accounts yet.'}
                columns={[
                  {
                    key: 'name',
                    header: 'Account',
                    cell: (a) => (
                      <Link to={`/platform/accounts/${a.id}`} className="font-semibold">
                        {a.name}
                      </Link>
                    ),
                  },
                  {
                    key: 'owner',
                    header: 'Owner',
                    cell: (a) => (
                      <>
                        {a.owner_name ?? <span className="text-muted">—</span>}
                        {a.owner_phone && <span className="block text-xs text-muted">{a.owner_phone}</span>}
                      </>
                    ),
                  },
                  { key: 'props', header: 'Properties', align: 'right', numeric: true, cell: (a) => a.properties_count },
                  { key: 'units', header: 'Units', align: 'right', numeric: true, cell: (a) => a.units_count },
                  {
                    key: 'run',
                    header: 'Last billing run',
                    cell: (a) =>
                      a.last_billing_run ? (
                        <>
                          {formatDate(a.last_billing_run.run_date)} · {a.last_billing_run.invoices_created} bill
                          {a.last_billing_run.invoices_created === 1 ? '' : 's'}
                          {a.last_billing_run.leases_skipped > 0 && (
                            <span className="text-warn-strong"> · {a.last_billing_run.leases_skipped} skipped</span>
                          )}
                        </>
                      ) : (
                        <span className="text-muted">Not billed yet</span>
                      ),
                  },
                  { key: 'status', header: 'Status', cell: (a) => <AccountStatusBadge status={a.status} /> },
                  actionsColumn<PlatformAccount>((a) => [
                    { label: `View ${a.name}`, icon: EyeIcon, to: `/platform/accounts/${a.id}` },
                    {
                      label: `Open ${a.name} (act inside it)`,
                      icon: LogInIcon,
                      onClick: () => openAccount(a, navigate),
                      disabled: a.status !== 'active',
                    },
                  ]),
                ]}
              />
              <Pager meta={accounts.data.meta} page={page} onPage={setPage} busy={accounts.isFetching} />
            </>
          )}
        </Card>
        {creating && <AccountCreatePanel onClose={() => setParam('new', '')} />}
      </div>
    </>
  );
}
