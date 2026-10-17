import type { AuthUser, PermissionName } from '@rentflow/core';
import { useAdminUser } from './admin';

/**
 * May this admin do X? Mirrors the API's checks so the UI can hide what would be refused anyway
 * (the API still enforces it). Super admins have ["*"].
 */
export function can(user: AuthUser | null | undefined, permission: PermissionName): boolean {
  if (!user) return false;
  return user.permissions.includes('*') || user.permissions.includes(permission);
}

/** `const can = useCan(); can('properties.manage')` for the logged-in admin. */
export function useCan(): (permission: PermissionName) => boolean {
  const user = useAdminUser().data;
  return (permission) => can(user, permission);
}
