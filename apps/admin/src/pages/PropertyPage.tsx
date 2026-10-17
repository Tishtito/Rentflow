import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAccount, useCan, useChargeRates, useMoveIn, useProperty, useUnits } from '@rentflow/api';
import { cn, formatAmount, formatDate, toCents, type Unit } from '@rentflow/core';
import {
  Badge,
  Button,
  ButtonLink,
  DataTable,
  DoorInIcon,
  ErrorState,
  EyeIcon,
  FilterChips,
  LoadingState,
  MoveInPanel,
  Notice,
  PageHeader,
  PencilIcon,
  SearchInput,
  UnitStatusBadge,
  actionsColumn,
} from '@rentflow/ui';
import { chargeInfo } from '../charges';
import { fieldErrors, formMessage } from '../errors';
import { PropertyPanel } from '../panels/PropertyPanel';
import { UnitPanel } from '../panels/UnitPanel';

type Filter = 'all' | 'occupied' | 'vacant' | 'arrears';
type Panel = { kind: 'move-in' | 'unit'; unitId: number } | { kind: 'add-unit' } | { kind: 'property' } | null;

/** One property: its units with tenant, rent, next bill and balance; move-in, add/edit units and meters. */
export function PropertyPage() {
  const id = Number(useParams().propertyId);
  const property = useProperty(id);
  const units = useUnits(id);
  const rates = useChargeRates(id);
  const account = useAccount();
  const can = useCan();
  const canEdit = can('properties.manage');
  const canMoveIn = can('leases.manage');
  const moveIn = useMoveIn();
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [panel, setPanel] = useState<Panel>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const list = units.data ?? [];
  const owes = (u: Unit) => toCents(u.current_lease?.balance) > 0;
  const counts = {
    all: list.length,
    occupied: list.filter((u) => u.status === 'occupied').length,
    vacant: list.filter((u) => u.status === 'vacant').length,
    arrears: list.filter(owes).length,
  };
  const q = search.trim().toLowerCase();
  const rows = list
    .filter((u) => (filter === 'all' ? true : filter === 'arrears' ? owes(u) : u.status === filter))
    .filter((u) => !q || u.unit_number.toLowerCase().includes(q) || u.current_lease?.tenant_name.toLowerCase().includes(q));

  if (property.isPending) return <LoadingState />;
  if (property.isError) return <ErrorState message={property.error.message} onRetry={() => void property.refetch()} />;
  const p = property.data;
  const panelUnit = panel && 'unitId' in panel ? list.find((u) => u.id === panel.unitId) : undefined;

  return (
    <>
      <PageHeader
        breadcrumb={[{ label: 'Properties', to: '/admin/properties' }, { label: p.name }]}
        title={p.name}
        badge={p.status === 'inactive' ? <Badge>Inactive</Badge> : undefined}
        subtitle={
          <>
            {[[p.town, p.county].filter(Boolean).join(', '), p.address, p.caretaker && `Looked after by ${p.caretaker.name}`, `${p.units_count ?? list.length} units`].filter(Boolean).join(' · ')}
            {p.notes && <span className="mt-1 block whitespace-pre-line text-[13px] text-subtle">{p.notes}</span>}
          </>
        }
        actions={
          canEdit && (
            <>
              <ButtonLink to="/admin/settings/billing">Billing settings</ButtonLink>
              <ButtonLink to={`/admin/properties/${id}/meters`}>Set up meters</ButtonLink>
              <Button onClick={() => setPanel({ kind: 'property' })}>Edit property</Button>
              <Button variant="primary" onClick={() => setPanel({ kind: 'add-unit' })}>
                + Add unit
              </Button>
            </>
          )
        }
      />

      {notice && <Notice tone="success">{notice}</Notice>}

      <div className="flex flex-wrap items-start gap-6">
        <section aria-label="Units" className="flex min-w-0 flex-[3_1_560px] flex-col gap-3.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <SearchInput
              label="Search units or tenants"
              placeholder="Search unit or tenant"
              className="flex-[1_1_240px]"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <FilterChips
              label="Filter by status"
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'all', label: 'All', count: counts.all },
                { value: 'occupied', label: 'Occupied', count: counts.occupied },
                { value: 'vacant', label: 'Vacant', count: counts.vacant },
                { value: 'arrears', label: 'In arrears', count: counts.arrears },
              ]}
            />
          </div>
          <div className="rounded-lg border border-line bg-surface">
            {units.isPending ? (
              <LoadingState />
            ) : units.isError ? (
              <ErrorState className="m-4" message={units.error.message} onRetry={() => void units.refetch()} />
            ) : (
              <DataTable<Unit>
                caption={`Units in ${p.name}`}
                rows={rows}
                rowKey={(u) => u.id}
                rowClassName={(u) => (panel && 'unitId' in panel && panel.unitId === u.id ? 'bg-brand-soft/40' : undefined)}
                empty={list.length === 0 ? (canEdit ? 'No units yet. Add the first one.' : 'No units yet.') : 'No units match.'}
                columns={[
                  {
                    key: 'unit',
                    header: 'Unit',
                    cell: (u) =>
                      canEdit ? (
                        <button type="button" className="min-h-touch border-0 bg-transparent p-0 font-semibold text-brand" onClick={() => setPanel({ kind: 'unit', unitId: u.id })}>
                          {u.unit_number}
                        </button>
                      ) : (
                        <strong className="font-semibold">{u.unit_number}</strong>
                      ),
                  },
                  { key: 'type', header: 'Type', cell: (u) => u.type ?? <span className="text-muted">—</span> },
                  {
                    key: 'tenant',
                    header: 'Tenant',
                    cell: (u) =>
                      u.current_lease ? (
                        <Link to={`/admin/tenants/${u.current_lease.tenant_id}`}>{u.current_lease.tenant_name}</Link>
                      ) : (
                        <span className="text-muted">—</span>
                      ),
                  },
                  {
                    key: 'rent',
                    header: 'Rent (KES)',
                    align: 'right',
                    numeric: true,
                    cell: (u) => formatAmount(u.current_lease?.monthly_rent ?? u.default_rent),
                  },
                  {
                    key: 'next',
                    header: 'Next bill',
                    cell: (u) => (u.current_lease ? formatDate(u.current_lease.next_billing_date) : <span className="text-muted">—</span>),
                  },
                  {
                    key: 'balance',
                    header: 'Balance',
                    align: 'right',
                    numeric: true,
                    cell: (u) => {
                      const b = u.current_lease?.balance;
                      if (b == null) return <span className="text-muted">—</span>;
                      const c = toCents(b);
                      return (
                        <span className={cn(c > 0 && 'font-semibold text-warn-strong', c < 0 && 'text-brand')}>
                          {c < 0 ? `−${formatAmount(-c / 100)} credit` : formatAmount(b)}
                        </span>
                      );
                    },
                  },
                  { key: 'status', header: 'Status', cell: (u) => <UnitStatusBadge status={u.status} /> },
                  actionsColumn<Unit>((u) => [
                    { label: `Edit unit ${u.unit_number}`, icon: PencilIcon, onClick: () => setPanel({ kind: 'unit', unitId: u.id }), hidden: !canEdit },
                    {
                      label: `Move a tenant into ${u.unit_number}`,
                      icon: DoorInIcon,
                      onClick: () => setPanel({ kind: 'move-in', unitId: u.id }),
                      hidden: !canMoveIn || !(u.status === 'vacant' || u.status === 'reserved'),
                    },
                    { label: `View ${u.current_lease?.tenant_name ?? 'tenant'}`, icon: EyeIcon, to: `/admin/tenants/${u.current_lease?.tenant_id}`, hidden: !u.current_lease },
                  ]),
                ]}
              />
            )}
          </div>
          <span className="text-[13px] text-muted">
            Showing {rows.length} of {list.length} units
          </span>
        </section>

        {panel?.kind === 'property' && <PropertyPanel property={p} onClose={() => setPanel(null)} />}
        {panel?.kind === 'add-unit' && <UnitPanel propertyId={id} onClose={() => setPanel(null)} />}
        {panel?.kind === 'unit' && panelUnit && <UnitPanel key={panelUnit.id} propertyId={id} unit={panelUnit} onClose={() => setPanel(null)} />}
        {panel?.kind === 'move-in' && panelUnit && (
          <MoveInPanel
            key={panelUnit.id}
            unit={panelUnit}
            billingDay={account.data?.billing_day ?? 5}
            meters={(panelUnit.meters ?? []).map((m) => {
              const info = chargeInfo(rates.data, m.charge_code);
              return { id: m.id, label: info.label, unit_of_measure: info.unit || 'units' };
            })}
            submitting={moveIn.isPending}
            errors={fieldErrors(moveIn.error)}
            message={(() => {
              const m = formMessage(moveIn.error, ['tenant', 'lease', 'opening_readings']);
              return m ? <Notice tone="danger">{m}</Notice> : null;
            })()}
            onClose={() => {
              moveIn.reset();
              setPanel(null);
            }}
            onSubmit={(input) =>
              moveIn.mutate(
                {
                  unitId: input.unit_id,
                  tenant: { ...input.tenant, email: input.tenant.email.trim() || null, national_id: input.tenant.national_id.trim() || null },
                  lease: {
                    ...input.lease,
                    // Only existing tenants have a chosen first bill date.
                    first_bill_date: input.lease.existing ? input.lease.first_bill_date : undefined,
                  },
                  opening_readings: input.opening_readings,
                },
                {
                  onSuccess: () => {
                    setNotice(
                      input.tenant.email.trim()
                        ? `${input.tenant.first_name} ${input.lease.existing ? 'added to' : 'moved into'} ${panelUnit.unit_number}. Portal invitation emailed to ${input.tenant.email.trim()}.`
                        : `${input.tenant.first_name} ${input.lease.existing ? 'added to' : 'moved into'} ${panelUnit.unit_number}.`,
                    );
                    setPanel(null);
                  },
                },
              )
            }
          />
        )}
      </div>
    </>
  );
}
