import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCan, useTenants } from '@rentflow/api';
import { cn, formatAmount, toCents, type AdminTenant } from '@rentflow/core';
import { Badge, Button, Card, DataTable, ErrorState, EyeIcon, LoadingState, PageHeader, PencilIcon, SearchInput, actionsColumn } from '@rentflow/ui';

/** Tenants with their home and balance. New tenants come in through "Move in" on a vacant unit. */
export function TenantsPage() {
  const canEdit = useCan()('tenants.manage');
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
  const tenants = useTenants({ search: debounced || undefined, page });
  const meta = tenants.data?.meta;

  return (
    <>
      <PageHeader title="Tenants" subtitle="To add a tenant, open a vacant unit in Properties and choose Move in." />
      <Card padded={false}>
        <div className="px-4 pb-1.5 pt-4">
          <SearchInput
            label="Search tenants"
            placeholder="Name, phone, ID or unit"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:max-w-[420px]"
          />
        </div>
        {tenants.isPending ? (
          <LoadingState />
        ) : tenants.isError ? (
          <ErrorState className="m-4" message={tenants.error.message} onRetry={() => void tenants.refetch()} />
        ) : (
          <>
            <DataTable<AdminTenant>
              caption="Tenants"
              rows={tenants.data.data}
              rowKey={(t) => t.id}
              empty={debounced ? 'No tenants match.' : 'No tenants yet.'}
              columns={[
                {
                  key: 'name',
                  header: 'Tenant',
                  cell: (t) => (
                    <Link to={`/admin/tenants/${t.id}`} className="font-semibold">
                      {t.full_name}
                    </Link>
                  ),
                },
                {
                  key: 'home',
                  header: 'Home',
                  cell: (t) =>
                    t.current_lease ? (
                      <>
                        {t.current_lease.unit_number} <span className="text-muted">· {t.current_lease.property_name}</span>
                      </>
                    ) : (
                      <span className="text-muted">Moved out</span>
                    ),
                },
                { key: 'phone', header: 'Phone', cell: (t) => <span className="num">{t.phone}</span> },
                {
                  key: 'balance',
                  header: 'Balance (KES)',
                  align: 'right',
                  numeric: true,
                  cell: (t) => {
                    const b = t.current_lease?.balance;
                    if (b == null) return <span className="text-muted">—</span>;
                    const c = toCents(b);
                    return <span className={cn(c > 0 && 'font-semibold text-warn-strong', c < 0 && 'text-brand')}>{c < 0 ? `−${formatAmount(-c / 100)} credit` : formatAmount(b)}</span>;
                  },
                },
                {
                  key: 'portal',
                  header: 'Portal',
                  cell: (t) => (t.status === 'active' ? <Badge tone="success">Active</Badge> : t.status === 'invited' ? <Badge tone="info">Invited</Badge> : <Badge>Inactive</Badge>),
                },
                actionsColumn<AdminTenant>((t) => [
                  { label: `View ${t.full_name}`, icon: EyeIcon, to: `/admin/tenants/${t.id}` },
                  { label: `Edit ${t.full_name}`, icon: PencilIcon, to: `/admin/tenants/${t.id}?edit=1`, hidden: !canEdit },
                ]),
              ]}
            />
            {meta && meta.last_page > 1 && (
              <div className="flex items-center justify-between px-4 py-3.5 text-[13px] text-muted">
                <span className="num">
                  {meta.from}–{meta.to} of {meta.total}
                </span>
                <span className="flex gap-2">
                  <Button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                    Previous
                  </Button>
                  <Button disabled={page >= meta.last_page} onClick={() => setPage((p) => p + 1)}>
                    Next
                  </Button>
                </span>
              </div>
            )}
          </>
        )}
      </Card>
    </>
  );
}
