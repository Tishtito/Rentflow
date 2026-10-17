import { useState } from 'react';
import { useCan, useRoles } from '@rentflow/api';
import type { Role } from '@rentflow/core';
import {
  Badge,
  Button,
  Card,
  CopyIcon,
  DataTable,
  ErrorState,
  EyeIcon,
  LoadingState,
  PageHeader,
  PencilIcon,
  actionsColumn,
} from '@rentflow/ui';
import { RolePanel } from '../panels/RolePanel';

/** Built-in roles and this account's own; open one to see or change its permissions. */
export function RolesPage() {
  const can = useCan();
  const roles = useRoles();
  const canManage = can('roles.manage');
  const [panel, setPanel] = useState<{ role?: Role; copyFrom?: Role; key: number } | null>(null);

  return (
    <>
      <PageHeader
        breadcrumb={[{ label: 'Team & roles', to: '/admin/team' }, { label: 'Roles' }]}
        title="Roles"
        subtitle="A role is a set of permissions. People can have several roles."
        actions={
          canManage && (
            <Button variant="primary" onClick={() => setPanel({ key: Date.now() })}>
              + New role
            </Button>
          )
        }
      />
      {/* The panel sits beside the table on wide screens and wraps below it on narrow ones. */}
      <div className="flex flex-wrap items-start gap-6">
        <Card padded={false} className="min-w-0 flex-[3_1_560px]">
          {roles.isPending ? (
            <LoadingState />
          ) : roles.isError ? (
            <ErrorState className="m-4" message={roles.error.message} onRetry={() => void roles.refetch()} />
          ) : (
            <DataTable<Role>
              caption="Roles"
              rows={roles.data}
              rowKey={(r) => r.id}
              empty="No roles."
              columns={[
                {
                  key: 'name',
                  header: 'Role',
                  cell: (r) => (
                    <button
                      type="button"
                      className="min-h-touch border-0 bg-transparent p-0 text-left font-semibold text-brand"
                      onClick={() => setPanel({ role: r, key: r.id })}
                    >
                      {r.name}
                    </button>
                  ),
                },
                {
                  key: 'kind',
                  header: 'Type',
                  cell: (r) =>
                    r.is_locked ? (
                      <Badge tone="gold">Built-in · locked</Badge>
                    ) : r.is_template ? (
                      <Badge>Built-in</Badge>
                    ) : (
                      <Badge tone="info">Yours</Badge>
                    ),
                },
                { key: 'perms', header: 'Permissions', cell: (r) => r.permissions.length },
                { key: 'people', header: 'People', cell: (r) => r.users_count ?? 0 },
                actionsColumn<Role>((r) => [
                  r.is_template || !canManage
                    ? { label: `View ${r.name}`, icon: EyeIcon, onClick: () => setPanel({ role: r, key: r.id }) }
                    : { label: `Edit ${r.name}`, icon: PencilIcon, onClick: () => setPanel({ role: r, key: r.id }) },
                  {
                    label: `Duplicate ${r.name}`,
                    icon: CopyIcon,
                    onClick: () => setPanel({ copyFrom: r, key: Date.now() }),
                    hidden: !canManage || r.is_locked,
                  },
                ]),
              ]}
            />
          )}
        </Card>
        {panel && (
          <RolePanel
            key={panel.key}
            role={panel.role}
            copyFrom={panel.copyFrom}
            canManage={canManage}
            onClose={() => setPanel(null)}
            onDuplicate={(r) => setPanel({ copyFrom: r, key: Date.now() })}
          />
        )}
      </div>
    </>
  );
}
