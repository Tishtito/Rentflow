import { can } from '@rentflow/api';
import type { AuthUser, PermissionName } from '@rentflow/core';
import { landlordNav } from '@rentflow/ui';
import { actingAccount } from './acting';

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');

/** "Owner", "Caretaker, Accountant", "Super admin". */
export const roleLabel = (user: AuthUser) => (user.role === 'super_admin' ? 'Super admin' : user.roles.join(', ') || 'No role');

/** The admin sections this user's roles allow, in nav order. */
export const allowedNav = (user: AuthUser) => landlordNav.filter((n) => !n.permissions || n.permissions.some((p) => can(user, p as PermissionName)));

/** Where a user lands after logging in: the dashboard, or the first section they may open. */
export function homeFor(user: AuthUser): string {
  if (user.role === 'super_admin' && !actingAccount()) return '/platform';
  return allowedNav(user)[0]?.to ?? '/admin';
}
