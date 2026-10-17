import { usePermissionCatalog } from '@rentflow/api';
import type { PermissionName } from '@rentflow/core';
import { CheckboxField, Eyebrow, LoadingState } from '@rentflow/ui';

/** Every permission, grouped as the API's catalogue groups them, as checkboxes. */
export function PermissionChecklist({
  value,
  onChange,
  disabled,
}: {
  value: PermissionName[];
  onChange?: (next: PermissionName[]) => void;
  disabled?: boolean;
}) {
  const catalog = usePermissionCatalog();
  if (catalog.isPending) return <LoadingState />;

  const toggle = (name: PermissionName, on: boolean) => onChange?.(on ? [...value, name] : value.filter((p) => p !== name));

  return (
    <div className="flex flex-col gap-4">
      {(catalog.data ?? []).map((g) => (
        <fieldset key={g.group} className="m-0 border-none p-0">
          <legend className="pb-1">
            <Eyebrow>{g.group}</Eyebrow>
          </legend>
          {g.permissions.map((p) => (
            <CheckboxField key={p.name} label={p.label} hint={p.name} checked={value.includes(p.name)} disabled={disabled} onChange={(on) => toggle(p.name, on)} />
          ))}
        </fieldset>
      ))}
    </div>
  );
}
