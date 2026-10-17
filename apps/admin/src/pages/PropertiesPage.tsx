import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCan, useProperties } from '@rentflow/api';
import { formatAmount, toCents, type Property } from '@rentflow/core';
import {
  Badge,
  Button,
  Card,
  DataTable,
  ErrorState,
  EyeIcon,
  GaugeIcon,
  LoadingState,
  PageHeader,
  PencilIcon,
  actionsColumn,
} from '@rentflow/ui';
import { PropertyPanel } from '../panels/PropertyPanel';

/** All properties (caretakers: theirs) with occupancy and arrears; landlords add new ones. */
export function PropertiesPage() {
  const properties = useProperties();
  const canEdit = useCan()('properties.manage');
  // Add (no property) or edit one.
  const [panel, setPanel] = useState<{ property?: Property } | null>(null);

  return (
    <>
      <PageHeader
        title="Properties & units"
        subtitle="Your buildings, their units and who lives there."
        actions={
          canEdit && (
            <Button variant="primary" onClick={() => setPanel({})}>
              + Add property
            </Button>
          )
        }
      />
      <div className="flex flex-wrap items-start gap-6">
        <Card padded={false} className="min-w-0 flex-[3_1_560px]">
          {properties.isPending ? (
            <LoadingState />
          ) : properties.isError ? (
            <ErrorState className="m-4" message={properties.error.message} onRetry={() => void properties.refetch()} />
          ) : (
            <DataTable<Property>
              caption="Properties"
              rows={properties.data}
              rowKey={(p) => p.id}
              empty={canEdit ? 'No properties yet. Add your first one.' : 'No properties assigned to you yet.'}
              columns={[
                {
                  key: 'name',
                  header: 'Property',
                  cell: (p) => (
                    <span className="flex flex-wrap items-center gap-2">
                      <Link to={`/admin/properties/${p.id}`} className="font-semibold">
                        {p.name}
                      </Link>
                      {p.status === 'inactive' && <Badge>Inactive</Badge>}
                    </span>
                  ),
                },
                {
                  key: 'town',
                  header: 'Town',
                  cell: (p) => [p.town, p.county].filter(Boolean).join(', ') || <span className="text-muted">—</span>,
                },
                { key: 'caretaker', header: 'Looked after by', cell: (p) => p.caretaker?.name ?? <span className="text-muted">—</span> },
                { key: 'units', header: 'Units', align: 'right', numeric: true, cell: (p) => p.units_count ?? 0 },
                {
                  key: 'occupancy',
                  header: 'Occupied / vacant',
                  cell: (p) => (
                    <span className="num">
                      {p.occupied_count ?? 0} /{' '}
                      <span className={p.vacant_count ? 'font-semibold text-warn-strong' : undefined}>{p.vacant_count ?? 0}</span>
                    </span>
                  ),
                },
                {
                  key: 'arrears',
                  header: 'Arrears (KES)',
                  align: 'right',
                  numeric: true,
                  cell: (p) =>
                    toCents(p.arrears_total) > 0 ? (
                      <span className="font-semibold text-warn-strong">{formatAmount(p.arrears_total ?? '0')}</span>
                    ) : (
                      <span className="text-muted">—</span>
                    ),
                },
                actionsColumn<Property>((p) => [
                  { label: `View ${p.name}`, icon: EyeIcon, to: `/admin/properties/${p.id}` },
                  { label: `Edit ${p.name}`, icon: PencilIcon, onClick: () => setPanel({ property: p }), hidden: !canEdit },
                  { label: `Meters of ${p.name}`, icon: GaugeIcon, to: `/admin/properties/${p.id}/meters`, hidden: !canEdit },
                ]),
              ]}
            />
          )}
        </Card>
        {panel && <PropertyPanel key={panel.property?.id ?? 'new'} property={panel.property} onClose={() => setPanel(null)} />}
      </div>
    </>
  );
}
