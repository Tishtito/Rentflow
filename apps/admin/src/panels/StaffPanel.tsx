import { useState } from 'react';
import { useProperties, useRemoveStaff, useResendStaffInvite, useRoles, useSaveStaff, useStaffStatus } from '@rentflow/api';
import type { TeamMember } from '@rentflow/core';
import { Button, CheckboxField, Eyebrow, Notice, SidePanel, TextField } from '@rentflow/ui';
import { fieldErrors, formMessage } from '../errors';

const fields = ['name', 'email', 'phone', 'role_ids', 'property_ids'];

/** Invite a team member, or change one (`member` given): roles, properties they look after, suspend, remove. */
export function StaffPanel({ member, onClose }: { member?: TeamMember; onClose: () => void }) {
  const roles = useRoles();
  const properties = useProperties();
  const save = useSaveStaff();
  const status = useStaffStatus();
  const remove = useRemoveStaff();
  const reinvite = useResendStaffInvite();
  const [form, setForm] = useState({ name: member?.name ?? '', email: member?.email ?? '', phone: member?.phone ?? '' });
  const [roleIds, setRoleIds] = useState<number[]>(member?.roles.map((r) => r.id) ?? []);
  const [propertyIds, setPropertyIds] = useState<number[]>(member?.properties.map((p) => p.id) ?? []);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const error = save.error ?? status.error ?? remove.error ?? reinvite.error;
  const errors = fieldErrors(save.error);
  const message = formMessage(error, fields);
  const toggle = (list: number[], set: (n: number[]) => void, id: number, on: boolean) => set(on ? [...list, id] : list.filter((x) => x !== id));
  const self = member?.is_me === true;

  return (
    <SidePanel title={member ? member.name : 'Invite a team member'} subtitle={member ? member.email : "They'll get an email to set a password"} onClose={onClose}>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate(
            { id: member?.id, name: form.name, email: member ? undefined : form.email, phone: form.phone || null, role_ids: roleIds, property_ids: propertyIds },
            { onSuccess: onClose },
          );
        }}
      >
        {message && <Notice tone="danger">{message}</Notice>}
        {reinvite.isSuccess && <Notice tone="success">Invitation sent again.</Notice>}
        <TextField label="Full name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} />
        {!member && <TextField label="Email" type="email" required hint="This is their login" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} error={errors.email} />}
        <TextField label="Phone" type="tel" placeholder="07XX XXX XXX" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} error={errors.phone} />

        <fieldset className="m-0 border-none p-0">
          <legend className="pb-1">
            <Eyebrow>Roles</Eyebrow>
          </legend>
          {self && <p className="m-0 pb-1 text-xs text-muted">You can&apos;t change your own roles.</p>}
          {(roles.data ?? []).map((r) => (
            <CheckboxField
              key={r.id}
              label={r.name}
              hint={r.description ?? `${r.permissions.length} permissions`}
              checked={roleIds.includes(r.id)}
              disabled={self}
              onChange={(on) => toggle(roleIds, setRoleIds, r.id, on)}
            />
          ))}
          {errors.role_ids && <p className="m-0 text-xs text-danger-strong">{errors.role_ids}</p>}
        </fieldset>

        <fieldset className="m-0 border-none p-0">
          <legend className="pb-1">
            <Eyebrow>Looks after</Eyebrow>
          </legend>
          <p className="m-0 pb-1 text-xs text-muted">Without &quot;see all properties&quot;, people only see the properties they look after. Each property has one person.</p>
          {(properties.data ?? []).map((p) => (
            <CheckboxField
              key={p.id}
              label={p.name}
              hint={p.caretaker && p.caretaker.id !== member?.id ? `Now: ${p.caretaker.name}` : undefined}
              checked={propertyIds.includes(p.id)}
              onChange={(on) => toggle(propertyIds, setPropertyIds, p.id, on)}
            />
          ))}
        </fieldset>

        <Button type="submit" variant="primary" size="lg" disabled={save.isPending}>
          {save.isPending ? 'Saving…' : member ? 'Save changes' : 'Send invitation'}
        </Button>

        {member && !self && (
          <div className="flex flex-col gap-2 border-t border-line-soft pt-4">
            {member.status === 'invited' && (
              <Button type="button" onClick={() => reinvite.mutate(member.id)} disabled={reinvite.isPending}>
                {reinvite.isPending ? 'Sending…' : 'Resend invitation'}
              </Button>
            )}
            {member.status !== 'invited' && (
              <Button
                type="button"
                disabled={status.isPending}
                onClick={() => status.mutate({ id: member.id, status: member.status === 'suspended' ? 'active' : 'suspended' }, { onSuccess: onClose })}
              >
                {member.status === 'suspended' ? 'Reactivate login' : 'Suspend login'}
              </Button>
            )}
            <Button type="button" variant="danger-outline" disabled={remove.isPending} onClick={() => (confirmRemove ? remove.mutate(member.id, { onSuccess: onClose }) : setConfirmRemove(true))}>
              {confirmRemove ? 'Click again to remove' : 'Remove from team'}
            </Button>
          </div>
        )}
      </form>
    </SidePanel>
  );
}
