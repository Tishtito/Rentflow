import { useState } from 'react';
import { useRoleTemplates, useSaveRoleTemplate } from '@rentflow/api';
import type { PermissionName, Role } from '@rentflow/core';
import {
  Badge,
  Button,
  Card,
  DataTable,
  ErrorState,
  EyeIcon,
  LoadingState,
  Notice,
  PageHeader,
  PencilIcon,
  SidePanel,
  actionsColumn,
} from '@rentflow/ui';
import { formMessage } from '../../errors';
import { PermissionChecklist } from '../../panels/PermissionChecklist';

/** The built-in roles every landlord account uses; changing one changes it everywhere. */
export function PlatformRolesPage() {
  const templates = useRoleTemplates();
  const [open, setOpen] = useState<Role | null>(null);

  return (
    <>
      <PageHeader title="Built-in roles" subtitle="Shared by every landlord account. Landlords can also make their own roles." />
      {/* The panel sits beside the table on wide screens and wraps below it on narrow ones. */}
      <div className="flex flex-wrap items-start gap-6">
        <Card padded={false} className="min-w-0 flex-[3_1_560px]">
          {templates.isPending ? (
            <LoadingState />
          ) : templates.isError ? (
            <ErrorState className="m-4" message={templates.error.message} onRetry={() => void templates.refetch()} />
          ) : (
            <DataTable<Role>
              caption="Built-in roles"
              rows={templates.data}
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
                      onClick={() => setOpen(r)}
                    >
                      {r.name}
                    </button>
                  ),
                },
                { key: 'description', header: 'What it’s for', cell: (r) => <span className="text-subtle">{r.description}</span> },
                {
                  key: 'perms',
                  header: 'Permissions',
                  cell: (r) => (r.is_locked ? <Badge tone="gold">All · locked</Badge> : r.permissions.length),
                },
                actionsColumn<Role>((r) => [
                  {
                    label: `${r.is_locked ? 'View' : 'Edit'} ${r.name}`,
                    icon: r.is_locked ? EyeIcon : PencilIcon,
                    onClick: () => setOpen(r),
                  },
                ]),
              ]}
            />
          )}
        </Card>
        {open && <TemplatePanel key={open.id} role={open} onClose={() => setOpen(null)} />}
      </div>
    </>
  );
}

function TemplatePanel({ role, onClose }: { role: Role; onClose: () => void }) {
  const save = useSaveRoleTemplate();
  const [permissions, setPermissions] = useState<PermissionName[]>(role.permissions);
  const message = formMessage(save.error);

  return (
    <SidePanel title={role.name} subtitle={role.description ?? 'Built-in role'} onClose={onClose}>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate({ id: role.id, permissions }, { onSuccess: onClose });
        }}
      >
        {message && <Notice tone="danger">{message}</Notice>}
        <Notice tone={role.is_locked ? 'info' : 'warn'}>
          {role.is_locked
            ? 'The Owner role always has every permission.'
            : 'Changes apply to everyone with this role in every landlord account, straight away.'}
        </Notice>
        <PermissionChecklist value={permissions} onChange={setPermissions} disabled={role.is_locked} />
        {!role.is_locked && (
          <Button type="submit" variant="primary" size="lg" disabled={save.isPending}>
            {save.isPending ? 'Saving…' : 'Save for every account'}
          </Button>
        )}
      </form>
    </SidePanel>
  );
}
