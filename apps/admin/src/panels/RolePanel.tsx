import { useState } from 'react';
import { useDeleteRole, useSaveRole } from '@rentflow/api';
import type { PermissionName, Role } from '@rentflow/core';
import { Button, Notice, SidePanel, TextField } from '@rentflow/ui';
import { fieldErrors, formMessage } from '../errors';
import { PermissionChecklist } from './PermissionChecklist';

/**
 * Create a role, edit one of the account's own roles, or view a built-in one (read only, with
 * "Duplicate" to start an own role from it).
 */
export function RolePanel({
  role,
  copyFrom,
  canManage,
  onClose,
  onDuplicate,
}: {
  role?: Role;
  /** New role pre-filled from this one (Duplicate). */
  copyFrom?: Role;
  canManage: boolean;
  onClose: () => void;
  onDuplicate?: (role: Role) => void;
}) {
  const save = useSaveRole();
  const remove = useDeleteRole();
  const readOnly = !canManage || role?.is_template === true;
  const [name, setName] = useState(role?.name ?? (copyFrom ? `${copyFrom.name} (copy)` : ''));
  const [permissions, setPermissions] = useState<PermissionName[]>(role?.permissions ?? copyFrom?.permissions ?? []);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const editing = role && !role.is_template;
  const errors = fieldErrors(save.error);
  const message = formMessage(save.error ?? remove.error, ['name']);

  return (
    <SidePanel
      title={readOnly && role ? role.name : editing ? 'Edit role' : 'New role'}
      subtitle={role?.is_template ? (role.description ?? 'Built-in role') : 'Choose what people with this role can do'}
      onClose={onClose}
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (readOnly) return;
          save.mutate({ id: editing ? role.id : undefined, name, permissions }, { onSuccess: onClose });
        }}
      >
        {message && <Notice tone="danger">{message}</Notice>}
        {role?.is_template && (
          <Notice tone="info">
            {role.is_locked ? 'The Owner role always has every permission.' : 'Built-in roles are the same for every landlord. Duplicate it to make your own version.'}
          </Notice>
        )}
        {!readOnly && <TextField label="Role name" required value={name} onChange={(e) => setName(e.target.value)} error={errors.name} />}
        <PermissionChecklist value={permissions} onChange={setPermissions} disabled={readOnly} />

        {!readOnly && (
          <Button type="submit" variant="primary" size="lg" disabled={save.isPending}>
            {save.isPending ? 'Saving…' : editing ? 'Save role' : 'Create role'}
          </Button>
        )}
        {role?.is_template && !role.is_locked && canManage && onDuplicate && (
          <Button type="button" variant="primary" size="lg" onClick={() => onDuplicate(role)}>
            Duplicate as my own role
          </Button>
        )}
        {editing && canManage && (
          <Button
            type="button"
            variant="danger-outline"
            disabled={remove.isPending || (role.users_count ?? 0) > 0}
            onClick={() => (confirmDelete ? remove.mutate(role.id, { onSuccess: onClose }) : setConfirmDelete(true))}
          >
            {(role.users_count ?? 0) > 0 ? `Used by ${role.users_count} — can't delete` : confirmDelete ? 'Click again to delete' : 'Delete role'}
          </Button>
        )}
      </form>
    </SidePanel>
  );
}
